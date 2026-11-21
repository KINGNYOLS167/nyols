import { useSyncExternalStore, type AnchorHTMLAttributes, type MouseEvent } from 'react';

/** A deliberately small client router: real URLs (/shop, /product/x), History API, no dependency. */
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  window.addEventListener('popstate', l);
  return () => { listeners.delete(l); window.removeEventListener('popstate', l); };
};
const snapshot = () => location.pathname + location.search;

export function navigate(to: string, { replace = false } = {}) {
  if (to === snapshot()) return;
  history[replace ? 'replaceState' : 'pushState'](null, '', to);
  notify();
}

export function useLocation() {
  const href = useSyncExternalStore(subscribe, snapshot, snapshot);
  const url = new URL(href, location.origin);
  return { path: url.pathname.replace(/\/+$/, '') || '/', search: url.searchParams, href };
}

/** "/product/:id" against "/product/fairway-polo" -> { id: "fairway-polo" } */
export function match(pattern: string, path: string): Record<string, string> | null {
  const a = pattern.split('/').filter(Boolean), b = path.split('/').filter(Boolean);
  if (a.length !== b.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < a.length; i++) {
    if (a[i].startsWith(':')) params[a[i].slice(1)] = decodeURIComponent(b[i]);
    else if (a[i] !== b[i]) return null;
  }
  return params;
}

type LinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & { to: string };
export function Link({ to, onClick, ...rest }: LinkProps) {
  const handle = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e);
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || rest.target) return;
    e.preventDefault();
    navigate(to);
  };
  return <a href={to} onClick={handle} {...rest} />;
}
