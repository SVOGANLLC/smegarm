import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { Search, X } from "lucide-react";
import { searchProductsRpc } from "@/lib/products";

function formatAmd(n: number | null) {
  if (n == null) return null;
  return new Intl.NumberFormat("ru-RU").format(n) + " ֏";
}

export function HeaderSearch() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      document.body.style.overflow = "";
      setQ("");
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const trimmed = q.trim();
  const suggestions = useQuery({
    queryKey: ["search-suggestions", trimmed],
    queryFn: () => searchProductsRpc(trimmed, { limit: 8 }),
    enabled: trimmed.length >= 2,
    staleTime: 60_000,
  });

  const submit = () => {
    if (!trimmed) return;
    setOpen(false);
    navigate({ to: "/catalog", search: { q: trimmed, page: 1 } });
  };

  return (
    <>
      <button
        type="button"
        aria-label="Поиск"
        onClick={() => setOpen(true)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/70 bg-background/50 text-foreground/80 backdrop-blur transition hover:text-foreground"
      >
        <Search className="h-4 w-4" />
      </button>

      {open && (
        <div className="fixed inset-0 z-[60]">
          <div
            className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="relative mx-auto mt-24 max-w-2xl px-4">
            <div className="overflow-hidden rounded-2xl border border-border bg-background shadow-2xl">
              <div className="flex items-center gap-3 border-b border-border px-5 py-4">
                <Search className="h-4 w-4 text-muted-foreground" />
                <input
                  ref={inputRef}
                  type="search"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") submit();
                  }}
                  placeholder="Поиск: артикул, название, коллекция…"
                  className="flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
                />
                <button
                  type="button"
                  aria-label="Закрыть"
                  onClick={() => setOpen(false)}
                  className="rounded-full p-1.5 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="max-h-[60vh] overflow-y-auto">
                {trimmed.length < 2 ? (
                  <p className="px-5 py-6 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    Введите минимум 2 символа
                  </p>
                ) : suggestions.isLoading ? (
                  <p className="px-5 py-6 text-sm text-muted-foreground">Ищу…</p>
                ) : !suggestions.data?.length ? (
                  <p className="px-5 py-6 text-sm text-muted-foreground">
                    По «{trimmed}» ничего не найдено
                  </p>
                ) : (
                  <ul className="divide-y divide-border">
                    {suggestions.data.map((s) => (
                      <li key={s.sku}>
                        <Link
                          to="/product/$sku"
                          params={{ sku: s.sku }}
                          onClick={() => setOpen(false)}
                          className="flex items-center gap-4 px-5 py-3 transition hover:bg-secondary/60"
                        >
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-sm bg-secondary">
                            {s.main_image ? (
                              <img
                                src={s.main_image}
                                alt=""
                                className="h-full w-full object-contain p-1"
                              />
                            ) : null}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="line-clamp-1 font-serif text-sm text-foreground">
                              {s.name}
                            </p>
                            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                              {[s.sku, s.category, s.colour].filter(Boolean).join(" · ")}
                            </p>
                          </div>
                          {s.price_amd != null && (
                            <span className="shrink-0 text-sm text-foreground">
                              {formatAmd(s.price_amd)}
                            </span>
                          )}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
                {suggestions.data && suggestions.data.length > 0 && (
                  <button
                    type="button"
                    onClick={submit}
                    className="block w-full border-t border-border bg-secondary/40 px-5 py-3 text-center text-xs uppercase tracking-[0.18em] text-foreground transition hover:bg-secondary"
                  >
                    Все результаты по «{trimmed}» →
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}