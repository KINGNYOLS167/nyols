// Small UI kit for the dashboard: buttons, fields, dialogs, toasts, tables, tiles.
import { createContext, useCallback, useContext, useEffect, useId, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger'; size?: 'sm' | 'md' };

/** Button styling, also used on links that act as buttons (exports, navigation). */
export function btnCls(variant: NonNullable<BtnProps['variant']> = 'primary', size: NonNullable<BtnProps['size']> = 'md') {
  const v = {
    primary: 'bg-forest text-ivory hover:bg-pine',
    secondary: 'border border-forest/35 text-forest hover:border-forest hover:bg-forest/5',
    ghost: 'text-forest hover:bg-forest/8',
    danger: 'bg-danger text-white hover:bg-[#7f2f22]',
  }[variant];
  const s = size === 'sm' ? 'min-h-9 px-3 text-[0.85rem]' : 'min-h-11 px-4 text-[0.92rem]';
  return `inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[3px] font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 ${v} ${s}`;
}

export function Btn({ variant = 'primary', size = 'md', className = '', type = 'button', ...rest }: BtnProps) {
  return <button type={type} className={`${btnCls(variant, size)} ${className}`} {...rest} />;
}

export const inputCls = 'w-full min-h-11 rounded-[3px] border border-charcoal/20 bg-white px-3 text-[0.95rem] text-charcoal placeholder:text-stone/60 focus:border-forest focus:outline-2 focus:outline-offset-0 focus:outline-forest/30 aria-[invalid=true]:border-danger';

export function Field({ label, hint, error, children, className = '' }: { label: string; hint?: string; error?: string; children: (id: string, describedBy?: string) => ReactNode; className?: string }) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errId = error ? `${id}-err` : undefined;
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-[0.85rem] font-medium text-charcoal">{label}</label>
      {children(id, [hintId, errId].filter(Boolean).join(' ') || undefined)}
      {hint && !error && <p id={hintId} className="mt-1.5 text-[0.8rem] text-stone">{hint}</p>}
      {error && <p id={errId} className="mt-1.5 text-[0.8rem] text-danger">{error}</p>}
    </div>
  );
}

/** Rupiah amount with thousands separators as you type. Empty means "no value". */
export function MoneyInput({ id, value, onChange, describedBy, invalid, placeholder, required }: { id: string; value: number | null; onChange: (n: number | null) => void; describedBy?: string; invalid?: boolean; placeholder?: string; required?: boolean }) {
  const fmt = (n: number | null) => (n === null ? '' : new Intl.NumberFormat('id-ID').format(n));
  const [text, setText] = useState(fmt(value));
  useEffect(() => setText(fmt(value)), [value]);
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[0.9rem] text-stone">Rp</span>
      <input
        id={id}
        inputMode="numeric"
        value={text}
        required={required}
        placeholder={placeholder}
        aria-describedby={describedBy}
        aria-invalid={invalid || undefined}
        onChange={(e) => {
          const digits = e.target.value.replace(/[^\d]/g, '');
          const n = digits === '' ? null : Number(digits);
          setText(n === null ? '' : fmt(n));
          onChange(n);
        }}
        className={`${inputCls} tnum pl-10`}
      />
    </div>
  );
}

export function Modal({ open, title, onClose, children, footer, wide = false }: { open: boolean; title: string; onClose: () => void; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  useEffect(() => {
    const d = ref.current;
    d?.addEventListener('close', onClose);
    return () => d?.removeEventListener('close', onClose);
  }, [onClose]);
  return (
    <dialog ref={ref} aria-label={title} className={`sheet m-auto max-h-[92dvh] w-[calc(100vw-24px)] overflow-hidden rounded-[4px] bg-ivory p-0 text-charcoal ${wide ? 'max-w-[980px]' : 'max-w-[620px]'}`}>
      {open && (
        <div className="flex max-h-[92dvh] flex-col">
          <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-4 sm:px-6">
            <h2 className="text-[1.15rem] font-medium">{title}</h2>
            <button type="button" onClick={() => ref.current?.close()} aria-label="Close" className="-mr-2 flex h-10 w-10 items-center justify-center rounded-full hover:bg-ivory-2">
              <svg viewBox="0 0 20 20" className="h-5 w-5" aria-hidden><path d="M4 4l12 12M16 4L4 16" stroke="currentColor" strokeWidth="1.5" /></svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
          {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-line bg-white/60 px-5 py-4 sm:px-6">{footer}</div>}
        </div>
      )}
    </dialog>
  );
}

/** A delete confirmation that names exactly what will be removed. */
export function Confirm({ open, title, body, action = 'Delete', onConfirm, onClose, busy }: { open: boolean; title: string; body: ReactNode; action?: string; onConfirm: () => void; onClose: () => void; busy?: boolean }) {
  return (
    <Modal open={open} title={title} onClose={onClose} footer={<><Btn variant="secondary" onClick={onClose}>Keep it</Btn><Btn variant="danger" onClick={onConfirm} disabled={busy}>{busy ? 'Deleting…' : action}</Btn></>}>
      <div className="text-stone">{body}</div>
    </Modal>
  );
}

// ---------- toasts ----------

type Toast = { id: number; text: string; tone: 'ok' | 'error' };
const ToastCtx = createContext<(text: string, tone?: Toast['tone']) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

export function Toasts({ children }: { children: ReactNode }) {
  const [list, setList] = useState<Toast[]>([]);
  const show = useCallback((text: string, tone: Toast['tone'] = 'ok') => {
    const id = Date.now() + Math.random();
    setList((l) => [...l, { id, text, tone }]);
    window.setTimeout(() => setList((l) => l.filter((x) => x.id !== id)), tone === 'error' ? 7000 : 3500);
  }, []);
  return (
    <ToastCtx.Provider value={show}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed bottom-4 right-4 z-[200] flex w-[min(380px,calc(100vw-32px))] flex-col gap-2">
        {list.map((t) => (
          <p key={t.id} role={t.tone === 'error' ? 'alert' : 'status'} className={`pointer-events-auto rounded-[4px] px-4 py-3 text-[0.92rem] shadow-[0_12px_30px_-12px_rgb(16_43_37/0.45)] ${t.tone === 'error' ? 'bg-danger text-white' : 'bg-pine text-ivory'}`}>
            {t.text}
          </p>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

// ---------- layout pieces ----------

export function PageHead({ title, sub, actions }: { title: string; sub?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-[1.9rem] font-light tracking-[-0.02em] text-forest">{title}</h1>
        {sub && <p className="mt-1 text-[0.92rem] text-stone">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ title, actions, children, className = '' }: { title?: string; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-[4px] border border-line bg-white ${className}`}>
      {(title || actions) && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3.5">
          {title && <h2 className="font-medium">{title}</h2>}
          {actions}
        </div>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function Empty({ title, body, action }: { title: string; body?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-[4px] border border-dashed border-charcoal/20 bg-white/50 px-6 py-10">
      <p className="text-[1.1rem] font-medium">{title}</p>
      {body && <p className="max-w-[56ch] text-stone">{body}</p>}
      {action}
    </div>
  );
}

export function Loading({ label = 'Loading…' }: { label?: string }) {
  return <p className="py-10 text-stone" role="status">{label}</p>;
}

export function ErrorNote({ message, retry }: { message: string; retry?: () => void }) {
  return (
    <div role="alert" className="flex flex-wrap items-center gap-3 rounded-[4px] border border-danger/30 bg-danger/5 px-4 py-3 text-danger">
      <span>{message}</span>
      {retry && <Btn size="sm" variant="secondary" onClick={retry}>Try again</Btn>}
    </div>
  );
}

const BADGE: Record<string, string> = {
  completed: 'bg-forest/10 text-forest', shipped: 'bg-forest/10 text-forest', processing: 'bg-[#16855A]/10 text-[#0f6a47]',
  pending: 'bg-[#C9892A]/15 text-[#7a5212]', cancelled: 'bg-charcoal/8 text-stone', returned: 'bg-danger/10 text-danger',
  published: 'bg-forest/10 text-forest', draft: 'bg-charcoal/8 text-stone', ordered: 'bg-[#C9892A]/15 text-[#7a5212]', received: 'bg-forest/10 text-forest',
};
export function Badge({ value, label }: { value: string; label?: string }) {
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[0.78rem] font-medium ${BADGE[value] ?? 'bg-charcoal/8 text-stone'}`}>{label ?? value}</span>;
}

export function Table({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div className="overflow-x-auto rounded-[4px] border border-line bg-white" role="region" aria-label={label} tabIndex={0}>
      <table className="w-full min-w-[720px] border-collapse text-left text-[0.9rem] [&_td]:border-t [&_td]:border-line [&_td]:px-3 [&_td]:py-2.5 [&_th]:whitespace-nowrap [&_th]:bg-ivory/60 [&_th]:px-3 [&_th]:py-2.5 [&_th]:text-[0.8rem] [&_th]:font-medium [&_th]:text-stone">
        {children}
      </table>
    </div>
  );
}

export function Select({ id, value, onChange, children, describedBy, className = '' }: { id?: string; value: string; onChange: (v: string) => void; children: ReactNode; describedBy?: string; className?: string }) {
  return <select id={id} value={value} onChange={(e) => onChange(e.target.value)} aria-describedby={describedBy} className={`${inputCls} pr-8 ${className}`}>{children}</select>;
}

/** Year + month filter row, used by sales and expenses. */
export function PeriodFilter({ year, month, years, onChange }: { year: string; month: string; years: number[]; onChange: (y: string, m: string) => void }) {
  const ys = Array.from(new Set([new Date().getFullYear(), ...years])).sort((a, b) => b - a);
  return (
    <div className="flex flex-wrap gap-2">
      <label className="sr-only" htmlFor="flt-year">Year</label>
      <Select id="flt-year" value={year} onChange={(v) => onChange(v, v ? month : '')} className="!w-auto">
        <option value="">All years</option>
        {ys.map((y) => <option key={y} value={y}>{y}</option>)}
      </Select>
      <label className="sr-only" htmlFor="flt-month">Month</label>
      <Select id="flt-month" value={month} onChange={(v) => onChange(year, v)} className="!w-auto">
        <option value="">All months</option>
        {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((m, i) => (
          <option key={m} value={i + 1} disabled={!year}>{m}</option>
        ))}
      </Select>
    </div>
  );
}

export function useAsync<T>(load: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [n, setN] = useState(0);
  useEffect(() => {
    let live = true;
    setLoading(true);
    setError('');
    load().then((d) => { if (live) setData(d); }).catch((e) => { if (live) setError(e instanceof Error ? e.message : 'Something went wrong.'); }).finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [...deps, n]); // eslint-disable-line react-hooks/exhaustive-deps
  const reload = useCallback(() => setN((x) => x + 1), []);
  return { data, error, loading, reload, setData };
}
