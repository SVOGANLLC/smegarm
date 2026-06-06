import { useI18n } from "@/lib/i18n";
import { Reveal, SectionHeader } from "./Section";

const items = [
  { n: "01", t: "Made in Italy", d: "Assembled in Smeg's Guastalla factories with 76 years of know-how." },
  { n: "02", t: "Iconic design", d: "From the FAB50 to Linea — pieces curated by world-class designers." },
  { n: "03", t: "Energy efficiency", d: "A-class technology engineered for the modern Mediterranean home." },
  { n: "04", t: "Official warranty", d: "Full Smeg warranty and certified service across Armenia." },
];

export function Benefits() {
  const { t } = useI18n();
  return (
    <section className="bg-secondary/40 py-28 md:py-40">
      <div className="mx-auto max-w-[1400px] px-6 md:px-10">
        <SectionHeader eyebrow={t("section.benefits.eyebrow")} title={"Italian craft.\nArmenian care."} />
        <div className="mt-16 grid grid-cols-1 gap-px overflow-hidden rounded-sm bg-border md:grid-cols-2 lg:grid-cols-4">
          {items.map((it, i) => (
            <Reveal key={it.n} delay={i * 0.06} className="bg-background">
              <div className="flex h-full flex-col gap-4 p-8 md:p-10">
                <span className="font-mono text-xs text-accent tabular-nums">{it.n}</span>
                <h3 className="font-serif text-2xl text-foreground">{it.t}</h3>
                <p className="text-sm text-muted-foreground">{it.d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}