import { useEffect, useState, type FormEvent } from 'react';
import { CATEGORIES, GENDERS, SLEEVES } from '../../../shared/domain';
import { Link, navigate } from '../../lib/router';
import { api, ApiError, CATEGORY_LABEL, get, int, type Brand, type Product } from '../api';
import { Btn, btnCls, Confirm, ErrorNote, Field, inputCls, Loading, MoneyInput, PageHead, Select, useAsync, useToast } from '../ui';

type Draft = {
  name: string; sku: string; brandId: string; category: string; sleeve: string; gender: string; description: string;
  specs: { label: string; value: string }[]; colors: { name: string; hex: string }[]; images: string[];
  price: number | null; salePrice: number | null; costPrice: number | null; tokopediaUrl: string; tokopediaSold: string;
  preorder: boolean; preorderDays: string; featured: boolean; isNew: boolean; status: 'published' | 'draft'; restockNote: string;
  stock: { size: string; qty: string }[];
};

const blank: Draft = {
  name: '', sku: '', brandId: '', category: 'polo', sleeve: 'short', gender: 'men', description: '', specs: [], colors: [], images: [],
  price: null, salePrice: null, costPrice: null, tokopediaUrl: '', tokopediaSold: '', preorder: false, preorderDays: '', featured: false,
  isNew: true, status: 'draft', restockNote: '', stock: [{ size: 'S', qty: '0' }, { size: 'M', qty: '0' }, { size: 'L', qty: '0' }, { size: 'XL', qty: '0' }],
};

const fromProduct = (p: Product): Draft => ({
  name: p.name, sku: p.sku, brandId: p.brandId ? String(p.brandId) : '', category: p.category, sleeve: p.sleeve, gender: p.gender,
  description: p.description, specs: p.specs, colors: p.colors, images: p.images, price: p.price, salePrice: p.salePrice, costPrice: p.costPrice,
  tokopediaUrl: p.tokopediaUrl, tokopediaSold: p.tokopediaSold ? String(p.tokopediaSold) : '', preorder: p.preorder,
  preorderDays: p.preorderDays ? String(p.preorderDays) : '', featured: p.featured, isNew: p.isNew, status: p.status, restockNote: p.restockNote,
  stock: p.stock.map((s) => ({ size: s.size, qty: String(s.qty) })),
});

/** Resize in the browser before upload: long edge 1400px, WebP. Keeps the database small. */
async function compress(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1400 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/webp', 0.82));
  if (!blob) throw new Error('This browser could not convert the image.');
  return blob;
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[4px] border border-line bg-white p-5 sm:p-6">
      <h2 className="font-medium">{title}</h2>
      {hint && <p className="mt-1 text-[0.85rem] text-stone">{hint}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

export function ProductEditor({ id }: { id: number | null }) {
  const toast = useToast();
  const { data: product, error: loadError } = useAsync(() => (id ? get<Product>(`/products/${id}`) : Promise.resolve(null)), [id]);
  const { data: brands, reload: reloadBrands } = useAsync(() => get<Brand[]>('/brands'), []);
  const [d, setD] = useState<Draft | null>(id ? null : blank);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(0);
  const [imageUrl, setImageUrl] = useState('');
  const [newBrand, setNewBrand] = useState('');
  const [deleting, setDeleting] = useState(false);
  useEffect(() => { if (product) setD(fromProduct(product)); }, [product]);

  if (loadError) return <ErrorNote message={loadError} />;
  if (!d) return <Loading />;
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => (x ? { ...x, [k]: v } : x));
  const list = <K extends 'specs' | 'colors' | 'stock' | 'images'>(k: K) => d[k] as Draft[K];

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(files.length);
    const urls: string[] = [];
    for (const f of Array.from(files)) {
      try {
        const blob = await compress(f);
        const r = await api<{ url: string }>('POST', '/media', blob);
        urls.push(r.url);
      } catch (e) {
        toast(`${f.name}: ${e instanceof Error ? e.message : 'upload failed'}`, 'error');
      }
      setUploading((n) => n - 1);
    }
    setD((x) => (x ? { ...x, images: [...x.images, ...urls] } : x));
  };

  const addBrand = async () => {
    const name = newBrand.trim();
    if (!name) return;
    try {
      const r = await api<{ id: number }>('POST', '/brands', { name });
      setNewBrand('');
      reloadBrands();
      set('brandId', String(r.id));
      toast(`Brand ${name} added`);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not add the brand.', 'error');
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    const body = {
      ...d,
      brandId: d.brandId ? Number(d.brandId) : null,
      tokopediaSold: d.tokopediaSold === '' ? 0 : d.tokopediaSold,
      preorderDays: d.preorder && d.preorderDays ? d.preorderDays : null,
      specs: d.specs.filter((s) => s.label.trim() || s.value.trim()),
      colors: d.colors.filter((c) => c.name.trim() || c.hex),
      stock: d.stock.filter((s) => s.size.trim()).map((s) => ({ size: s.size.trim(), qty: Number(s.qty) || 0 })),
    };
    try {
      if (id) {
        await api('PUT', `/products/${id}`, body);
        toast('Product saved');
      } else {
        const r = await api<{ id: number }>('POST', '/products', body);
        toast('Product added');
        navigate(`/admin/products/${r.id}`, { replace: true });
      }
    } catch (err) {
      const field = err instanceof ApiError ? err.field ?? 'form' : 'form';
      setErrors({ [field]: err instanceof Error ? err.message : 'Could not save.' });
      document.getElementById('product-form')?.scrollIntoView({ block: 'start' });
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    try {
      await api('DELETE', `/products/${id}`);
      toast('Product deleted');
      navigate('/admin/products');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not delete.', 'error');
    }
  };

  const move = (i: number, dir: -1 | 1) => {
    const imgs = [...d.images];
    const j = i + dir;
    if (j < 0 || j >= imgs.length) return;
    [imgs[i], imgs[j]] = [imgs[j], imgs[i]];
    set('images', imgs);
  };

  return (
    <>
      <Link to="/admin/products" className="mb-3 inline-block text-[0.9rem] text-stone hover:text-forest">All products</Link>
      <PageHead
        title={id ? d.name || 'Product' : 'Add a product'}
        sub={product ? `Last saved ${new Date(product.updatedAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}` : 'Products are saved as drafts until you publish them.'}
        actions={<>
          {product?.status === 'published' && <a href={`/product/${product.slug}`} target="_blank" rel="noopener" className={btnCls('secondary')}>View on the store</a>}
          <Btn type="submit" form="product-form" disabled={busy || uploading > 0}>{busy ? 'Saving…' : id ? 'Save product' : 'Add product'}</Btn>
        </>}
      />
      <form id="product-form" onSubmit={submit} className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          {errors.form && <ErrorNote message={errors.form} />}
          <Section title="Basics">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Name" className="sm:col-span-2" error={errors.name}>{(fid, db) => <input id={fid} required value={d.name} onChange={(e) => set('name', e.target.value)} aria-describedby={db} className={inputCls} />}</Field>
              <Field label="Brand" error={errors.brandId}>
                {(fid, db) => <Select id={fid} value={d.brandId} onChange={(v) => set('brandId', v)} describedBy={db}><option value="">No brand</option>{brands?.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</Select>}
              </Field>
              <Field label="Add a new brand" hint="Creates the brand and selects it.">
                {(fid, db) => (
                  <div className="flex gap-2">
                    <input id={fid} value={newBrand} onChange={(e) => setNewBrand(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addBrand(); } }} aria-describedby={db} className={inputCls} />
                    <Btn variant="secondary" onClick={addBrand} disabled={!newBrand.trim()}>Add</Btn>
                  </div>
                )}
              </Field>
              <Field label="Category" error={errors.category}>{(fid) => <Select id={fid} value={d.category} onChange={(v) => set('category', v)}>{CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}</Select>}</Field>
              <Field label="Sleeve" hint="Decides the short and long sleeve collections.">{(fid, db) => <Select id={fid} value={d.sleeve} onChange={(v) => set('sleeve', v)} describedBy={db}>{SLEEVES.map((s) => <option key={s} value={s}>{s ? s[0].toUpperCase() + s.slice(1) : 'Not applicable'}</option>)}</Select>}</Field>
              <Field label="For">{(fid) => <Select id={fid} value={d.gender} onChange={(v) => set('gender', v)}>{GENDERS.map((g) => <option key={g} value={g}>{g === 'men' ? 'Men' : g === 'women' ? 'Women' : 'Unisex'}</option>)}</Select>}</Field>
              <Field label="SKU" error={errors.sku}>{(fid, db) => <input id={fid} value={d.sku} onChange={(e) => set('sku', e.target.value)} aria-describedby={db} className={inputCls} />}</Field>
              <Field label="Description" className="sm:col-span-2" error={errors.description}>{(fid, db) => <textarea id={fid} rows={6} value={d.description} onChange={(e) => set('description', e.target.value)} aria-describedby={db} className={`${inputCls} py-2.5`} />}</Field>
            </div>
          </Section>

          <Section title="Photos" hint="The first photo is the main one; the second shows when shoppers hover. Portrait 4:5 works best.">
            {d.images.length > 0 && (
              <ul className="mb-4 grid grid-cols-3 gap-3 sm:grid-cols-4">
                {d.images.map((src, i) => (
                  <li key={src + i} className="space-y-1.5">
                    <img src={src} alt={`Photo ${i + 1}`} className="aspect-[4/5] w-full bg-ivory-2 object-cover" />
                    <div className="flex gap-1">
                      <Btn size="sm" variant="ghost" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Move photo ${i + 1} earlier`}>←</Btn>
                      <Btn size="sm" variant="ghost" onClick={() => move(i, 1)} disabled={i === d.images.length - 1} aria-label={`Move photo ${i + 1} later`}>→</Btn>
                      <Btn size="sm" variant="ghost" className="ml-auto !text-danger" onClick={() => set('images', d.images.filter((_, j) => j !== i))} aria-label={`Remove photo ${i + 1}`}>Remove</Btn>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {errors.images && <p className="mb-3 text-[0.85rem] text-danger">{errors.images}</p>}
            <div className="flex flex-wrap items-center gap-3">
              <label className={btnCls('secondary')}>
                {uploading ? `Uploading ${uploading}…` : 'Upload photos'}
                <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => { upload(e.target.files); e.target.value = ''; }} />
              </label>
              <span className="text-[0.85rem] text-stone">or add a link:</span>
              <label className="sr-only" htmlFor="img-url">Image link</label>
              <input id="img-url" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://…" className={`${inputCls} !w-56`} />
              <Btn variant="ghost" disabled={!imageUrl.startsWith('https://')} onClick={() => { set('images', [...d.images, imageUrl.trim()]); setImageUrl(''); }}>Add link</Btn>
            </div>
          </Section>

          <Section title="Sizes and stock" hint="Shoppers see which sizes are available. A sale or restock with a size updates these counts.">
            <div className="space-y-2">
              {list('stock').map((s, i) => (
                <div key={i} className="flex items-center gap-2">
                  <label className="sr-only" htmlFor={`size-${i}`}>Size</label>
                  <input id={`size-${i}`} value={s.size} onChange={(e) => set('stock', d.stock.map((x, j) => (j === i ? { ...x, size: e.target.value } : x)))} className={`${inputCls} !w-28`} placeholder="Size" />
                  <label className="sr-only" htmlFor={`qty-${i}`}>Units in stock</label>
                  <input id={`qty-${i}`} type="number" value={s.qty} onChange={(e) => set('stock', d.stock.map((x, j) => (j === i ? { ...x, qty: e.target.value } : x)))} className={`${inputCls} tnum !w-28`} />
                  <span className="text-[0.85rem] text-stone">in stock</span>
                  <Btn size="sm" variant="ghost" onClick={() => set('stock', d.stock.filter((_, j) => j !== i))} aria-label={`Remove size ${s.size}`}>Remove</Btn>
                </div>
              ))}
            </div>
            {errors.stock && <p className="mt-2 text-[0.85rem] text-danger">{errors.stock}</p>}
            <Btn className="mt-3" size="sm" variant="secondary" onClick={() => set('stock', [...d.stock, { size: '', qty: '0' }])}>Add a size</Btn>
            <p className="mt-3 text-[0.82rem] text-stone">Leave the list empty if you don't track stock here: the store then says "Check stock on Tokopedia".</p>
          </Section>

          <Section title="Colours and specifications">
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <p className="mb-2 text-[0.85rem] font-medium">Colours</p>
                <div className="space-y-2">
                  {d.colors.map((c, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <label className="sr-only" htmlFor={`cn-${i}`}>Colour name</label>
                      <input id={`cn-${i}`} value={c.name} onChange={(e) => set('colors', d.colors.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} className={inputCls} placeholder="Name" />
                      <label className="sr-only" htmlFor={`ch-${i}`}>Colour swatch</label>
                      <input id={`ch-${i}`} type="color" value={c.hex || '#173d32'} onChange={(e) => set('colors', d.colors.map((x, j) => (j === i ? { ...x, hex: e.target.value } : x)))} className="h-11 w-12 shrink-0 cursor-pointer rounded-[3px] border border-charcoal/20 bg-white p-1" />
                      <Btn size="sm" variant="ghost" onClick={() => set('colors', d.colors.filter((_, j) => j !== i))} aria-label={`Remove colour ${c.name}`}>Remove</Btn>
                    </div>
                  ))}
                </div>
                {errors.colors && <p className="mt-2 text-[0.85rem] text-danger">{errors.colors}</p>}
                <Btn className="mt-2" size="sm" variant="secondary" onClick={() => set('colors', [...d.colors, { name: '', hex: '#173d32' }])}>Add a colour</Btn>
              </div>
              <div>
                <p className="mb-2 text-[0.85rem] font-medium">Specifications</p>
                <div className="space-y-2">
                  {d.specs.map((s, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <label className="sr-only" htmlFor={`sl-${i}`}>Specification</label>
                      <input id={`sl-${i}`} value={s.label} onChange={(e) => set('specs', d.specs.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} className={`${inputCls} !w-36`} placeholder="e.g. Fabric" />
                      <label className="sr-only" htmlFor={`sv-${i}`}>Value</label>
                      <input id={`sv-${i}`} value={s.value} onChange={(e) => set('specs', d.specs.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))} className={inputCls} placeholder="e.g. Polyester-spandex" />
                      <Btn size="sm" variant="ghost" onClick={() => set('specs', d.specs.filter((_, j) => j !== i))} aria-label={`Remove ${s.label}`}>Remove</Btn>
                    </div>
                  ))}
                </div>
                <Btn className="mt-2" size="sm" variant="secondary" onClick={() => set('specs', [...d.specs, { label: '', value: '' }])}>Add a specification</Btn>
              </div>
            </div>
          </Section>
        </div>

        <div className="space-y-6">
          <Section title="Visibility">
            <div className="space-y-3">
              <Field label="Status">{(fid) => <Select id={fid} value={d.status} onChange={(v) => set('status', v as Draft['status'])}><option value="draft">Draft (hidden)</option><option value="published">Published on the store</option></Select>}</Field>
              <label className="flex items-start gap-3"><input type="checkbox" checked={d.featured} onChange={(e) => set('featured', e.target.checked)} className="mt-1 h-4 w-4 accent-forest" /><span>Featured<span className="block text-[0.82rem] text-stone">Shown on the home page until real sales give a best-seller ranking.</span></span></label>
              <label className="flex items-start gap-3"><input type="checkbox" checked={d.isNew} onChange={(e) => set('isNew', e.target.checked)} className="mt-1 h-4 w-4 accent-forest" /><span>New arrival<span className="block text-[0.82rem] text-stone">Listed in the New arrivals collection with a New badge.</span></span></label>
            </div>
          </Section>
          <Section title="Price">
            <div className="space-y-4">
              <Field label="Regular price" error={errors.price}>{(fid, db) => <MoneyInput id={fid} value={d.price} onChange={(v) => set('price', v)} describedBy={db} invalid={!!errors.price} required />}</Field>
              <Field label="Sale price" hint="Optional. Must be lower than the regular price." error={errors.salePrice}>{(fid, db) => <MoneyInput id={fid} value={d.salePrice} onChange={(v) => set('salePrice', v)} describedBy={db} invalid={!!errors.salePrice} />}</Field>
              <Field label="Your cost per unit" hint="Private: never shown on the store." error={errors.costPrice}>{(fid, db) => <MoneyInput id={fid} value={d.costPrice} onChange={(v) => set('costPrice', v)} describedBy={db} invalid={!!errors.costPrice} />}</Field>
            </div>
          </Section>
          <Section title="Tokopedia">
            <div className="space-y-4">
              <Field label="Product link" hint="Open the listing in your Tokopedia store and copy the address. Without it, Buy buttons open the store page." error={errors.tokopediaUrl}>
                {(fid, db) => <input id={fid} type="url" value={d.tokopediaUrl} onChange={(e) => set('tokopediaUrl', e.target.value)} aria-describedby={db} aria-invalid={!!errors.tokopediaUrl || undefined} className={inputCls} placeholder="https://www.tokopedia.com/golfwear/…" />}
              </Field>
              {d.tokopediaUrl.startsWith('https://') && <a href={d.tokopediaUrl} target="_blank" rel="noopener" className="inline-block text-[0.88rem] text-forest underline underline-offset-4">Check the link</a>}
              <Field label="Sold count on Tokopedia" hint="Optional: the 'terjual' number on the listing. Added to sales recorded here for the best-seller ranking." error={errors.tokopediaSold}>
                {(fid, db) => <input id={fid} type="number" min={0} value={d.tokopediaSold} onChange={(e) => set('tokopediaSold', e.target.value)} aria-describedby={db} className={`${inputCls} tnum`} />}
              </Field>
              <label className="flex items-start gap-3"><input type="checkbox" checked={d.preorder} onChange={(e) => set('preorder', e.target.checked)} className="mt-1 h-4 w-4 accent-forest" /><span>Pre-order listing</span></label>
              {d.preorder && <Field label="Pre-order days" error={errors.preorderDays}>{(fid, db) => <input id={fid} type="number" min={1} max={90} value={d.preorderDays} onChange={(e) => set('preorderDays', e.target.value)} aria-describedby={db} className={`${inputCls} tnum`} />}</Field>}
              <Field label="Restock note" hint="Private, shown on the inventory page.">{(fid, db) => <input id={fid} value={d.restockNote} onChange={(e) => set('restockNote', e.target.value)} aria-describedby={db} className={inputCls} />}</Field>
            </div>
          </Section>
          {product && (
            <Section title="Delete">
              <p className="text-[0.88rem] text-stone">{product.unitsSold ? `Sales already recorded for it (${int(product.unitsSold)} units) keep their product name.` : 'Removes it from the store and the dashboard.'}</p>
              <Btn className="mt-3" variant="danger" onClick={() => setDeleting(true)}>Delete product</Btn>
            </Section>
          )}
        </div>
      </form>
      <Confirm open={deleting} title="Delete this product?" onClose={() => setDeleting(false)} onConfirm={remove}
        body={<p>{d.name} will be removed from the store, along with its stock and restock records. This can't be undone.</p>} />
    </>
  );
}
