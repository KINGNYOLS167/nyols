// Dashboard charts. Colours were checked with the dataviz palette validator against the white
// card surface: revenue #16855A / expenses #C9892A pass the CVD gates (the gold sits at 2.96:1, so
// every chart ships with a table view); profit/loss green/clay are told apart by direction too.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { MONTHS, MONTHS_LONG, rp, rpCompact, type Finance } from './api';

export const C = { revenue: '#16855A', expenses: '#C9892A', profit: '#16855A', loss: '#C4553A', grid: '#E6E3DA', axis: '#C9C5B8', muted: '#6B6F69' };

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.floor(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

/** Clean axis ticks: 0 .. max in 4-5 round steps. */
function ticks(max: number, min = 0) {
  const span = Math.max(1, max - min);
  const raw = span / 4;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => span / s <= 5) ?? raw;
  const out: number[] = [];
  for (let v = Math.floor(min / step) * step; v <= max + step * 0.001; v += step) out.push(Math.round(v));
  if (out[out.length - 1] < max) out.push(out[out.length - 1] + step);
  return out;
}

/** A bar with a 4px rounded data-end and a square base. `up` = grows upward from the baseline. */
function bar(x: number, base: number, end: number, w: number) {
  if (Math.abs(base - end) < 0.01) return '';
  // A non-zero value always shows: at least 2px, so a small loss isn't invisible.
  if (Math.abs(base - end) < 2) end = base + (end < base ? -2 : 2);
  const up = end < base;
  const h = Math.abs(base - end);
  const r = Math.min(4, h, w / 2);
  return up
    ? `M${x},${base}V${end + r}Q${x},${end} ${x + r},${end}H${x + w - r}Q${x + w},${end} ${x + w},${end + r}V${base}Z`
    : `M${x},${base}V${end - r}Q${x},${end} ${x + r},${end}H${x + w - r}Q${x + w},${end} ${x + w},${end - r}V${base}Z`;
}

function Tip({ x, y, width, children }: { x: number; y: number; width: number; children: ReactNode }) {
  const left = Math.min(Math.max(8, x - 90), width - 188);
  return (
    <div role="presentation" className="pointer-events-none absolute z-10 w-[180px] rounded-[4px] border border-line bg-white px-3 py-2.5 text-[0.82rem] shadow-[0_10px_30px_-12px_rgb(16_43_37/0.4)]" style={{ left, top: Math.max(0, y) }}>
      {children}
    </div>
  );
}

function TipRow({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <p className="flex items-center gap-2">
      <span aria-hidden className="h-[2px] w-3 shrink-0 rounded" style={{ background: color }} />
      <span className="tnum font-medium text-charcoal">{value}</span>
      <span className="ml-auto text-stone">{label}</span>
    </p>
  );
}

export function Legend({ items }: { items: { color: string; label: string }[] }) {
  return (
    <ul className="flex flex-wrap gap-x-5 gap-y-1 text-[0.82rem] text-stone">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-2"><span aria-hidden className="h-2.5 w-2.5 rounded-[2px]" style={{ background: i.color }} />{i.label}</li>
      ))}
    </ul>
  );
}

const PAD = { top: 12, right: 8, bottom: 26, left: 64 };

/** Revenue and expenses, side by side for each month, on one rupiah axis. */
export function MonthlyColumns({ months, year }: { months: Finance[]; year: number }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const height = 260;
  const max = Math.max(1, ...months.flatMap((m) => [m.revenue, m.totalExpenses]));
  const tk = ticks(max);
  const top = tk[tk.length - 1];
  const plotW = Math.max(0, width - PAD.left - PAD.right);
  const plotH = height - PAD.top - PAD.bottom;
  const band = plotW / 12;
  const bw = Math.max(3, Math.min(24, (band - 10) / 2));
  const y = (v: number) => PAD.top + plotH - (v / top) * plotH;
  const base = y(0);
  const compactLabels = band < 34;
  return (
    <div ref={ref} className="relative">
      {width > 0 && (
        <svg width={width} height={height} role="group" aria-label={`Revenue and expenses by month, ${year}. The table below lists every value.`}>
          {tk.map((v) => (
            <g key={v}>
              <line x1={PAD.left} x2={width - PAD.right} y1={y(v)} y2={y(v)} stroke={v === 0 ? C.axis : C.grid} strokeWidth="1" shapeRendering="crispEdges" />
              <text x={PAD.left - 8} y={y(v)} dy="0.32em" textAnchor="end" fontSize="11" fill={C.muted} className="tnum">{v === 0 ? '0' : rpCompact(v)}</text>
            </g>
          ))}
          {months.map((m, i) => {
            const cx = PAD.left + band * i + band / 2;
            const active = hover === i;
            return (
              <g key={m.month} opacity={hover === null || active ? 1 : 0.45}>
                <path d={bar(cx - bw - 1, base, y(m.revenue), bw)} fill={C.revenue} />
                <path d={bar(cx + 1, base, y(m.totalExpenses), bw)} fill={C.expenses} />
                <text x={cx} y={height - 8} textAnchor="middle" fontSize="11" fill={C.muted}>{compactLabels ? MONTHS[i][0] : MONTHS[i]}</text>
                <rect
                  x={PAD.left + band * i} y={PAD.top} width={band} height={plotH} fill="transparent" tabIndex={0} role="img"
                  aria-label={`${MONTHS_LONG[i]} ${year}: revenue ${rp(m.revenue)}, expenses ${rp(m.totalExpenses)}, net profit ${rp(m.netProfit)}`}
                  onPointerEnter={() => setHover(i)} onPointerLeave={() => setHover(null)} onFocus={() => setHover(i)} onBlur={() => setHover(null)}
                  className="outline-none focus-visible:stroke-forest focus-visible:[stroke-width:1.5]"
                />
              </g>
            );
          })}
        </svg>
      )}
      {hover !== null && (
        <Tip x={PAD.left + band * hover + band / 2} y={8} width={width}>
          <p className="mb-1 font-medium">{MONTHS_LONG[hover]} {year}</p>
          <TipRow color={C.revenue} label="Revenue" value={rp(months[hover].revenue)} />
          <TipRow color={C.expenses} label="Expenses" value={rp(months[hover].totalExpenses)} />
          <p className="mt-1 border-t border-line pt-1 text-stone">Net <span className="tnum font-medium text-charcoal">{rp(months[hover].netProfit)}</span></p>
        </Tip>
      )}
    </div>
  );
}

/** Net profit per month: above the line is profit, below is loss. */
export function NetProfitColumns({ months, year }: { months: Finance[]; year: number }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const height = 200;
  const hi = Math.max(0, ...months.map((m) => m.netProfit));
  const lo = Math.min(0, ...months.map((m) => m.netProfit));
  const step = ticks(Math.max(hi, -lo, 1));
  const s = step[1] - step[0] || 1;
  const top = Math.ceil(hi / s) * s || (lo < 0 ? 0 : s);
  const bottom = Math.floor(lo / s) * s;
  const tk: number[] = [];
  for (let v = bottom; v <= top + 0.001; v += s) tk.push(v);
  const plotW = Math.max(0, width - PAD.left - PAD.right);
  const plotH = height - PAD.top - PAD.bottom;
  const band = plotW / 12;
  const bw = Math.max(3, Math.min(24, band - 12));
  const span = top - bottom || 1;
  const y = (v: number) => PAD.top + ((top - v) / span) * plotH;
  return (
    <div ref={ref} className="relative">
      {width > 0 && (
        <svg width={width} height={height} role="group" aria-label={`Net profit by month, ${year}. Bars above zero are profit, below are loss. The table below lists every value.`}>
          {tk.map((v) => (
            <g key={v}>
              <line x1={PAD.left} x2={width - PAD.right} y1={y(v)} y2={y(v)} stroke={v === 0 ? C.axis : C.grid} strokeWidth="1" shapeRendering="crispEdges" />
              <text x={PAD.left - 8} y={y(v)} dy="0.32em" textAnchor="end" fontSize="11" fill={C.muted} className="tnum">{v === 0 ? '0' : (v < 0 ? '−' : '') + rpCompact(Math.abs(v))}</text>
            </g>
          ))}
          {months.map((m, i) => {
            const cx = PAD.left + band * i + band / 2;
            return (
              <g key={m.month} opacity={hover === null || hover === i ? 1 : 0.45}>
                <path d={bar(cx - bw / 2, y(0), y(m.netProfit), bw)} fill={m.netProfit >= 0 ? C.profit : C.loss} />
                <text x={cx} y={height - 8} textAnchor="middle" fontSize="11" fill={C.muted}>{band < 34 ? MONTHS[i][0] : MONTHS[i]}</text>
                <rect
                  x={PAD.left + band * i} y={PAD.top} width={band} height={plotH} fill="transparent" tabIndex={0} role="img"
                  aria-label={`${MONTHS_LONG[i]} ${year}: net ${m.netProfit >= 0 ? 'profit' : 'loss'} ${rp(Math.abs(m.netProfit))}`}
                  onPointerEnter={() => setHover(i)} onPointerLeave={() => setHover(null)} onFocus={() => setHover(i)} onBlur={() => setHover(null)}
                  className="outline-none focus-visible:stroke-forest focus-visible:[stroke-width:1.5]"
                />
              </g>
            );
          })}
        </svg>
      )}
      {hover !== null && (
        <Tip x={PAD.left + band * hover + band / 2} y={8} width={width}>
          <p className="mb-1 font-medium">{MONTHS_LONG[hover]} {year}</p>
          <TipRow color={months[hover].netProfit >= 0 ? C.profit : C.loss} label={months[hover].netProfit >= 0 ? 'Profit' : 'Loss'} value={rp(months[hover].netProfit)} />
        </Tip>
      )}
    </div>
  );
}

/** One series, ranked: expenses by category with the value at each bar's tip. */
export function RankedBars({ rows, color }: { rows: { label: string; value: number }[]; color: string }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const sorted = rows.filter((r) => r.value > 0).sort((a, b) => b.value - a.value);
  const max = Math.max(1, ...sorted.map((r) => r.value));
  const labelW = Math.min(150, width * 0.38);
  const valueW = 96;
  const plotW = Math.max(0, width - labelW - valueW);
  const row = 34;
  return (
    <div ref={ref}>
      {width > 0 && sorted.length > 0 && (
        <svg width={width} height={sorted.length * row} role="img" aria-label={`Expenses by category: ${sorted.map((r) => `${r.label} ${rp(r.value)}`).join(', ')}`}>
          {sorted.map((r, i) => {
            const w = Math.max(2, (r.value / max) * plotW);
            const rr = Math.min(4, w / 2);
            const yy = i * row + (row - 14) / 2;
            return (
              <g key={r.label}>
                <text x={0} y={yy + 7} dy="0.32em" fontSize="12.5" fill="#222522">{r.label}</text>
                <path d={`M${labelW},${yy}H${labelW + w - rr}Q${labelW + w},${yy} ${labelW + w},${yy + rr}V${yy + 14 - rr}Q${labelW + w},${yy + 14} ${labelW + w - rr},${yy + 14}H${labelW}Z`} fill={color} />
                <text x={labelW + w + 8} y={yy + 7} dy="0.32em" fontSize="12" fill={C.muted} className="tnum">{rpCompact(r.value)}</text>
              </g>
            );
          })}
        </svg>
      )}
    </div>
  );
}
