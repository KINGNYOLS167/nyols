// A small history-API router: enough for a storefront with a handful of routes,
// without pulling in a routing library.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type AnchorHTMLAttributes, type MouseEvent, type ReactNode } from 'react';

interface Location {
  path: string;
  search: URLSearchParams;
  hash: string;
}

interface RouterCtx extends Location {
  navigate: (to: string, opts?: { replace?: boolean; scroll?: boolean }) => void;
}

const Ctx = createContext<RouterCtx | null>(null);

const read = (): Location => ({
  path: decodeURI(window.location.pathname).replace(/\/+$/, '') || '/',
  search: new URLSearchParams(window.location.search),
  hash: window.location.hash,
});

type Listener = (scroll: boolean) => void;
const listeners = new Set<Listener>();

export function navigate(to: string, { replace = false, scroll = true } = {}) {
  const url = new URL(to, window.location.href);
  if (url.origin !== window.location.origin) {
    window.location.assign(to);
    return;
  }
  const same = url.pathname === window.location.pathname && url.search === window.location.search;
  if (replace || same) window.history.replaceState(null, '', url);
  else window.history.pushState(null, '', url);
  listeners.forEach((l) => l(scroll && !same));
}

export function RouterProvider({ children, onNavigate }: { children: ReactNode; onNavigate?: (scroll: boolean) => void }) {
  const [loc, setLoc] = useState<Location>(read);
  useEffect(() => {
    const update: Listener = (scroll) => {
      setLoc(read());
      onNavigate?.(scroll);
    };
    const pop = () => update(false);
    listeners.add(update);
    window.addEventListener('popstate', pop);
    return () => {
      listeners.delete(update);
      window.removeEventListener('popstate', pop);
    };
  }, [onNavigate]);
  const nav = useCallback((to: string, opts?: { replace?: boolean; scroll?: boolean }) => navigate(to, opts), []);
  const value = useMemo(() => ({ ...loc, navigate: nav }), [loc, nav]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useRouter() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useRouter outside RouterProvider');
  return ctx;
}

/** Match "/brands/:slug" style patterns. */
export function match(pattern: string, path: string): Record<string, string> | null {
  const a = pattern.split('/').filter(Boolean);
  const b = path.split('/').filter(Boolean);
  if (a.length !== b.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < a.length; i++) {
    if (a[i].startsWith(':')) params[a[i].slice(1)] = b[i];
    else if (a[i] !== b[i]) return null;
  }
  return params;
}

type LinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & { to: string; replace?: boolean };

/** In-app link: client-side navigation for plain left clicks, a normal link otherwise. */
export function Link({ to, replace, onClick, children, ...rest }: LinkProps) {
  const { path } = useRouter();
  const handle = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e);
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    navigate(to, { replace });
  };
  const current = to.split(/[?#]/)[0] === path ? 'page' : undefined;
  return (
    <a href={to} onClick={handle} aria-current={rest['aria-current'] ?? current} {...rest}>
      {children}
    </a>
  );
}
