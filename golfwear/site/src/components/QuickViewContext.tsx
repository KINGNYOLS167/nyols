import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import type { PublicProduct } from '../lib/catalog';
import { QuickView } from './QuickView';

const Ctx = createContext<(p: PublicProduct) => void>(() => {});

export function QuickViewProvider({ children }: { children: ReactNode }) {
  const [product, setProduct] = useState<PublicProduct | null>(null);
  const close = useCallback(() => setProduct(null), []);
  return (
    <Ctx.Provider value={setProduct}>
      {children}
      <QuickView product={product} onClose={close} />
    </Ctx.Provider>
  );
}

export const useQuickView = () => useContext(Ctx);
