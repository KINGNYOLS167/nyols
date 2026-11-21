// Small helpers shared by the API: input validation, slugs and CSV.

export class InputError extends Error {
  constructor(public field: string, message: string) {
    super(message);
  }
}

type Obj = Record<string, unknown>;

export function obj(v: unknown): Obj {
  if (!v || typeof v !== 'object' || Array.isArray(v)) throw new InputError('body', 'Expected a JSON object.');
  return v as Obj;
}

export function str(o: Obj, key: string, { max = 500, required = false, fallback = '' } = {}): string {
  const v = o[key];
  if (v === undefined || v === null || v === '') {
    if (required) throw new InputError(key, `${label(key)} is required.`);
    return fallback;
  }
  if (typeof v !== 'string' && typeof v !== 'number') throw new InputError(key, `${label(key)} must be text.`);
  const s = String(v).trim();
  if (required && !s) throw new InputError(key, `${label(key)} is required.`);
  if (s.length > max) throw new InputError(key, `${label(key)} must be ${max} characters or fewer.`);
  return s;
}

export function int(o: Obj, key: string, { min = 0, max = 2_000_000_000, required = false, fallback = 0 } = {}): number {
  const v = o[key];
  if (v === undefined || v === null || v === '') {
    if (required) throw new InputError(key, `${label(key)} is required.`);
    return fallback;
  }
  // Accepts 350000, "350000", "Rp350.000" and "350,000": dots and commas in text are thousands separators.
  const text = String(v).trim();
  const n =
    typeof v === 'number' ? v
    : /^-?\d{1,3}([.,]\d{3})+$/.test(text) ? Number(text.replace(/[.,]/g, ''))
    : /^-?\d+(\.\d+)?$/.test(text) ? Number(text)
    : Number(text.replace(/[^\d-]/g, '') || 'x');
  if (!Number.isFinite(n) || !Number.isInteger(Math.round(n))) throw new InputError(key, `${label(key)} must be a whole number.`);
  const r = Math.round(n);
  if (r < min || r > max) throw new InputError(key, `${label(key)} must be between ${min} and ${max}.`);
  return r;
}

export function optInt(o: Obj, key: string, opts: { min?: number; max?: number } = {}): number | null {
  const v = o[key];
  if (v === undefined || v === null || v === '') return null;
  return int(o, key, opts);
}

export function bool(o: Obj, key: string, fallback = false): boolean {
  const v = o[key];
  if (v === undefined || v === null || v === '') return fallback;
  if (typeof v === 'boolean') return v;
  return ['1', 'true', 'yes', 'y', 'ya', 'on'].includes(String(v).trim().toLowerCase());
}

export function oneOf<T extends string>(o: Obj, key: string, allowed: readonly T[], fallback?: T): T {
  const v = o[key];
  if ((v === undefined || v === null || v === '') && fallback !== undefined) return fallback;
  const s = String(v ?? '').trim();
  if (!(allowed as readonly string[]).includes(s)) throw new InputError(key, `${label(key)} must be one of: ${allowed.join(', ')}.`);
  return s as T;
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;
export function date(o: Obj, key: string, { required = true } = {}): string | null {
  const v = o[key];
  if (v === undefined || v === null || v === '') {
    if (required) throw new InputError(key, `${label(key)} is required.`);
    return null;
  }
  const s = String(v).trim();
  if (!DATE.test(s) || Number.isNaN(Date.parse(s + 'T00:00:00Z'))) throw new InputError(key, `${label(key)} must be a date (YYYY-MM-DD).`);
  return s;
}

export function strList(v: unknown, { max = 60, maxLen = 400 } = {}): string[] {
  const list = Array.isArray(v) ? v : typeof v === 'string' ? v.split(/[|\n]/) : [];
  return list.map((x) => String(x ?? '').trim()).filter(Boolean).slice(0, max).map((x) => x.slice(0, maxLen));
}

function label(key: string) {
  const s = key.replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2');
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

export function slugify(s: string) {
  return (
    s
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/&/g, ' and ')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || 'item'
  );
}

export const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,24}$/;

// ---------- CSV ----------

function cell(v: unknown): string {
  if (v === null || v === undefined) return '';
  const s = typeof v === 'string' ? v : String(v);
  // Neutralise spreadsheet formulas in text cells (CSV injection), keep numbers as they are.
  const safe = typeof v === 'string' && /^[=+\-@\t\r]/.test(s) && !/^-?\d+(\.\d+)?$/.test(s) ? `'${s}` : s;
  return /[",\n\r;]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/** CSV with a UTF-8 byte order mark so Excel opens Indonesian text correctly. */
export function toCsv(header: string[], rows: unknown[][]): string {
  return '\ufeff' + [header, ...rows].map((r) => r.map(cell).join(',')).join('\r\n') + '\r\n';
}
