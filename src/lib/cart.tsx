import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type CartItem = {
  sku: string;
  name: string;
  image: string | null;
  price: number | null;
  qty: number;
};

type CartCtx = {
  items: CartItem[];
  count: number;
  total: number;
  add: (item: Omit<CartItem, "qty">, qty?: number) => void;
  setQty: (sku: string, qty: number) => void;
  remove: (sku: string) => void;
  clear: () => void;
  open: boolean;
  setOpen: (v: boolean) => void;
};

const Ctx = createContext<CartCtx | null>(null);
const KEY = "smeg.cart.v1";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [open, setOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem(KEY) : null;
      if (raw) setItems(JSON.parse(raw));
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(items));
    } catch {
      /* ignore */
    }
  }, [items, hydrated]);

  const add: CartCtx["add"] = (item, qty = 1) => {
    setItems((prev) => {
      const i = prev.findIndex((p) => p.sku === item.sku);
      if (i >= 0) {
        const next = [...prev];
        next[i] = { ...next[i], qty: Math.min(999, next[i].qty + qty) };
        return next;
      }
      return [...prev, { ...item, qty }];
    });
    setOpen(true);
  };

  const setQty = (sku: string, qty: number) =>
    setItems((prev) =>
      prev
        .map((p) => (p.sku === sku ? { ...p, qty: Math.max(0, Math.min(999, qty)) } : p))
        .filter((p) => p.qty > 0),
    );

  const remove = (sku: string) => setItems((prev) => prev.filter((p) => p.sku !== sku));
  const clear = () => setItems([]);

  const count = items.reduce((s, i) => s + i.qty, 0);
  const total = items.reduce((s, i) => s + (i.price ?? 0) * i.qty, 0);

  return (
    <Ctx.Provider value={{ items, count, total, add, setQty, remove, clear, open, setOpen }}>
      {children}
    </Ctx.Provider>
  );
}

export function useCart() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}