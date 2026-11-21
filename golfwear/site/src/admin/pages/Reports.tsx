import { useState } from 'react';
import { EXPENSE_CATEGORIES } from '../../../shared/domain';
import { EXPENSE_LABEL, get, int, MONTHS_LONG, pct, rp, type Finance, type Summary } from '../api';
import { btnCls, Card, ErrorNote, Loading, PageHead, useAsync } from '../ui';
import { YearPicker } from './Overview';

type YearRow = Finance & { year: number };

function Cells({ f }: { f: Finance }) {
  return (
    <>
      <td className="text-right">{rp(f.revenue)}</td>
      <td className="text-right">{int(f.orders)}</td>
      {EXPENSE_CATEGORIES.map((c) => <td key={c} className="text-right">{rp(f.expenses[c])}</td>)}
      <td className="text-right">{rp(f.totalExpenses)}</td>
      <td className="text-right">{rp(f.grossProfit)}</td>
      <td className={`text-right ${f.netProfit < 0 ? 'text-danger' : ''}`}>{rp(f.netProfit)}</td>
      <td className="text-right">{pct(f.grossMargin)}</td>
      <td className="text-right">{pct(f.netMargin)}</td>
    </>
  );
}

function Head({ first }: { first: string }) {
  return (
    <thead>
      <tr>
        <th>{first}</th><th className="!text-right">Revenue</th><th className="!text-right">Orders</th>
        {EXPENSE_CATEGORIES.map((c) => <th key={c} className="!text-right">{EXPENSE_LABEL[c]}</th>)}
        <th className="!text-right">Total expenses</th><th className="!text-right">Gross profit</th><th className="!text-right">Net profit</th>
        <th className="!text-right">Gross margin</th><th className="!text-right">Net margin</th>
      </tr>
    </thead>
  );
}

const tableCls = 'w-full min-w-[1100px] text-[0.85rem] [&_td]:whitespace-nowrap [&_td]:border-t [&_td]:border-line [&_td]:px-2.5 [&_td]:py-2 [&_th]:whitespace-nowrap [&_th]:px-2.5 [&_th]:py-2 [&_th]:text-left [&_th]:font-medium [&_th]:text-stone';

export function Reports() {
  const [year, setYear] = useState(new Date().getFullYear());
  const { data: s, error, loading, reload } = useAsync(() => get<Summary>(`/summary?year=${year}`), [year]);
  const { data: yearly } = useAsync(() => get<YearRow[]>('/yearly'), []);
  return (
    <>
      <PageHead title="Reports" sub="Monthly and yearly summaries, and spreadsheet exports. CSV files open in Excel, Google Sheets and Numbers." actions={s && <YearPicker year={year} years={s.years} onChange={setYear} />} />
      <Card title="Download for spreadsheets" className="mb-6">
        <div className="flex flex-wrap gap-2">
          <a href={`/api/admin/export/monthly.csv?year=${year}`} download className={btnCls()}>Monthly report {year}</a>
          <a href="/api/admin/export/yearly.csv" download className={btnCls('secondary')}>Yearly summary</a>
          <a href={`/api/admin/export/sales.csv?year=${year}`} download className={btnCls('secondary')}>Sales {year}</a>
          <a href={`/api/admin/export/expenses.csv?year=${year}`} download className={btnCls('secondary')}>Expenses {year}</a>
          <a href="/api/admin/export/inventory.csv" download className={btnCls('secondary')}>Inventory</a>
          <a href="/api/admin/export/products.csv" download className={btnCls('secondary')}>Products</a>
        </div>
      </Card>
      {error ? <ErrorNote message={error} retry={reload} /> : loading && !s ? <Loading /> : s && (
        <div className={`space-y-6 ${loading ? 'opacity-60' : ''}`}>
          <Card title={`Monthly summary, ${year}`}>
            <div className="overflow-x-auto" role="region" aria-label={`Monthly summary ${year}`} tabIndex={0}>
              <table className={tableCls}>
                <Head first="Month" />
                <tbody className="tnum">
                  {s.months.map((m) => <tr key={m.month}><td>{MONTHS_LONG[m.month - 1]}</td><Cells f={m} /></tr>)}
                  <tr className="font-medium"><td>Total {year}</td><Cells f={s.total} /></tr>
                </tbody>
              </table>
            </div>
          </Card>
          <Card title="Yearly summary">
            {!yearly ? <Loading /> : yearly.length === 0 ? <p className="text-stone">No sales or expenses recorded yet.</p> : (
              <div className="overflow-x-auto" role="region" aria-label="Yearly summary" tabIndex={0}>
                <table className={tableCls}>
                  <Head first="Year" />
                  <tbody className="tnum">{yearly.map((y) => <tr key={y.year}><td>{y.year}</td><Cells f={y} /></tr>)}</tbody>
                </table>
              </div>
            )}
          </Card>
          <p className="text-[0.82rem] text-stone">Revenue: processing, shipped and completed orders, quantity × price minus discounts. Gross profit: revenue minus product acquisition. Net profit: revenue minus all expenses. Costs are counted in the month they were paid.</p>
        </div>
      )}
    </>
  );
}
