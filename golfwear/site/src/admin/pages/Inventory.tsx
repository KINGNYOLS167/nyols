import { useCallback, useMemo, useState, type FormEvent } from 'react';
import { LOW_STOCK } from '../../../shared/domain';
import { Link } from '../../lib/router';
import { api, ApiError, dateLabel, get, int, rp, today, type InventoryRow, type Product, type Restock } from '../api';
import { Badge, Btn, btnCls, Confirm, Empty, ErrorNote, Field, inputCls, Loading, Modal, MoneyInput, PageHead, Select, Table, useAsync, useToast } from '../ui';

interface Group {
  productId: number; name: string; sku: string; brand: string | null; status: string; preorder: boolean; restockNote: string;
  sizes: { size: string; qty: number; onOrder: number }[]; nextRestock: string | null;
}

function group(rows: InventoryRow[]): Group[] {
  const map = new Map<number, Group>();
  for (const r of rows) {
    const g = map.get(r.productId) ?? { productId: r.productId, name: r.name, sku: r.sku, brand: r.brand, status: r.status, preorder: r.preorder, restockNote: r.restockNote, sizes: [], nextRestock: r.nextRestock };
    if (r.size !== null && r.qty !== null) g.sizes.push({ size: r.size, qty: r.qty, onOrder: r.onOrder });
    map.set(r.productId, g);
  }
  return [...map.values()];
}

/** Edit the stock count per size (for stocktakes and corrections) and the restock note. */
function StockForm({ productId, onClose, onSaved }: { productId: number; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const { data: product, error } = useAsync(() => get<Product>(`/products/${productId}`), [productId]);
  const [rows, setRows] = useState<{ size: string; qty: string }[] | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const list = rows ?? product?.stock.map((s) => ({ size: s.size, qty: String(s.qty) })) ?? [];
  const restockNote = note ?? product?.restockNote ?? '';
  const update = (i: number, patch: Partial<{ size: string; qty: string }>) => setRows(list.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!product) return;
    setBusy(true);
    setErr('');
    try {
      const stock = list.filter((r) => r.size.trim()).map((r) => ({ size: r.size.trim(), qty: Number(r.qty) || 0 }));
      await api('PUT', `/products/${product.id}`, { ...product, stock, restockNote });
      toast('Stock updated');
      onSaved();
    } catch (ex) {
      setErr(ex instanceof ApiError ? ex.message : 'Could not save the stock.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal open title={product ? `Stock: ${product.name}` : 'Stock'} onClose={onClose}
      footer={<><Btn variant="secondary" onClick={onClose}>Cancel</Btn><Btn type="submit" form="stock-form" disabled={busy || !product}>{busy ? 'Saving…' : 'Save stock'}</Btn></>}>
      {error ? <ErrorNote message={error} /> : !product ? <Loading /> : (
        <form id="stock-form" onSubmit={submit} className="space-y-4">
          {err && <ErrorNote message={err} />}
          <p className="text-[0.88rem] text-stone">Set the number you physically have for each size. To add stock that just arrived, record a restock instead, so its cost is tracked.</p>
          <div className="space-y-2">
            {list.map((r, i) => (
              <div key={i} className="flex items-center gap-2">
                <label className="sr-only" htmlFor={`sz-${i}`}>Size</label>
                <input id={`sz-${i}`} value={r.size} onChange={(e) => update(i, { size: e.target.value })} className={`${inputCls} !w-28`} placeholder="Size" />
                <label className="sr-only" htmlFor={`qty-${i}`}>Units in stock for {r.size || 'this size'}</label>
                <input id={`qty-${i}`} type="number" value={r.qty} onChange={(e) => update(i, { qty: e.target.value })} className={`${inputCls} tnum !w-28`} />
                <Btn size="sm" variant="ghost" onClick={() => setRows(list.filter((_, j) => j !== i))} aria-label={`Remove size ${r.size}`}>Remove</Btn>
              </div>
            ))}
          </div>
          <Btn size="sm" variant="secondary" onClick={() => setRows([...list, { size: '', qty: '0' }])}>Add a size</Btn>
          <Field label="Restock note" hint="Shown on the inventory page and in the inventory export, e.g. 'Supplier restocks M and L on 5 Dec'.">
            {(id, db) => <input id={id} value={restockNote} onChange={(e) => setNote(e.target.value)} aria-describedby={db} className={inputCls} />}
          </Field>
        </form>
      )}
    </Modal>
  );
}

type RDraft = { productId: string; date: string; size: string; qty: string; unitCost: number | null; supplier: string; status: 'ordered' | 'received'; expectedDate: string; note: string; recordExpense: boolean };

function RestockForm({ restock, products, presetProduct, onClose, onSaved }: { restock: Restock | null; products: Product[]; presetProduct?: number; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [d, setD] = useState<RDraft>(() => restock
    ? { productId: String(restock.productId), date: restock.date, size: restock.size, qty: String(restock.qty), unitCost: restock.unitCost, supplier: restock.supplier, status: restock.status, expectedDate: restock.expectedDate ?? '', note: restock.note, recordExpense: !!restock.expenseId }
    : { productId: presetProduct ? String(presetProduct) : '', date: today(), size: '', qty: '', unitCost: null, supplier: '', status: 'received', expectedDate: '', note: '', recordExpense: true });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof RDraft>(k: K, v: RDraft[K]) => setD((x) => ({ ...x, [k]: v }));
  const product = products.find((p) => String(p.id) === d.productId);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    try {
      const body = { ...d, productId: Number(d.productId) || null, qty: Number(d.qty) || null, expectedDate: d.status === 'ordered' ? d.expectedDate || null : null };
      if (restock) await api('PUT', `/restocks/${restock.id}`, body); else await api('POST', '/restocks', body);
      toast(d.status === 'received' ? 'Restock recorded and added to stock' : 'Restock on order recorded');
      onSaved();
    } catch (ex) {
      setErrors(ex instanceof ApiError ? { [ex.field ?? 'form']: ex.message } : { form: 'Could not save the restock.' });
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal open title={restock ? 'Edit restock' : 'Record a restock'} onClose={onClose}
      footer={<><Btn variant="secondary" onClick={onClose}>Cancel</Btn><Btn type="submit" form="restock-form" disabled={busy}>{busy ? 'Saving…' : restock ? 'Save changes' : 'Record restock'}</Btn></>}>
      <form id="restock-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        {errors.form && <div className="sm:col-span-2"><ErrorNote message={errors.form} /></div>}
        <Field label="Product" className="sm:col-span-2" error={errors.productId}>
          {(id, db) => <Select id={id} value={d.productId} onChange={(v) => set('productId', v)} describedBy={db}><option value="">Choose a product</option>{products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select>}
        </Field>
        <Field label="Status" hint="Units are added to stock when the restock is received.">
          {(id, db) => <Select id={id} value={d.status} onChange={(v) => set('status', v as RDraft['status'])} describedBy={db}><option value="received">Received</option><option value="ordered">Ordered, not here yet</option></Select>}
        </Field>
        <Field label={d.status === 'received' ? 'Date received' : 'Date ordered'} error={errors.date}>{(id, db) => <input id={id} type="date" required value={d.date} onChange={(e) => set('date', e.target.value)} aria-describedby={db} className={inputCls} />}</Field>
        <Field label="Size" error={errors.size}>
          {(id, db) => (
            <>
              <input id={id} list="restock-sizes" required value={d.size} onChange={(e) => set('size', e.target.value)} aria-describedby={db} className={inputCls} placeholder="e.g. M" />
              <datalist id="restock-sizes">{product?.stock.map((s) => <option key={s.size} value={s.size} />)}</datalist>
            </>
          )}
        </Field>
        <Field label="Quantity" error={errors.qty}>{(id, db) => <input id={id} type="number" min={1} required value={d.qty} onChange={(e) => set('qty', e.target.value)} aria-describedby={db} className={`${inputCls} tnum`} />}</Field>
        <Field label="Cost per unit" error={errors.unitCost}>{(id, db) => <MoneyInput id={id} value={d.unitCost} onChange={(v) => set('unitCost', v)} describedBy={db} invalid={!!errors.unitCost} />}</Field>
        <Field label="Supplier">{(id) => <input id={id} value={d.supplier} onChange={(e) => set('supplier', e.target.value)} className={inputCls} />}</Field>
        {d.status === 'ordered' && <Field label="Expected arrival">{(id) => <input id={id} type="date" value={d.expectedDate} onChange={(e) => set('expectedDate', e.target.value)} className={inputCls} />}</Field>}
        <Field label="Note" className="sm:col-span-2">{(id) => <input id={id} value={d.note} onChange={(e) => set('note', e.target.value)} className={inputCls} />}</Field>
        <label className="flex items-start gap-3 sm:col-span-2">
          <input type="checkbox" checked={d.recordExpense} onChange={(e) => set('recordExpense', e.target.checked)} className="mt-1 h-4 w-4 accent-forest" />
          <span>Record the cost as a product acquisition expense
            <span className="block text-[0.82rem] text-stone">{d.unitCost && Number(d.qty) ? `${rp(d.unitCost * Number(d.qty))} on ${dateLabel(d.date)}. Kept in step if you edit or delete this restock.` : 'Needs a cost per unit and a quantity.'}</span>
          </span>
        </label>
      </form>
    </Modal>
  );
}

export function Inventory() {
  const toast = useToast();
  const { data: rows, error, loading, reload } = useAsync(() => get<InventoryRow[]>('/inventory'), []);
  const { data: restocks, reload: reloadRestocks } = useAsync(() => get<Restock[]>('/restocks'), []);
  const { data: products } = useAsync(() => get<Product[]>('/products'), []);
  const [q, setQ] = useState('');
  const [onlyLow, setOnlyLow] = useState(false);
  const [stockFor, setStockFor] = useState<number | null>(null);
  const [restockEdit, setRestockEdit] = useState<{ restock: Restock | null; product?: number } | null>(null);
  const [deleting, setDeleting] = useState<Restock | null>(null);
  const [busy, setBusy] = useState(false);
  const refresh = useCallback(() => { reload(); reloadRestocks(); }, [reload, reloadRestocks]);
  const closeStock = useCallback(() => setStockFor(null), []);
  const closeRestock = useCallback(() => setRestockEdit(null), []);
  const groups = useMemo(() => group(rows ?? []).filter((g) => {
    if (q && !`${g.name} ${g.sku} ${g.brand ?? ''}`.toLowerCase().includes(q.toLowerCase())) return false;
    if (onlyLow && !g.sizes.some((s) => s.qty <= LOW_STOCK)) return false;
    return true;
  }), [rows, q, onlyLow]);

  const receive = async (r: Restock) => {
    try {
      await api('PUT', `/restocks/${r.id}`, { ...r, status: 'received', date: today(), recordExpense: !!r.expenseId });
      toast(`${int(r.qty)} × ${r.size} added to ${r.productName}`);
      refresh();
    } catch (ex) {
      toast(ex instanceof Error ? ex.message : 'Could not update the restock.', 'error');
    }
  };
  const remove = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      await api('DELETE', `/restocks/${deleting.id}`);
      toast('Restock deleted');
      setDeleting(null);
      refresh();
    } catch (ex) {
      toast(ex instanceof Error ? ex.message : 'Could not delete.', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHead title="Inventory" sub={`Stock per size. Sizes at ${LOW_STOCK} or fewer are flagged as low.`} actions={<>
        <a href="/api/admin/export/inventory.csv" download className={btnCls('secondary')}>Export CSV</a>
        <Btn onClick={() => setRestockEdit({ restock: null })}>Record a restock</Btn>
      </>} />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <label className="sr-only" htmlFor="inv-q">Search inventory</label>
        <input id="inv-q" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products or SKU" className={`${inputCls} !w-64`} />
        <label className="flex items-center gap-2 text-[0.92rem]"><input type="checkbox" checked={onlyLow} onChange={(e) => setOnlyLow(e.target.checked)} className="h-4 w-4 accent-forest" />Only low or out of stock</label>
      </div>
      {error ? <ErrorNote message={error} retry={reload} /> : loading && !rows ? <Loading /> : rows && rows.length === 0 ? (
        <Empty title="No products yet" body="Inventory follows your catalogue. Add products with their sizes first." action={<Link to="/admin/products/new" className={btnCls()}>Add a product</Link>} />
      ) : (
        <Table label="Inventory">
          <thead><tr><th>Product</th><th>Stock by size</th><th className="!text-right">Total</th><th className="!text-right">On order</th><th>Next restock</th><th><span className="sr-only">Actions</span></th></tr></thead>
          <tbody className="tnum">
            {groups.map((g) => {
              const total = g.sizes.reduce((n, s) => n + Math.max(0, s.qty), 0);
              const onOrder = g.sizes.reduce((n, s) => n + s.onOrder, 0);
              return (
                <tr key={g.productId} className="align-top hover:bg-ivory/50">
                  <td className="min-w-[200px]">
                    <Link to={`/admin/products/${g.productId}`} className="font-medium hover:underline">{g.name}</Link>
                    <span className="block text-[0.8rem] text-stone">{[g.brand, g.sku && `SKU ${g.sku}`, g.status === 'draft' && 'draft', g.preorder && 'pre-order'].filter(Boolean).join(', ')}</span>
                    {g.restockNote && <span className="mt-1 block text-[0.8rem] text-[#7a5212]">{g.restockNote}</span>}
                  </td>
                  <td>
                    {g.sizes.length ? (
                      <ul className="flex flex-wrap gap-1.5">
                        {g.sizes.map((s) => (
                          <li key={s.size} className={`rounded-[3px] border px-2 py-0.5 text-[0.82rem] ${s.qty <= 0 ? 'border-danger/30 bg-danger/5 text-danger' : s.qty <= LOW_STOCK ? 'border-[#C9892A]/40 bg-[#C9892A]/10 text-[#7a5212]' : 'border-line'}`}>
                            <span className="font-medium">{s.size}</span> {int(s.qty)}{s.qty <= 0 ? ' (out)' : s.qty <= LOW_STOCK ? ' (low)' : ''}
                          </li>
                        ))}
                      </ul>
                    ) : <span className="text-stone">No sizes tracked</span>}
                  </td>
                  <td className="text-right">{g.sizes.length ? int(total) : '—'}</td>
                  <td className="text-right">{onOrder ? int(onOrder) : '—'}</td>
                  <td className="whitespace-nowrap">{dateLabel(g.nextRestock)}</td>
                  <td className="whitespace-nowrap text-right">
                    <Btn size="sm" variant="ghost" onClick={() => setStockFor(g.productId)} aria-label={`Edit stock for ${g.name}`}>Edit stock</Btn>
                    <Btn size="sm" variant="ghost" onClick={() => setRestockEdit({ restock: null, product: g.productId })} aria-label={`Record a restock for ${g.name}`}>Restock</Btn>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}

      <h2 className="mb-3 mt-12 text-[1.3rem] font-light text-forest">Restocks</h2>
      {!restocks ? <Loading /> : restocks.length === 0 ? (
        <p className="text-stone">No restocks recorded. Record stock purchases here to add units and track what they cost.</p>
      ) : (
        <Table label="Restocks">
          <thead><tr><th>Date</th><th>Product</th><th>Size</th><th className="!text-right">Qty</th><th className="!text-right">Unit cost</th><th>Supplier</th><th>Status</th><th><span className="sr-only">Actions</span></th></tr></thead>
          <tbody className="tnum">
            {restocks.map((r) => (
              <tr key={r.id} className="hover:bg-ivory/50">
                <td className="whitespace-nowrap">{dateLabel(r.date)}</td>
                <td>{r.productName}</td>
                <td>{r.size}</td>
                <td className="text-right">{int(r.qty)}</td>
                <td className="text-right">{rp(r.unitCost)}</td>
                <td className="text-stone">{r.supplier || '—'}</td>
                <td><Badge value={r.status} label={r.status === 'ordered' ? `Ordered${r.expectedDate ? `, due ${dateLabel(r.expectedDate)}` : ''}` : 'Received'} /></td>
                <td className="whitespace-nowrap text-right">
                  {r.status === 'ordered' && <Btn size="sm" variant="secondary" onClick={() => receive(r)}>Mark received</Btn>}
                  <Btn size="sm" variant="ghost" onClick={() => setRestockEdit({ restock: r })} aria-label={`Edit restock of ${r.productName} ${r.size}`}>Edit</Btn>
                  <Btn size="sm" variant="ghost" onClick={() => setDeleting(r)} aria-label={`Delete restock of ${r.productName} ${r.size}`} className="!text-danger">Delete</Btn>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      {stockFor !== null && <StockForm productId={stockFor} onClose={closeStock} onSaved={() => { setStockFor(null); refresh(); }} />}
      {restockEdit && <RestockForm restock={restockEdit.restock} presetProduct={restockEdit.product} products={products ?? []} onClose={closeRestock} onSaved={() => { setRestockEdit(null); refresh(); }} />}
      <Confirm open={!!deleting} title="Delete this restock?" busy={busy} onClose={() => setDeleting(null)} onConfirm={remove}
        body={deleting && <p>{int(deleting.qty)} × {deleting.productName} ({deleting.size}) on {dateLabel(deleting.date)}.{deleting.status === 'received' ? ' Those units come back out of stock.' : ''}{deleting.expenseId ? ' Its acquisition expense is deleted too.' : ''}</p>} />
    </>
  );
}
