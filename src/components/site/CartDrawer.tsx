import { useCart } from "@/lib/cart";
import { useI18n } from "@/lib/i18n";
import { Link } from "@tanstack/react-router";
import { X, Minus, Plus, ShoppingBag } from "lucide-react";
import { useEffect } from "react";

export function CartDrawer() {
  const { items, count, total, setQty, remove, open, setOpen } = useCart();
  const { t } = useI18n();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, setOpen]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100]">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in"
        onClick={() => setOpen(false)}
      />
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-background shadow-2xl animate-in slide-in-from-right">
        <header className="flex items-center justify-between border-b border-border px-6 py-5">
          <div className="flex items-center gap-3">
            <ShoppingBag className="h-5 w-5" />
            <h2 className="font-serif text-xl">
              {t("cart.title")} {count > 0 && <span className="text-muted-foreground">({count})</span>}
            </h2>
          </div>
          <button onClick={() => setOpen(false)} aria-label={t("cart.close")}>
            <X className="h-5 w-5" />
          </button>
        </header>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
            <ShoppingBag className="h-12 w-12 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">{t("cart.empty")}</p>
            <Link
              to="/catalog"
              onClick={() => setOpen(false)}
              className="rounded-full bg-foreground px-5 py-2.5 text-xs uppercase tracking-[0.15em] text-background"
            >
              {t("common.shop")}
            </Link>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-auto px-6 py-4">
              <ul className="space-y-4">
                {items.map((it) => (
                  <li key={it.sku} className="flex gap-3 border-b border-border pb-4">
                    <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-sm bg-white">
                      {it.image ? (
                        <img src={it.image} alt={it.name} className="h-full w-full object-contain p-1" />
                      ) : null}
                    </div>
                    <div className="flex flex-1 flex-col">
                      <div className="flex justify-between gap-2">
                        <Link
                          to="/product/$sku"
                          params={{ sku: it.sku }}
                          onClick={() => setOpen(false)}
                          className="line-clamp-2 text-sm hover:underline"
                        >
                          {it.name}
                        </Link>
                        <button
                          onClick={() => remove(it.sku)}
                          className="text-muted-foreground hover:text-foreground"
                          aria-label={t("cart.remove")}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        {it.sku}
                      </p>
                      <div className="mt-auto flex items-center justify-between pt-2">
                        <div className="flex items-center rounded-sm border border-border">
                          <button
                            onClick={() => setQty(it.sku, it.qty - 1)}
                            className="px-2 py-1 hover:bg-secondary"
                            aria-label="-"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="min-w-[2rem] text-center text-sm">{it.qty}</span>
                          <button
                            onClick={() => setQty(it.sku, it.qty + 1)}
                            className="px-2 py-1 hover:bg-secondary"
                            aria-label="+"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                        <p className="font-medium">
                          {it.price != null
                            ? ((it.price * it.qty).toLocaleString("ru-RU") + " ֏")
                            : t("cart.onRequest")}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <footer className="border-t border-border bg-secondary/30 px-6 py-5">
              <div className="mb-4 flex justify-between text-base">
                <span className="text-muted-foreground">{t("cart.total")}</span>
                <span className="font-serif text-2xl">{total.toLocaleString("ru-RU")} ֏</span>
              </div>
              <Link
                to="/checkout"
                onClick={() => setOpen(false)}
                className="block rounded-full bg-foreground py-3 text-center text-xs uppercase tracking-[0.2em] text-background hover:opacity-90"
              >
                {t("cart.checkout")}
              </Link>
            </footer>
          </>
        )}
      </aside>
    </div>
  );
}

export function CartButton() {
  const { count, setOpen } = useCart();
  const { t } = useI18n();
  return (
    <button
      onClick={() => setOpen(true)}
      className="relative flex h-9 w-9 items-center justify-center rounded-full border border-border/70 bg-background/50 backdrop-blur hover:bg-background"
      aria-label={t("cart.open")}
    >
      <ShoppingBag className="h-4 w-4" />
      {count > 0 && (
        <span className="absolute -right-1 -top-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-foreground px-1 text-[10px] font-medium text-background">
          {count}
        </span>
      )}
    </button>
  );
}
