import { useCallback, useState, type FormEvent } from 'react';
import { api, ApiError, get, int, type Brand } from '../api';
import { Btn, Confirm, Empty, ErrorNote, Field, inputCls, Loading, Modal, PageHead, Table, useAsync, useToast } from '../ui';

function BrandForm({ brand, onClose, onSaved }: { brand: Brand | null; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [d, setD] = useState({ name: brand?.name ?? '', description: brand?.description ?? '', logoUrl: brand?.logoUrl ?? '', sort: String(brand?.sort ?? 0) });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const upload = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    try {
      const r = await api<{ url: string }>('POST', '/media', file);
      setD((x) => ({ ...x, logoUrl: r.url }));
    } catch (e) {
      setErrors({ logoUrl: e instanceof Error ? e.message : 'Upload failed.' });
    } finally {
      setUploading(false);
    }
  };
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    try {
      const body = { ...d, sort: Number(d.sort) || 0 };
      if (brand) await api('PUT', `/brands/${brand.id}`, body); else await api('POST', '/brands', body);
      toast(brand ? 'Brand saved' : 'Brand added');
      onSaved();
    } catch (err) {
      setErrors(err instanceof ApiError ? { [err.field ?? 'form']: err.message } : { form: 'Could not save the brand.' });
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal open title={brand ? `Edit ${brand.name}` : 'Add a brand'} onClose={onClose}
      footer={<><Btn variant="secondary" onClick={onClose}>Cancel</Btn><Btn type="submit" form="brand-form" disabled={busy || uploading}>{busy ? 'Saving…' : brand ? 'Save brand' : 'Add brand'}</Btn></>}>
      <form id="brand-form" onSubmit={submit} className="space-y-4">
        {errors.form && <ErrorNote message={errors.form} />}
        <Field label="Name" error={errors.name}>{(id, db) => <input id={id} required value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} aria-describedby={db} className={inputCls} />}</Field>
        <Field label="Description" hint="Shown at the top of the brand's collection page." error={errors.description}>{(id, db) => <textarea id={id} rows={4} value={d.description} onChange={(e) => setD({ ...d, description: e.target.value })} aria-describedby={db} className={`${inputCls} py-2.5`} />}</Field>
        <Field label="Logo" hint="Optional. A PNG or SVG-like image with a transparent background works best." error={errors.logoUrl}>
          {(id, db) => (
            <div className="flex flex-wrap items-center gap-3">
              {d.logoUrl && <img src={d.logoUrl} alt="" className="h-12 w-auto max-w-[160px] bg-ivory-2 object-contain p-1" />}
              <label className="inline-flex min-h-11 cursor-pointer items-center rounded-[3px] border border-forest/35 px-4 text-[0.92rem] font-medium text-forest hover:border-forest">
                {uploading ? 'Uploading…' : d.logoUrl ? 'Replace logo' : 'Upload logo'}
                <input id={id} type="file" accept="image/png,image/webp,image/jpeg,image/avif" aria-describedby={db} className="sr-only" onChange={(e) => upload(e.target.files?.[0])} />
              </label>
              {d.logoUrl && <Btn variant="ghost" size="sm" onClick={() => setD({ ...d, logoUrl: '' })}>Remove</Btn>}
            </div>
          )}
        </Field>
        <Field label="Order" hint="Lower numbers come first in brand lists; equal numbers sort by name.">{(id, db) => <input id={id} type="number" value={d.sort} onChange={(e) => setD({ ...d, sort: e.target.value })} aria-describedby={db} className={`${inputCls} tnum !w-28`} />}</Field>
      </form>
    </Modal>
  );
}

export function Brands() {
  const toast = useToast();
  const { data: brands, error, loading, reload } = useAsync(() => get<Brand[]>('/brands'), []);
  const [editing, setEditing] = useState<Brand | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Brand | null>(null);
  const close = useCallback(() => setEditing(null), []);
  const remove = async () => {
    if (!deleting) return;
    try {
      await api('DELETE', `/brands/${deleting.id}`);
      toast('Brand deleted');
      setDeleting(null);
      reload();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not delete.', 'error');
    }
  };
  return (
    <>
      <PageHead title="Brands" sub="Each brand with published products gets its own collection page on the store." actions={<Btn onClick={() => setEditing('new')}>Add a brand</Btn>} />
      {error ? <ErrorNote message={error} retry={reload} /> : loading && !brands ? <Loading /> : brands && brands.length === 0 ? (
        <Empty title="No brands yet" body="Add the brands you sell. Brands are also created automatically when you import products with a brand column." action={<Btn onClick={() => setEditing('new')}>Add a brand</Btn>} />
      ) : brands && (
        <Table label="Brands">
          <thead><tr><th>Brand</th><th>Store page</th><th className="!text-right">Products</th><th className="!text-right">Published</th><th><span className="sr-only">Actions</span></th></tr></thead>
          <tbody className="tnum">
            {brands.map((b) => (
              <tr key={b.id} className="hover:bg-ivory/50">
                <td><span className="font-medium">{b.name}</span>{b.description && <span className="block max-w-[420px] truncate text-[0.8rem] text-stone">{b.description}</span>}</td>
                <td>{b.published ? <a href={`/brands/${b.slug}`} target="_blank" rel="noopener" className="text-forest underline underline-offset-4">/brands/{b.slug}</a> : <span className="text-stone">Hidden until a product is published</span>}</td>
                <td className="text-right">{int(b.products)}</td>
                <td className="text-right">{int(b.published)}</td>
                <td className="whitespace-nowrap text-right">
                  <Btn size="sm" variant="ghost" onClick={() => setEditing(b)} aria-label={`Edit ${b.name}`}>Edit</Btn>
                  <Btn size="sm" variant="ghost" onClick={() => setDeleting(b)} aria-label={`Delete ${b.name}`} className="!text-danger">Delete</Btn>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      {editing && <BrandForm brand={editing === 'new' ? null : editing} onClose={close} onSaved={() => { setEditing(null); reload(); }} />}
      <Confirm open={!!deleting} title={`Delete ${deleting?.name ?? 'brand'}?`} onClose={() => setDeleting(null)} onConfirm={remove}
        body={deleting && <p>{deleting.products ? `Its ${int(deleting.products)} products stay in the catalogue without a brand.` : 'No products use it.'} Its collection page disappears from the store.</p>} />
    </>
  );
}
