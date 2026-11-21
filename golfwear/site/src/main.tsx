import { lazy, StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/jost/300.css';
import '@fontsource/jost/400.css';
import '@fontsource/jost/500.css';
import 'lenis/dist/lenis.css';
import './styles.css';

// The private dashboard is its own bundle: customers never download it.
const isAdmin = window.location.pathname === '/admin' || window.location.pathname.startsWith('/admin/');
const App = isAdmin ? lazy(() => import('./admin/AdminApp')) : lazy(() => import('./store/StoreApp'));

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Suspense fallback={null}>
      <App />
    </Suspense>
  </StrictMode>,
);
