import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useI18n, pickLocalized } from "@/lib/i18n";
import { Reveal } from "./Section";
import { fetchCollections, type Collection } from "@/lib/products";

function CollectionRow({ c, i, lang }: { c: Collection; i: number; lang: "ru" | "en" | "hy" }) {
  const name = pickLocalized(c as unknown as Record<string, unknown>, "name", lang) || c.name;
  const desc = pickLocalized(c as unknown as Record<string, unknown>, "description", lang) || c.description;
  return (
    <Reveal delay={i * 0.04}>
      <Link
        to="/collection/$slug"
        params={{ slug: c.slug }}
        className="group flex items-baseline justify-between gap-6 py-7 transition-colors hover:bg-black/5 md:px-6"
      >
        <div className="flex items-baseline gap-6">
          <span className="font-mono text-xs tabular-nums text-black/50">
            {String(i + 1).padStart(2, "0")}
          </span>
          <span className="font-serif text-2xl text-[#111] md:text-3xl">{name}</span>
        </div>
        <div className="flex items-baseline gap-6">
          {desc && <span className="hidden text-sm text-black/60 md:inline">{desc}</span>}
          <span className="text-black/40 transition-all group-hover:translate-x-1 group-hover:text-black">→</span>
        </div>
      </Link>
    </Reveal>
  );
}

export function Collections() {
  const { t, lang } = useI18n();
  const { data: collections = [] } = useQuery({
    queryKey: ["collections-list"],
    queryFn: fetchCollections,
    staleTime: 5 * 60 * 1000,
  });
  if (!collections.length) return null;
  const mid = Math.ceil(collections.length / 2);
  return (
    <section id="collections" className="relative bg-[#f5f0e8] py-28 text-[#111] md:py-40">
      <div className="mx-auto max-w-[1400px] px-6 md:px-10">
        <div className="text-[#111]">
          <p className="eyebrow text-black/55">{t("section.collections.eyebrow")}</p>
          <h2 className="mt-4 display-xl text-[clamp(2rem,5vw,4.5rem)] text-[#111] whitespace-pre-line">
            {t("section.collections.title")}
          </h2>
        </div>
        <div className="mt-16 grid grid-cols-1 gap-0 border-y border-black/15 md:grid-cols-2">
          <ul className="divide-y divide-black/15 md:border-r md:border-black/15">
            {collections.slice(0, mid).map((c, i) => (
              <CollectionRow key={c.id} c={c} i={i} lang={lang} />
            ))}
          </ul>
          <ul className="divide-y divide-black/15 border-t border-black/15 md:border-t-0">
            {collections.slice(mid).map((c, i) => (
              <CollectionRow key={c.id} c={c} i={i + mid} lang={lang} />
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}