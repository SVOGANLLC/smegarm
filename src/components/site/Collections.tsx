import { useI18n } from "@/lib/i18n";
import { SectionHeader, Reveal } from "./Section";

const collections = [
  { name: "Retro Style 50's", note: "Iconic curves, eleven colours." },
  { name: "Dolce & Gabbana", note: "Hand-painted Sicilian art." },
  { name: "Portofino", note: "Riviera elegance." },
  { name: "Linea", note: "Architectural minimalism." },
  { name: "Victoria", note: "Country charm reinvented." },
  { name: "Coloniale", note: "Timeless tradition." },
  { name: "Cortina", note: "Alpine craftsmanship." },
  { name: "Classica", note: "Pure professional lines." },
  { name: "Musa", note: "Sculpted built-in design." },
  { name: "Isola", note: "Statement freestanding pieces." },
];

function CollectionRow({ c, i }: { c: { name: string; note: string }; i: number }) {
  return (
    <Reveal delay={i * 0.04}>
      <a
        href="#"
        className="group flex items-baseline justify-between gap-6 py-7 transition-colors hover:bg-background/60 md:px-6"
      >
        <div className="flex items-baseline gap-6">
          <span className="font-mono text-xs text-muted-foreground tabular-nums">
            {String(i + 1).padStart(2, "0")}
          </span>
          <span className="font-serif text-2xl text-foreground md:text-3xl">{c.name}</span>
        </div>
        <div className="flex items-baseline gap-6">
          <span className="hidden text-sm text-muted-foreground md:inline">{c.note}</span>
          <span className="text-foreground/50 transition-all group-hover:translate-x-1 group-hover:text-accent">→</span>
        </div>
      </a>
    </Reveal>
  );
}

export function Collections() {
  const { t } = useI18n();
  return (
    <section id="collections" className="relative bg-secondary/40 py-28 md:py-40">
      <div className="mx-auto max-w-[1400px] px-6 md:px-10">
        <SectionHeader eyebrow={t("section.collections.eyebrow")} title={t("section.collections.title")} />
        <div className="mt-16 grid grid-cols-1 gap-0 border-y border-border/60 md:grid-cols-2">
          <ul className="divide-y divide-border/60 md:border-r md:border-border/60">
            {collections.slice(0, 5).map((c, i) => (
              <CollectionRow key={c.name} c={c} i={i} />
            ))}
          </ul>
          <ul className="divide-y divide-border/60 border-t border-border/60 md:border-t-0">
            {collections.slice(5).map((c, i) => (
              <CollectionRow key={c.name} c={c} i={i + 5} />
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}