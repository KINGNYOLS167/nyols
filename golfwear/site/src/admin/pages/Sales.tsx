import { useCallback, useMemo, useState, type FormEvent } from 'react';
import { REVENUE_STATUSES, SALE_STATUSES } from '../../../shared/domain';
import { api, ApiError, dateLabel, get, int, rp, STATUS_LABEL, today, type Product, type Sale, type Summary } from '../api';
import { Badge, Btn, btnCls, Confirm, Empty, ErrorNote, Field, inputCls, Loading, Modal, MoneyInput, PageHead, PeriodFilter, Select, Table, useAsync, useToast } from '../ui';

export function useYears() {
  const { data } = useAsync(() => get<Summary>('/summary'), []);
  return data?.years ?? [];
}

export const effective = (p: Product) => (p.salePrice !== null && p.salePrice > 0 && p.salePrice < p.price ? p.salePrice : p.price);

type Draft = {
  orderDate: string; productId: string; productName: string; brand: string; size: string; qty: number | null; unitPrice: number | null;
  discount: number | null; status: string; marketplace: string; marketplaceRef: string; note: string; deductStock: boolean;
};

const blank = (): Draft => ({ orderDate: today(), productId: '', productName: '', brand: '', size: '', qty: 1, unitPrice: null, discount: null, status: 'completed', marketplace: 'Tokopedia', marketplaceRef: '', note: '', deductStock: true });

function SaleForm({ sale, products, onClose, onSaved }: { sale: Sale | null; products: Product[]; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [d, setD] = useState<Draft>(() => sale ? {
    orderDate: sale.orderDate, productId: sale.productId ? String(sale.productId) : '', productName: sale.productName, brand: sale.brand, size: sale.size,
    qty: sale.qty, unitPrice: sale.unitPrice, discount: sale.discount || null, status: sale.status, marketplace: sale.marketplace,
    marketplaceRef: sale.marketplaceRef, note: sale.note, deductStock: sale.deductStock,
  } : blank());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const product = products.find((p) => String(p.id) === d.productId);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }));
  const revenue = (d.qty ?? 0) * (d.unitPrice ?? 0) - (d.discount ?? 0);

  const pick = (id: string) => {
    const p = products.find((x) => String(x.id) === id);
    setD((x) => ({ ...x, productId: id, productName: p ? p.name : x.productName, brand: p ? p.brandName ?? '' : x.brand, unitPrice: p && x.unitPrice === null ? effective(p) : x.unitPrice, size: p && !p.stock.some((s) => s.size === x.size) ? '' : x.size }));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    try {
      const body = { ...d, productId: d.productId ? Number(d.productId) : null, discount: d.discount ?? 0 };
      if (sale) await api('PUT', `/sales/${sale.id}`, body); else await api('POST', '/sales', body);
      toast(sale ? 'Sale updated' : 'Sale recorded');
      onSaved();
    } catch (err) {
      if (err instanceof ApiError) setErrors({ [err.field ?? 'form']: err.message });
      else setErrors({ form: 'Could not save the sale.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open title={sale ? 'Edit sale' : 'Record a sale'} onClose={onClose} wide
      footer={<><Btn variant="secondary" onClick={onClose}>Cancel</Btn><Btn type="submit" form="sale-form" disabled={busy}>{busy ? 'Saving…' : sale ? 'Save changes' : 'Record sale'}</Btn></>}>
      <form id="sale-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        {errors.form && <div className="sm:col-span-2"><ErrorNote message={errors.form} /></div>}
        <Field label="Order date" error={errors.orderDate}>{(id, db) => <input id={id} type="date" required value={d.orderDate} onChange={(e) => set('orderDate', e.target.value)} aria-describedby={db} className={inputCls} />}</Field>
        <Field label="Status" hint="Processing, shipped and completed orders count as revenue." error={errors.status}>
          {(id, db) => <Select id={id} value={d.status} onChange={(v) => set('status', v)} describedBy={db}>{SALE_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}</Select>}
        </Field>
        <Field label="Product" className="sm:col-span-2" hint="Pick from your catalogue, or leave on 'Not in the catalogue' and type the name." error={errors.productId}>
          {(id, db) => (
            <Select id={id} value={d.productId} onChange={pick} describedBy={db}>
              <option value="">Not in the catalogue</option>
              {products.map((p) => <option key={p.id} value={p.id}>{p.name}{p.brandName ? `, ${p.brandName}` : ''}</option>)}
            </Select>
          )}
        </Field>
        {!product && (
          <>
            <Field label="Product name" error={errors.productName}>{(id, db) => <input id={id} value={d.productName} onChange={(e) => set('productName', e.target.value)} aria-describedby={db} className={inputCls} required />}</Field>
            <Field label="Brand">{(id) => <input id={id} value={d.brand} onChange={(e) => set('brand', e.target.value)} className={inputCls} />}</Field>
          </>
        )}
        <Field label="Size" error={errors.size}>
          {(id, db) => product && product.stock.length ? (
            <Select id={id} value={d.size} onChange={(v) => set('size', v)} describedBy={db}>
              <option value="">No size</option>
              {product.stock.map((s) => <option key={s.size} value={s.size}>{s.size} ({int(s.qty)} in stock)</option>)}
            </Select>
          ) : <input id={id} value={d.size} onChange={(e) => set('size', e.target.value)} aria-describedby={db} className={inputCls} placeholder="e.g. L" />}
        </Field>
        <Field label="Quantity" error={errors.qty}>{(id, db) => <input id={id} type="number" min={1} required value={d.qty ?? ''} onChange={(e) => set('qty', e.target.value === '' ? null : Number(e.target.value))} aria-describedby={db} className={`${inputCls} tnum`} />}</Field>
        <Field label="Selling price per unit" error={errors.unitPrice}>{(id, db) => <MoneyInput id={id} value={d.unitPrice} onChange={(v) => set('unitPrice', v)} describedBy={db} invalid={!!errors.unitPrice} required />}</Field>
        <Field label="Discount on this order" hint="Vouchers or price cuts you paid for." error={errors.discount}>{(id, db) => <MoneyInput id={id} value={d.discount} onChange={(v) => set('discount', v)} describedBy={db} invalid={!!errors.discount} placeholder="0" />}</Field>
        <Field label="Marketplace">{(id) => <input id={id} value={d.marketplace} onChange={(e) => set('marketplace', e.target.value)} className={inputCls} />}</Field>
        <Field label="Marketplace reference" hint="The Tokopedia invoice number, e.g. INV/20261120/…" error={errors.marketplaceRef}>{(id, db) => <input id={id} value={d.marketplaceRef} onChange={(e) => set('marketplaceRef', e.target.value)} aria-describedby={db} className={inputCls} />}</Field>
        <Field label="Note" className="sm:col-span-2">{(id) => <input id={id} value={d.note} onChange={(e) => set('note', e.target.value)} className={inputCls} />}</Field>
        {product && d.size && (
          <label className="flex items-start gap-3 sm:col-span-2">
            <input type="checkbox" checked={d.deductStock} onChange={(e) => set('deductStock', e.target.checked)} className="mt-1 h-4 w-4 accent-forest" />
            <span>Take this order out of stock<span className="block text-[0.82rem] text-stone">Cancelled and returned orders put the units back automatically.</span></span>
          </label>
        )}
        <p className="tnum rounded-[3px] bg-white px-4 py-3 sm:col-span-2">Revenue from this order: <b>{rp(Math.max(0, revenue))}</b>{!(REVENUE_STATUSES as readonly string[]).includes(d.status) && <span className="text-stone"> (not counted while {STATUS_LABEL[d.status].toLowerCase()})</span>}</p>
      </form>
    </Modal>
  );
}

export function Sales() {
  const toast = useToast();
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [month, setMonth] = useState('');
  const [status, setStatus] = useState('');
  const query = new URLSearchParams(Object.entries({ year, month, status }).filter(([, v]) => v)).toString();
  const { data: rows, error, loading, reload } = useAsync(() => get<Sale[]>(`/sales?${query}`), [query]);
  const { data: products } = useAsync(() => get<Product[]>('/products'), []);
  const years = useYears();
  const [editing, setEditing] = useState<Sale | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Sale | null>(null);
  const [busy, setBusy] = useState(false);
  const close = useCallback(() => setEditing(null), []);
  const totals = useMemo(() => {
    const counted = (rows ?? []).filter((s) => (REVENUE_STATUSES as readonly string[]).includes(s.status));
    return { revenue: counted.reduce((n, s) => n + s.revenue, 0), units: counted.reduce((n, s) => n + s.qty, 0), orders: counted.length };
  }, [rows]);

  const remove = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      await api('DELETE', `/sales/${deleting.id}`);
      toast('Sale deleted');
      setDeleting(null);
      reload();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not delete.', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHead title="Sales" sub="One row per product in each order." actions={<>
        <a href={`/api/admin/export/sales.csv?${query}`} download className={btnCls('secondary')}>Export CSV</a>
        <Btn onClick={() => setEditing('new')}>Record a sale</Btn>
      </>} />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <PeriodFilter year={year} month={month} years={years} onChange={(y, m) => { setYear(y); setMonth(m); }} />
        <label className="sr-only" htmlFor="flt-status">Status</label>
        <Select id="flt-status" value={status} onChange={setStatus} className="!w-auto">
          <option value="">All statuses</option>
          {SALE_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
        </Select>
      </div>
      {error ? <ErrorNote message={error} retry={reload} /> : loading && !rows ? <Loading /> : rows && rows.length === 0 ? (
        <Empty title="No sales in this period" body="Record each Tokopedia order as it comes in. Revenue and profit on the overview are calculated from these rows." action={<Btn onClick={() => setEditing('new')}>Record a sale</Btn>} />
      ) : rows && (
        <div className={loading ? 'opacity-60' : ''}>
          <p className="tnum mb-3 text-[0.9rem] text-stone">Revenue {rp(totals.revenue)} from {int(totals.orders)} counted rows, {int(totals.units)} units. {rows.length} rows shown.</p>
          <Table label="Sales">
            <thead><tr><th>Date</th><th>Product</th><th>Size</th><th className="!text-right">Qty</th><th className="!text-right">Price</th><th className="!text-right">Discount</th><th className="!text-right">Revenue</th><th>Status</th><th>Reference</th><th><span className="sr-only">Actions</span></th></tr></thead>
            <tbody className="tnum">
              {rows.map((s) => (
                <tr key={s.id} className="hover:bg-ivory/50">
                  <td className="whitespace-nowrap">{dateLabel(s.orderDate)}</td>
                  <td><span className="block max-w-[260px] truncate">{s.productName}</span>{s.brand && <span className="text-[0.8rem] text-stone">{s.brand}</span>}</td>
                  <td>{s.size || '—'}</td>
                  <td className="text-right">{int(s.qty)}</td>
                  <td className="text-right">{rp(s.unitPrice)}</td>
                  <td className="text-right">{s.discount ? rp(s.discount) : '—'}</td>
                  <td className={`text-right ${(REVENUE_STATUSES as readonly string[]).includes(s.status) ? '' : 'text-stone line-through'}`}>{rp(s.revenue)}</td>
                  <td><Badge value={s.status} label={STATUS_LABEL[s.status]} /></td>
                  <td className="max-w-[160px] truncate text-stone">{[s.marketplace, s.marketplaceRef].filter(Boolean).join(' ')}</td>
                  <td className="whitespace-nowrap text-right">
                    <Btn size="sm" variant="ghost" onClick={() => setEditing(s)} aria-label={`Edit sale of ${s.productName} on ${dateLabel(s.orderDate)}`}>Edit</Btn>
                    <Btn size="sm" variant="ghost" onClick={() => setDeleting(s)} aria-label={`Delete sale of ${s.productName} on ${dateLabel(s.orderDate)}`} className="!text-danger">Delete</Btn>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      )}
      {editing && <SaleForm sale={editing === 'new' ? null : editing} products={products ?? []} onClose={close} onSaved={() => { setEditing(null); reload(); }} />}
      <Confirm open={!!deleting} title="Delete this sale?" busy={busy} onClose={() => setDeleting(null)} onConfirm={remove}
        body={deleting && <p>{deleting.productName}{deleting.size ? `, size ${deleting.size}` : ''}, {int(deleting.qty)} × {rp(deleting.unitPrice)} on {dateLabel(deleting.orderDate)}.{deleting.deductStock && deleting.productId && deleting.size ? ' Its units go back into stock.' : ''}</p>} />
    </>
  );
}
