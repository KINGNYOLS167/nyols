import { useCallback, useMemo, useState } from 'react';
import { Link } from '../../lib/router';
import { api, CATEGORY_LABEL, get, int, rp, type Brand, type Product } from '../api';
import { parseCsv } from '../../../shared/csv';
import { Badge, Btn, btnCls, Empty, ErrorNote, Loading, Modal, PageHead, Select, Table, useAsync, useToast } from '../ui';
import { effective } from './Sales';

const TEMPLATE_HEAD = ['name', 'brand', 'category', 'sleeve', 'gender', 'price', 'sale_price', 'cost_price', 'sizes', 'stock', 'sku', 'tokopedia_url', 'tokopedia_sold', 'images', 'colors', 'description', 'status', 'featured', 'is_new', 'preorder', 'preorder_days'];

function downloadTemplate() {
  const help = ['Product name as on Tokopedia', 'Brand name (created if new)', 'polo | top | trousers | shorts | skirt | outerwear | accessories', 'short | long | sleeveless (or empty)', 'men | women | unisex', 'Regular price, e.g. 350000', 'Sale price (optional)', 'Your cost per unit (optional, private)', 'Sizes separated by |, e.g. S|M|L|XL', 'Stock per size, e.g. S:4|M:2 (optional)', 'Your SKU (optional)', 'Full tokopedia.com product link', 'Sold count shown on Tokopedia (optional)', 'Image links separated by |', 'Colours as name:#hex separated by |', 'Description', 'published | draft', 'yes | no', 'yes | no', 'yes | no', 'Pre-order days (optional)'];
  const csv = '\ufeff' + [TEMPLATE_HEAD, help].map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')).join('\r\n') + '\r\n';
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = 'golfwear-products-template.csv';
  a.click();
  URL.revokeObjectURL(a.href);
}

type Row = Record<string, unknown>;

/** Reads a CSV (template columns) or the JSON written by golfwear/scripts/parse_tokopedia.py. */
function readImport(name: string, text: string): Row[] {
  if (name.toLowerCase().endsWith('.json') || text.trim().startsWith('[')) {
    const data = JSON.parse(text);
    if (!Array.isArray(data)) throw new Error('The JSON file should contain a list of products.');
    return data.map((x: Row) => ({
      // parse_tokopedia.py: price is what the buyer pays now, originalPrice the struck-through one.
      name: x.name,
      price: x.originalPrice ?? x.price,
      sale_price: x.originalPrice ? x.price : '',
      tokopedia_url: x.url ?? x.tokopedia_url,
      images: x.image ?? x.images ?? '',
      tokopedia_sold: x.sold ?? '',
      preorder: x.preorder ? 'yes' : '',
      ...('brand' in x ? { brand: x.brand } : {}),
    }));
  }
  const rows = parseCsv(text);
  if (rows.length < 2) throw new Error('The file has no product rows.');
  const head = rows[0].map((h) => h.trim().toLowerCase().replace(/\s+/g, '_'));
  if (!head.includes('name')) throw new Error('The first row must be the column names, including "name". Download the template to see them.');
  return rows.slice(1)
    .filter((r) => !(r[0] ?? '').startsWith('Product name as on'))
    .map((r) => Object.fromEntries(head.map((h, i) => [h, (r[i] ?? '').trim()])));
}

function ImportDialog({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ created: number; updated: number; errors: { row: number; message: string }[] } | null>(null);
  const signed = rows?.some((r) => String(r.images ?? '').includes('tokopedia-static.net'));
  const read = async (file: File | undefined) => {
    setError('');
    setRows(null);
    setResult(null);
    if (!file) return;
    setFileName(file.name);
    try {
      setRows(readImport(file.name, await file.text()));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not read the file.');
    }
  };
  const run = async () => {
    if (!rows) return;
    setBusy(true);
    try {
      const r = await api('POST', '/products/import', { rows });
      setResult(r);
      toast(`Import finished: ${r.created} added, ${r.updated} updated`);
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The import failed.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal open title="Import products" onClose={onClose} wide
      footer={<><Btn variant="secondary" onClick={onClose}>{result ? 'Close' : 'Cancel'}</Btn>{!result && <Btn onClick={run} disabled={!rows || !rows.length || busy}>{busy ? 'Importing…' : rows ? `Import ${int(rows.length)} rows` : 'Import'}</Btn>}</>}>
      <div className="space-y-4">
        <p className="text-stone">Upload a CSV with the template's columns, or the JSON file made by the Tokopedia catalogue script. Rows are matched to existing products by Tokopedia link, then SKU, then name: matches are updated with the columns you filled in, everything else is added. New products arrive as drafts unless the status column says published.</p>
        <div className="flex flex-wrap items-center gap-3">
          <label className={btnCls('secondary')}>
            Choose a file
            <input type="file" accept=".csv,.json,text/csv,application/json" className="sr-only" onChange={(e) => read(e.target.files?.[0])} />
          </label>
          <span className="text-[0.9rem] text-stone">{fileName || 'No file chosen'}</span>
          <Btn variant="ghost" size="sm" onClick={downloadTemplate}>Download the CSV template</Btn>
        </div>
        {error && <ErrorNote message={error} />}
        {signed && <p className="rounded-[3px] border border-[#C9892A]/40 bg-[#C9892A]/10 px-3 py-2 text-[0.88rem] text-[#7a5212]">Some image links are signed Tokopedia links that stop working after about an hour. Upload those photos in the product editor instead, or download them first with golfwear/scripts/download_images.py.</p>}
        {rows && !result && (
          <div>
            <p className="mb-2 text-[0.9rem]">{int(rows.length)} rows found. The first {Math.min(8, rows.length)}:</p>
            <Table label="Import preview">
              <thead><tr><th>Name</th><th>Brand</th><th>Category</th><th className="!text-right">Price</th><th>Sizes / stock</th><th>Tokopedia link</th></tr></thead>
              <tbody>
                {rows.slice(0, 8).map((r, i) => (
                  <tr key={i}><td className="max-w-[240px] truncate">{String(r.name ?? '')}</td><td>{String(r.brand ?? '')}</td><td>{String(r.category ?? '')}</td><td className="tnum text-right">{String(r.price ?? '')}</td><td>{String(r.stock || r.sizes || '')}</td><td className="max-w-[200px] truncate text-stone">{String(r.tokopedia_url ?? '')}</td></tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}
        {result && (
          <div className="space-y-2">
            <p className="font-medium">{int(result.created)} added, {int(result.updated)} updated{result.errors.length ? `, ${int(result.errors.length)} skipped` : ''}.</p>
            {result.errors.length > 0 && (
              <ul className="max-h-48 space-y-1 overflow-y-auto text-[0.88rem] text-danger">
                {result.errors.map((e) => <li key={e.row}>Row {e.row + 1}: {e.message}</li>)}
              </ul>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}

export function Products() {
  const { data: products, error, loading, reload } = useAsync(() => get<Product[]>('/products'), []);
  const { data: brands } = useAsync(() => get<Brand[]>('/brands'), []);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [brand, setBrand] = useState('');
  const [importing, setImporting] = useState(false);
  const closeImport = useCallback(() => setImporting(false), []);
  const list = useMemo(() => (products ?? []).filter((p) =>
    (!q || `${p.name} ${p.sku} ${p.brandName ?? ''}`.toLowerCase().includes(q.toLowerCase())) &&
    (!status || p.status === status) &&
    (!brand || String(p.brandId) === brand)), [products, q, status, brand]);
  const published = (products ?? []).filter((p) => p.status === 'published').length;
  return (
    <>
      <PageHead
        title="Products"
        sub={products ? `${int(products.length)} products, ${int(published)} published on the store.` : 'The catalogue shown on the store.'}
        actions={<>
          <a href="/api/admin/export/products.csv" download className={btnCls('secondary')}>Export CSV</a>
          <Btn variant="secondary" onClick={() => setImporting(true)}>Import</Btn>
          <Link to="/admin/products/new" className={btnCls()}>Add a product</Link>
        </>}
      />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <label className="sr-only" htmlFor="p-q">Search products</label>
        <input id="p-q" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, SKU or brand" className="min-h-11 w-64 rounded-[3px] border border-charcoal/20 bg-white px-3 text-[0.95rem]" />
        <label className="sr-only" htmlFor="p-status">Status</label>
        <Select id="p-status" value={status} onChange={setStatus} className="!w-auto"><option value="">Published and drafts</option><option value="published">Published</option><option value="draft">Drafts</option></Select>
        <label className="sr-only" htmlFor="p-brand">Brand</label>
        <Select id="p-brand" value={brand} onChange={setBrand} className="!w-auto"><option value="">All brands</option>{brands?.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</Select>
      </div>
      {error ? <ErrorNote message={error} retry={reload} /> : loading && !products ? <Loading /> : products && products.length === 0 ? (
        <Empty
          title="The catalogue is empty"
          body="Add your Tokopedia listings one by one, or import them all from a CSV. Only published products appear on the store, so nothing shows until you're ready."
          action={<div className="flex flex-wrap gap-2"><Link to="/admin/products/new" className={btnCls()}>Add a product</Link><Btn variant="secondary" onClick={() => setImporting(true)}>Import from CSV</Btn></div>}
        />
      ) : (
        <Table label="Products">
          <thead><tr><th><span className="sr-only">Photo</span></th><th>Product</th><th>Category</th><th className="!text-right">Price</th><th className="!text-right">Stock</th><th className="!text-right">Sold</th><th>Tokopedia</th><th>Status</th></tr></thead>
          <tbody className="tnum">
            {list.map((p) => {
              const stock = p.stock.reduce((n, s) => n + Math.max(0, s.qty), 0);
              return (
                <tr key={p.id} className="hover:bg-ivory/50">
                  <td className="w-14">{p.images[0] ? <img src={p.images[0]} alt="" className="h-14 w-11 bg-ivory-2 object-cover" loading="lazy" /> : <span className="block h-14 w-11 bg-ivory-2" />}</td>
                  <td className="min-w-[220px]">
                    <Link to={`/admin/products/${p.id}`} className="font-medium hover:underline">{p.name}</Link>
                    <span className="block text-[0.8rem] text-stone">{[p.brandName, p.sku && `SKU ${p.sku}`, p.featured && 'featured', p.isNew && 'new arrival'].filter(Boolean).join(', ')}</span>
                  </td>
                  <td>{CATEGORY_LABEL[p.category] ?? p.category}</td>
                  <td className="text-right">{rp(effective(p))}{effective(p) < p.price && <s className="block text-[0.8rem] text-stone">{rp(p.price)}</s>}</td>
                  <td className="text-right">{p.preorder ? 'Pre-order' : p.stock.length ? int(stock) : '—'}</td>
                  <td className="text-right">{int((p.unitsSold ?? 0) + p.tokopediaSold)}</td>
                  <td>{p.tokopediaUrl ? <a href={p.tokopediaUrl} target="_blank" rel="noopener" className="text-forest underline underline-offset-4">Open</a> : <span className="text-[#7a5212]">Missing</span>}</td>
                  <td><Badge value={p.status} label={p.status === 'published' ? 'Published' : 'Draft'} /></td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}
      {importing && <ImportDialog onClose={closeImport} onDone={reload} />}
    </>
  );
}
