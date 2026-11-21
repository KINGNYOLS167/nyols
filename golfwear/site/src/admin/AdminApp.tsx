// The private business dashboard at /admin. Customers never see a link to it; every request
// behind it needs the owner's session, and the page itself is noindex.
import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Link, match, RouterProvider, useRouter } from '../lib/router';
import { Logo } from '../components/Logo';
import { api, ApiError, setUnauthorizedHandler } from './api';
import { Btn, Field, inputCls, Toasts } from './ui';
import { Overview } from './pages/Overview';
import { Sales } from './pages/Sales';
import { Expenses } from './pages/Expenses';
import { Inventory } from './pages/Inventory';
import { Products } from './pages/Products';
import { ProductEditor } from './pages/ProductEditor';
import { Brands } from './pages/Brands';
import { Reports } from './pages/Reports';
import { Subscribers } from './pages/Subscribers';
import { Settings } from './pages/Settings';

type Status = { database: string; auth: string; signedIn: boolean };

const NAV: [string, string][] = [
  ['/admin', 'Overview'],
  ['/admin/sales', 'Sales'],
  ['/admin/expenses', 'Expenses'],
  ['/admin/inventory', 'Inventory'],
  ['/admin/products', 'Products'],
  ['/admin/brands', 'Brands'],
  ['/admin/reports', 'Reports'],
  ['/admin/newsletter', 'Newsletter'],
  ['/admin/settings', 'Settings'],
];

function Setup({ status }: { status: Status }) {
  const db = status.database !== 'connected';
  return (
    <Centered>
      <h1 className="text-[1.6rem] font-light text-forest">Finish setting up the dashboard</h1>
      <p className="mt-3 text-stone">The dashboard keeps sales, expenses and stock in a database, behind a password only you know. Two things are still missing on the server:</p>
      <ol className="mt-6 space-y-4">
        <li className={db ? '' : 'opacity-50'}>
          <p className="font-medium">1. Connect a Postgres database {db ? '' : '(done)'}</p>
          {db && (
            <p className="mt-1 text-[0.92rem] text-stone">
              {status.database === 'unreachable' ? 'A database is configured but could not be reached. Check the connection string. ' : ''}
              In Vercel, open the <b>golfwear</b> project, then Storage, Create Database, Neon (free tier is enough), and connect it to the project. Vercel adds <code className="rounded bg-ivory-2 px-1">DATABASE_URL</code> for you. Then redeploy.
            </p>
          )}
        </li>
        <li className={status.auth === 'configured' ? 'opacity-50' : ''}>
          <p className="font-medium">2. Set the owner password {status.auth === 'configured' ? '(done)' : ''}</p>
          {status.auth !== 'configured' && (
            <p className="mt-1 text-[0.92rem] text-stone">
              In the project's Settings, Environment Variables, add <code className="rounded bg-ivory-2 px-1">ADMIN_PASSWORD</code> (at least 10 characters) and, optionally, a long random <code className="rounded bg-ivory-2 px-1">SESSION_SECRET</code>. Then redeploy.
            </p>
          )}
        </li>
      </ol>
      <Btn className="mt-8" variant="secondary" onClick={() => window.location.reload()}>Check again</Btn>
    </Centered>
  );
}

function Centered({ children }: { children: ReactNode }) {
  return (
    <div className="contours flex min-h-[100dvh] items-center justify-center bg-pine p-4">
      <div className="w-full max-w-[520px] rounded-[4px] bg-ivory p-7 sm:p-10">
        <Logo className="mb-8 h-7 w-auto" />
        {children}
      </div>
    </div>
  );
}

function Login({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api('POST', '/login', { password });
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not sign in.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <Centered>
      <h1 className="text-[1.6rem] font-light text-forest">Business dashboard</h1>
      <p className="mt-2 text-stone">Sales, expenses, stock and the store catalogue. For the GOLFWEAR owner only.</p>
      <form onSubmit={submit} className="mt-8 space-y-5">
        <Field label="Password" error={error}>
          {(id, d) => <input id={id} type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} aria-describedby={d} aria-invalid={!!error || undefined} className={inputCls} autoFocus />}
        </Field>
        <Btn type="submit" className="w-full" disabled={busy || !password}>{busy ? 'Signing in…' : 'Sign in'}</Btn>
      </form>
    </Centered>
  );
}

function Page() {
  const { path } = useRouter();
  let m = match('/admin/products/:id', path);
  if (m) return <ProductEditor id={m.id === 'new' ? null : Number(m.id)} />;
  switch (path) {
    case '/admin': return <Overview />;
    case '/admin/sales': return <Sales />;
    case '/admin/expenses': return <Expenses />;
    case '/admin/inventory': return <Inventory />;
    case '/admin/products': return <Products />;
    case '/admin/brands': return <Brands />;
    case '/admin/reports': return <Reports />;
    case '/admin/newsletter': return <Subscribers />;
    case '/admin/settings': return <Settings />;
  }
  return (
    <div className="py-16">
      <h1 className="text-[1.6rem] font-light text-forest">That page doesn't exist</h1>
      <Link to="/admin" className="mt-4 inline-block text-forest underline underline-offset-4">Go to the overview</Link>
    </div>
  );
}

function Shell({ onSignOut }: { onSignOut: () => void }) {
  const { path } = useRouter();
  const [menu, setMenu] = useState(false);
  useEffect(() => setMenu(false), [path]);
  useEffect(() => {
    const label = NAV.find(([to]) => to === path)?.[1] ?? (path.startsWith('/admin/products/') ? 'Product' : 'Dashboard');
    document.title = `${label} | GOLFWEAR dashboard`;
  }, [path]);
  const active = (to: string) => (to === '/admin' ? path === '/admin' : path === to || path.startsWith(to + '/'));
  const nav = (
    <nav aria-label="Dashboard" className="flex flex-col gap-0.5">
      {NAV.map(([to, label]) => (
        <Link key={to} to={to} aria-current={active(to) ? 'page' : undefined} className={`rounded-[3px] px-3 py-2.5 text-[0.95rem] transition-colors ${active(to) ? 'bg-ivory/12 text-ivory' : 'text-mist hover:bg-ivory/6 hover:text-ivory'}`}>
          {label}
        </Link>
      ))}
    </nav>
  );
  const foot = (
    <div className="flex flex-col gap-1 border-t border-line-dark pt-4 text-[0.88rem]">
      <a href="/" target="_blank" rel="noopener" className="rounded-[3px] px-3 py-2 text-mist hover:text-ivory">View the store</a>
      <button type="button" onClick={onSignOut} className="rounded-[3px] px-3 py-2 text-left text-mist hover:text-ivory">Sign out</button>
    </div>
  );
  return (
    <div className="min-h-[100dvh] bg-ivory lg:grid lg:grid-cols-[232px_1fr]">
      <aside className="sticky top-0 hidden h-[100dvh] flex-col gap-8 bg-pine p-5 text-ivory lg:flex">
        <Link to="/admin" aria-label="Dashboard home"><Logo tone="dark" className="h-6 w-auto" /></Link>
        <div className="flex-1 overflow-y-auto">{nav}</div>
        {foot}
      </aside>
      <header className="sticky top-0 z-40 flex items-center justify-between bg-pine px-4 py-3 text-ivory lg:hidden">
        <Link to="/admin" aria-label="Dashboard home"><Logo tone="dark" className="h-5 w-auto" /></Link>
        <button type="button" aria-expanded={menu} aria-controls="admin-menu" onClick={() => setMenu((x) => !x)} className="flex min-h-10 items-center gap-2 rounded-[3px] px-3 text-[0.92rem] hover:bg-ivory/8">
          {NAV.find(([to]) => active(to))?.[1] ?? 'Menu'}
          <svg viewBox="0 0 10 6" className={`h-1.5 w-2.5 transition-transform ${menu ? 'rotate-180' : ''}`} aria-hidden><path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.3" /></svg>
        </button>
      </header>
      {menu && <div id="admin-menu" className="sticky top-[60px] z-30 space-y-4 bg-pine px-4 pb-4 text-ivory lg:hidden">{nav}{foot}</div>}
      <main className="min-w-0 px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
        <div className="mx-auto max-w-[1280px]"><Page /></div>
      </main>
    </div>
  );
}

export default function AdminApp() {
  const [status, setStatus] = useState<Status | null>(null);
  const [error, setError] = useState('');
  const load = useCallback(() => {
    fetch('/api/admin/status', { credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then(setStatus)
      .catch(() => setError('The dashboard server could not be reached.'));
  }, []);
  useEffect(() => {
    document.documentElement.style.background = 'var(--color-ivory)';
    const robots = document.createElement('meta');
    robots.name = 'robots';
    robots.content = 'noindex, nofollow';
    document.head.appendChild(robots);
    setUnauthorizedHandler(() => setStatus((s) => (s ? { ...s, signedIn: false } : s)));
    load();
    return () => robots.remove();
  }, [load]);
  const signOut = async () => {
    await api('POST', '/logout').catch(() => {});
    setStatus((s) => (s ? { ...s, signedIn: false } : s));
  };

  if (error) return <Centered><p role="alert" className="text-danger">{error}</p><Btn className="mt-6" variant="secondary" onClick={() => { setError(''); load(); }}>Try again</Btn></Centered>;
  if (!status) return <Centered><p className="text-stone" role="status">Loading…</p></Centered>;
  if (status.database !== 'connected' || status.auth !== 'configured') return <Setup status={status} />;
  if (!status.signedIn) return <Login onDone={() => setStatus({ ...status, signedIn: true })} />;
  return (
    <Toasts>
      <RouterProvider>
        <Shell onSignOut={signOut} />
      </RouterProvider>
    </Toasts>
  );
}
