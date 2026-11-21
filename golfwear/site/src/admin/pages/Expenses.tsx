import { useCallback, useMemo, useState, type FormEvent } from 'react';
import { EXPENSE_CATEGORIES } from '../../../shared/domain';
import { api, ApiError, dateLabel, EXPENSE_LABEL, get, rp, today, type Expense, type Product } from '../api';
import { Btn, btnCls, Confirm, Empty, ErrorNote, Field, inputCls, Loading, Modal, MoneyInput, PageHead, PeriodFilter, Select, Table, useAsync, useToast } from '../ui';
import { useYears } from './Sales';

type Draft = { date: string; category: string; description: string; amount: number | null; vendor: string; productId: string; note: string };

function ExpenseForm({ expense, products, onClose, onSaved }: { expense: Expense | null; products: Product[]; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [d, setD] = useState<Draft>(() => expense
    ? { date: expense.date, category: expense.category, description: expense.description, amount: expense.amount, vendor: expense.vendor, productId: expense.productId ? String(expense.productId) : '', note: expense.note }
    : { date: today(), category: 'acquisition', description: '', amount: null, vendor: '', productId: '', note: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }));
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    try {
      const body = { ...d, productId: d.productId ? Number(d.productId) : null };
      if (expense) await api('PUT', `/expenses/${expense.id}`, body); else await api('POST', '/expenses', body);
      toast(expense ? 'Expense updated' : 'Expense recorded');
      onSaved();
    } catch (err) {
      setErrors(err instanceof ApiError ? { [err.field ?? 'form']: err.message } : { form: 'Could not save the expense.' });
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal open title={expense ? 'Edit expense' : 'Record an expense'} onClose={onClose}
      footer={<><Btn variant="secondary" onClick={onClose}>Cancel</Btn><Btn type="submit" form="expense-form" disabled={busy}>{busy ? 'Saving…' : expense ? 'Save changes' : 'Record expense'}</Btn></>}>
      <form id="expense-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        {errors.form && <div className="sm:col-span-2"><ErrorNote message={errors.form} /></div>}
        {expense?.restockId && <p className="rounded-[3px] bg-white px-3 py-2 text-[0.85rem] text-stone sm:col-span-2">This expense was created by a restock. Editing the restock updates it too.</p>}
        <Field label="Date" error={errors.date}>{(id, db) => <input id={id} type="date" required value={d.date} onChange={(e) => set('date', e.target.value)} aria-describedby={db} className={inputCls} />}</Field>
        <Field label="Category" error={errors.category}>{(id, db) => <Select id={id} value={d.category} onChange={(v) => set('category', v)} describedBy={db}>{EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{EXPENSE_LABEL[c]}</option>)}</Select>}</Field>
        <Field label="Description" className="sm:col-span-2" error={errors.description}>{(id, db) => <input id={id} required value={d.description} onChange={(e) => set('description', e.target.value)} aria-describedby={db} className={inputCls} placeholder="e.g. 20 polos from supplier, TopAds November" />}</Field>
        <Field label="Amount" error={errors.amount}>{(id, db) => <MoneyInput id={id} value={d.amount} onChange={(v) => set('amount', v)} describedBy={db} invalid={!!errors.amount} required />}</Field>
        <Field label="Paid to">{(id) => <input id={id} value={d.vendor} onChange={(e) => set('vendor', e.target.value)} className={inputCls} placeholder="Supplier, courier, platform…" />}</Field>
        <Field label="Product (optional)" className="sm:col-span-2">
          {(id) => <Select id={id} value={d.productId} onChange={(v) => set('productId', v)}><option value="">Not tied to one product</option>{products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select>}
        </Field>
        <Field label="Note" className="sm:col-span-2">{(id) => <input id={id} value={d.note} onChange={(e) => set('note', e.target.value)} className={inputCls} />}</Field>
      </form>
    </Modal>
  );
}

export function Expenses() {
  const toast = useToast();
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [month, setMonth] = useState('');
  const [category, setCategory] = useState('');
  const query = new URLSearchParams(Object.entries({ year, month, category }).filter(([, v]) => v)).toString();
  const { data: rows, error, loading, reload } = useAsync(() => get<Expense[]>(`/expenses?${query}`), [query]);
  const { data: products } = useAsync(() => get<Product[]>('/products'), []);
  const years = useYears();
  const [editing, setEditing] = useState<Expense | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Expense | null>(null);
  const [busy, setBusy] = useState(false);
  const close = useCallback(() => setEditing(null), []);
  const byCat = useMemo(() => EXPENSE_CATEGORIES.map((c) => ({ c, sum: (rows ?? []).filter((e) => e.category === c).reduce((n, e) => n + e.amount, 0) })), [rows]);
  const total = byCat.reduce((n, x) => n + x.sum, 0);

  const remove = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      await api('DELETE', `/expenses/${deleting.id}`);
      toast('Expense deleted');
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
      <PageHead title="Expenses" sub="Product purchases, shipping, running costs and marketing." actions={<>
        <a href={`/api/admin/export/expenses.csv?${query}`} download className={btnCls('secondary')}>Export CSV</a>
        <Btn onClick={() => setEditing('new')}>Record an expense</Btn>
      </>} />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <PeriodFilter year={year} month={month} years={years} onChange={(y, m) => { setYear(y); setMonth(m); }} />
        <label className="sr-only" htmlFor="flt-cat">Category</label>
        <Select id="flt-cat" value={category} onChange={setCategory} className="!w-auto">
          <option value="">All categories</option>
          {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{EXPENSE_LABEL[c]}</option>)}
        </Select>
      </div>
      {error ? <ErrorNote message={error} retry={reload} /> : loading && !rows ? <Loading /> : rows && rows.length === 0 ? (
        <Empty title="No expenses in this period" body="Record what you spend: stock purchases (product acquisition), courier and shipping costs, ads, packaging and other running costs." action={<Btn onClick={() => setEditing('new')}>Record an expense</Btn>} />
      ) : rows && (
        <div className={loading ? 'opacity-60' : ''}>
          <dl className="tnum mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <div className="rounded-[4px] border border-line bg-white px-4 py-3"><dt className="text-[0.8rem] text-stone">Total</dt><dd className="font-medium">{rp(total)}</dd></div>
            {byCat.map(({ c, sum }) => <div key={c} className="rounded-[4px] border border-line bg-white px-4 py-3"><dt className="text-[0.8rem] text-stone">{EXPENSE_LABEL[c]}</dt><dd>{rp(sum)}</dd></div>)}
          </dl>
          <Table label="Expenses">
            <thead><tr><th>Date</th><th>Category</th><th>Description</th><th>Paid to</th><th className="!text-right">Amount</th><th><span className="sr-only">Actions</span></th></tr></thead>
            <tbody className="tnum">
              {rows.map((e) => (
                <tr key={e.id} className="hover:bg-ivory/50">
                  <td className="whitespace-nowrap">{dateLabel(e.date)}</td>
                  <td>{EXPENSE_LABEL[e.category] ?? e.category}</td>
                  <td><span className="block max-w-[320px] truncate">{e.description}</span>{e.productName && <span className="text-[0.8rem] text-stone">{e.productName}</span>}</td>
                  <td className="text-stone">{e.vendor || '—'}</td>
                  <td className="text-right">{rp(e.amount)}</td>
                  <td className="whitespace-nowrap text-right">
                    <Btn size="sm" variant="ghost" onClick={() => setEditing(e)} aria-label={`Edit expense ${e.description}`}>Edit</Btn>
                    <Btn size="sm" variant="ghost" onClick={() => setDeleting(e)} aria-label={`Delete expense ${e.description}`} className="!text-danger">Delete</Btn>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      )}
      {editing && <ExpenseForm expense={editing === 'new' ? null : editing} products={products ?? []} onClose={close} onSaved={() => { setEditing(null); reload(); }} />}
      <Confirm open={!!deleting} title="Delete this expense?" busy={busy} onClose={() => setDeleting(null)} onConfirm={remove}
        body={deleting && <p>{deleting.description}, {rp(deleting.amount)} on {dateLabel(deleting.date)}.{deleting.restockId ? ' The restock that created it stays, without a cost entry.' : ''}</p>} />
    </>
  );
}
