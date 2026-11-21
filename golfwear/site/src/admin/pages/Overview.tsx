import { useState } from 'react';
import { Link } from '../../lib/router';
import { EXPENSE_LABEL, get, int, MONTHS_LONG, pct, rp, type Summary } from '../api';
import { C, Legend, MonthlyColumns, NetProfitColumns, RankedBars } from '../charts';
import { btnCls, Card, Empty, ErrorNote, Loading, PageHead, Select, useAsync } from '../ui';

export function YearPicker({ year, years, onChange }: { year: number; years: number[]; onChange: (y: number) => void }) {
  const list = Array.from(new Set([new Date().getFullYear(), year, ...years])).sort((a, b) => b - a);
  return (
    <label className="flex items-center gap-2 text-[0.88rem] text-stone">
      Year
      <Select value={String(year)} onChange={(v) => onChange(Number(v))} className="!w-auto">
        {list.map((y) => <option key={y} value={y}>{y}</option>)}
      </Select>
    </label>
  );
}

function Tile({ label, value, sub, hero }: { label: string; value: string; sub?: string; hero?: boolean }) {
  return (
    <div className={`rounded-[4px] border border-line bg-white p-5 ${hero ? 'sm:col-span-2 lg:col-span-1 lg:row-span-2 flex flex-col justify-between' : ''}`}>
      <p className="text-[0.85rem] text-stone">{label}</p>
      <p className={`mt-2 whitespace-nowrap font-normal tracking-[-0.02em] text-charcoal ${hero ? 'text-[clamp(2rem,1.2rem+1.6vw,2.9rem)] leading-none' : 'text-[1.6rem] leading-tight'}`}>{value}</p>
      {sub && <p className="mt-2 text-[0.82rem] text-stone">{sub}</p>}
    </div>
  );
}

export function MonthlyTable({ s }: { s: Summary }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-[0.86rem] [&_td]:whitespace-nowrap [&_td]:border-t [&_td]:border-line [&_td]:px-2 [&_td]:py-2 [&_th]:px-2 [&_th]:py-2 [&_th]:text-left [&_th]:font-medium [&_th]:text-stone">
        <thead><tr><th>Month</th><th className="!text-right">Revenue</th><th className="!text-right">Expenses</th><th className="!text-right">Gross profit</th><th className="!text-right">Net profit</th><th className="!text-right">Net margin</th></tr></thead>
        <tbody className="tnum">
          {s.months.map((m) => (
            <tr key={m.month}>
              <td>{MONTHS_LONG[m.month - 1]}</td>
              <td className="text-right">{rp(m.revenue)}</td>
              <td className="text-right">{rp(m.totalExpenses)}</td>
              <td className="text-right">{rp(m.grossProfit)}</td>
              <td className={`text-right ${m.netProfit < 0 ? 'text-danger' : ''}`}>{rp(m.netProfit)}</td>
              <td className="text-right">{pct(m.netMargin)}</td>
            </tr>
          ))}
          <tr className="font-medium">
            <td>Total {s.year}</td>
            <td className="text-right">{rp(s.total.revenue)}</td>
            <td className="text-right">{rp(s.total.totalExpenses)}</td>
            <td className="text-right">{rp(s.total.grossProfit)}</td>
            <td className={`text-right ${s.total.netProfit < 0 ? 'text-danger' : ''}`}>{rp(s.total.netProfit)}</td>
            <td className="text-right">{pct(s.total.netMargin)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export function Overview() {
  const [year, setYear] = useState(new Date().getFullYear());
  const { data: s, error, loading, reload } = useAsync(() => get<Summary>(`/summary?year=${year}`), [year]);
  const empty = s && s.total.revenue === 0 && s.total.totalExpenses === 0 && s.total.orders === 0 && s.total.pending === 0;
  return (
    <>
      <PageHead
        title="Overview"
        sub="Figures come only from the sales and expenses recorded here."
        actions={s && <YearPicker year={year} years={s.years} onChange={setYear} />}
      />
      {error ? <ErrorNote message={error} retry={reload} /> : loading && !s ? <Loading /> : s && (
        <div className={`space-y-6 transition-opacity ${loading ? 'opacity-60' : ''}`}>
          {(s.counts.pending > 0 || s.counts.lowStock > 0 || s.counts.outOfStock > 0 || s.counts.onOrder > 0) && (
            <ul className="flex flex-wrap gap-2 text-[0.88rem]">
              {s.counts.pending > 0 && <li><Link to="/admin/sales" className="inline-flex rounded-full border border-[#C9892A]/40 bg-[#C9892A]/10 px-3 py-1.5 text-[#7a5212]">{int(s.counts.pending)} pending {s.counts.pending === 1 ? 'order' : 'orders'}</Link></li>}
              {s.counts.outOfStock > 0 && <li><Link to="/admin/inventory" className="inline-flex rounded-full border border-danger/30 bg-danger/5 px-3 py-1.5 text-danger">{int(s.counts.outOfStock)} {s.counts.outOfStock === 1 ? 'size' : 'sizes'} out of stock</Link></li>}
              {s.counts.lowStock > 0 && <li><Link to="/admin/inventory" className="inline-flex rounded-full border border-line bg-white px-3 py-1.5 text-charcoal">{int(s.counts.lowStock)} {s.counts.lowStock === 1 ? 'size' : 'sizes'} running low</Link></li>}
              {s.counts.onOrder > 0 && <li><Link to="/admin/inventory" className="inline-flex rounded-full border border-line bg-white px-3 py-1.5 text-charcoal">{int(s.counts.onOrder)} {s.counts.onOrder === 1 ? 'restock' : 'restocks'} on order</Link></li>}
            </ul>
          )}
          {empty ? (
            <Empty
              title={`Nothing recorded for ${year} yet`}
              body="Add sales as orders come in from Tokopedia, and expenses as you pay them. Revenue, profit and margins are worked out from those entries."
              action={<div className="flex flex-wrap gap-2"><Link to="/admin/sales" className={btnCls()}>Go to sales</Link><Link to="/admin/expenses" className={btnCls('secondary')}>Go to expenses</Link></div>}
            />
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Tile hero label={`Net profit, ${year}`} value={rp(s.total.netProfit)} sub={`Net margin ${pct(s.total.netMargin)}`} />
                <Tile label="Revenue" value={rp(s.total.revenue)} sub={`${int(s.total.orders)} orders, ${int(s.total.units)} units`} />
                <Tile label="Total expenses" value={rp(s.total.totalExpenses)} sub={`Product acquisition ${rp(s.total.expenses.acquisition)}`} />
                <Tile label="Gross profit" value={rp(s.total.grossProfit)} sub={`Gross margin ${pct(s.total.grossMargin)}`} />
                <Tile label="Discounts given" value={rp(s.total.discounts)} />
                <Tile label="Pending orders (not yet revenue)" value={rp(s.total.pending)} />
              </div>
              <Card title="Revenue and expenses by month" actions={<Legend items={[{ color: C.revenue, label: 'Revenue' }, { color: C.expenses, label: 'Expenses' }]} />}>
                <MonthlyColumns months={s.months} year={year} />
                <details className="mt-4 border-t border-line pt-3">
                  <summary className="cursor-pointer text-[0.88rem] font-medium text-forest">Show as a table</summary>
                  <div className="mt-3"><MonthlyTable s={s} /></div>
                </details>
              </Card>
              <div className="grid gap-6 lg:grid-cols-2">
                <Card title="Net profit by month" actions={<Legend items={[{ color: C.profit, label: 'Profit' }, { color: C.loss, label: 'Loss' }]} />}>
                  <NetProfitColumns months={s.months} year={year} />
                </Card>
                <Card title="Expenses by category">
                  {s.total.totalExpenses > 0 ? (
                    <RankedBars color={C.expenses} rows={Object.entries(s.total.expenses).map(([k, v]) => ({ label: EXPENSE_LABEL[k] ?? k, value: v }))} />
                  ) : <p className="text-stone">No expenses recorded for {year}.</p>}
                </Card>
              </div>
              <Card title={`Top products by revenue, ${year}`}>
                {s.top.length ? (
                  <table className="w-full text-[0.9rem] [&_td]:border-t [&_td]:border-line [&_td]:py-2.5 [&_th]:pb-2 [&_th]:text-left [&_th]:font-medium [&_th]:text-stone">
                    <thead><tr><th>Product</th><th className="!text-right">Units</th><th className="!text-right">Revenue</th></tr></thead>
                    <tbody className="tnum">
                      {s.top.map((p) => (
                        <tr key={p.name + p.brand}><td>{p.name}{p.brand && <span className="text-stone">, {p.brand}</span>}</td><td className="text-right">{int(p.units)}</td><td className="text-right">{rp(p.revenue)}</td></tr>
                      ))}
                    </tbody>
                  </table>
                ) : <p className="text-stone">No completed sales in {year}.</p>}
              </Card>
              <p className="text-[0.82rem] text-stone">
                Revenue counts orders marked processing, shipped or completed (quantity × price, minus discounts). Gross profit is revenue minus product acquisition costs; net profit is revenue minus all expenses.
              </p>
            </>
          )}
        </div>
      )}
    </>
  );
}
