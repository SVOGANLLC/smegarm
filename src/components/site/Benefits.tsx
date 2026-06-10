import { useI18n } from "@/lib/i18n";
import { Reveal, SectionHeader } from "./Section";

const items = [
  { n: "01", tKey: "section.benefits.1.t", dKey: "section.benefits.1.d" },
  { n: "02", tKey: "section.benefits.2.t", dKey: "section.benefits.2.d" },
  { n: "03", tKey: "section.benefits.3.t", dKey: "section.benefits.3.d" },
  { n: "04", tKey: "section.benefits.4.t", dKey: "section.benefits.4.d" },
];

export function Benefits() {
  const { t } = useI18n();
  return (
    <section className="bg-secondary/40 py-28 md:py-40">
      <div className="mx-auto max-w-[1400px] px-6 md:px-10">
        <SectionHeader
          eyebrow={t("section.benefits.eyebrow")}
          title={t("section.benefits.title")}
          eyebrowKey="section.benefits.eyebrow"
          titleKey="section.benefits.title"
        />
        <div className="mt-16 grid grid-cols-1 gap-px overflow-hidden rounded-sm bg-border md:grid-cols-2 lg:grid-cols-4">
          {items.map((it, i) => (
            <Reveal key={it.n} delay={i * 0.06} className="bg-background">
              <div className="flex h-full flex-col gap-4 p-8 md:p-10">
                <span className="font-mono text-xs text-accent tabular-nums">{it.n}</span>
                <h3 data-ck={it.tKey} className="font-serif text-2xl text-foreground">{t(it.tKey)}</h3>
                <p data-ck={it.dKey} className="text-sm text-muted-foreground">{t(it.dKey)}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}