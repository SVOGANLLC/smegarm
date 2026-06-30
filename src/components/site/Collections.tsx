import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useI18n, pickLocalized } from "@/lib/i18n";
import { Reveal } from "./Section";
import { fetchCollections, type Collection, type CollectionSection } from "@/lib/products";

const SECTION_ORDER: CollectionSection[] = ["design", "timeless", "special"];

function CollectionCard({ c, i, lang }: { c: Collection; i: number; lang: "ru" | "en" | "hy" }) {
  const name = pickLocalized(c as unknown as Record<string, unknown>, "name", lang) || c.name;
  const isLogoCover = !!c.cover_image?.includes("/smeg-logo");
  return (
    <Reveal delay={i * 0.03}>
      <Link
        to="/collection/$slug"
        params={{ slug: c.slug }}
        className="group block w-[5.75rem] sm:w-[6.25rem]"
      >
        <div className="aspect-square w-full overflow-hidden bg-[#1a1a1a]">
          {c.cover_image ? (
            <img
              src={c.cover_image}
              alt={name}
              className={`h-full w-full transition-transform duration-500 group-hover:scale-[1.03] ${
                isLogoCover ? "object-contain p-3" : "object-cover"
              }`}
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-[#222] text-[9px] uppercase tracking-widest text-white/40">
              {name}
            </div>
          )}
        </div>
        <p className="mt-2 font-sans text-[11px] leading-tight text-white/90 transition-colors group-hover:text-white sm:text-xs">
          {name}
        </p>
      </Link>
    </Reveal>
  );
}

export function Collections() {
  const { t, lang } = useI18n();
  const { data: collections = [], isLoading } = useQuery({
    queryKey: ["collections-list"],
    queryFn: fetchCollections,
    staleTime: 5 * 60 * 1000,
  });

  if (!isLoading && collections.length === 0) return null;

  const grouped = SECTION_ORDER.map((section) => ({
    section,
    items: collections.filter((c) => (c.section ?? "special") === section),
  })).filter((g) => g.items.length > 0);

  return (
    <section id="collections" className="site-section bg-black text-white">
      <div className="mx-auto max-w-[1400px] px-4 md:px-10">
        <div>
          <p className="eyebrow text-white/45 after:mt-3 after:block after:h-px after:w-8 after:bg-white/25">
            {t("section.collections.eyebrow")}
          </p>
          <h2 className="mt-4 display-xl text-[clamp(2rem,5vw,4.5rem)] text-white whitespace-pre-line">
            {t("section.collections.title")}
          </h2>
        </div>

        {isLoading ? (
          <p className="mt-12 text-sm text-white/50">{t("catalog.loading")}</p>
        ) : (
          <div className="mt-12 space-y-14 md:mt-16 md:space-y-20">
            {grouped.map(({ section, items }) => (
              <div key={section}>
                <h3 className="text-[0.6875rem] font-medium uppercase tracking-[0.22em] text-[#c4a574] md:text-xs">
                  {t(`section.collections.group.${section}`)}
                </h3>
                <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-8 sm:gap-x-6">
                  {items.map((c, i) => (
                    <li key={c.id}>
                      <CollectionCard c={c} i={i} lang={lang} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
