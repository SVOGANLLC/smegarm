import storyImg from "@/assets/story-kitchen.jpg";
import { useI18n } from "@/lib/i18n";
import { Reveal } from "./Section";

function Stat({ n, label, labelKey }: { n: string; label: string; labelKey: string }) {
  return (
    <div>
      <div className="font-serif text-3xl md:text-4xl">{n}</div>
      <div data-ck={labelKey} className="mt-1 text-xs uppercase tracking-[0.2em] text-background/55">{label}</div>
    </div>
  );
}

export function Story() {
  const { t } = useI18n();
  return (
    <section id="story" className="relative overflow-hidden bg-foreground text-background">
      <div className="mx-auto grid max-w-[1400px] grid-cols-1 gap-12 px-6 py-28 md:grid-cols-2 md:gap-20 md:px-10 md:py-40">
        <Reveal>
          <div className="aspect-[4/5] overflow-hidden rounded-sm">
            <img src={storyImg} alt="" loading="lazy" width={1600} height={1024} className="h-full w-full object-cover" />
          </div>
        </Reveal>
        <div className="flex flex-col justify-center">
          <Reveal>
            <p data-ck="section.story.eyebrow" className="eyebrow text-background/60">{t("section.story.eyebrow")}</p>
            <h2 data-ck="section.story.title" className="mt-4 display-xl text-[clamp(2rem,5vw,4.5rem)] whitespace-pre-line">
              {t("section.story.title")}
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p data-ck="section.story.body" className="mt-8 max-w-md text-base text-background/75 md:text-lg">{t("section.story.body")}</p>
            <div className="mt-10 grid grid-cols-3 gap-6 border-t border-background/15 pt-8">
              <Stat n="76" label={t("section.story.stat.years")} labelKey="section.story.stat.years" />
              <Stat n="50+" label={t("section.story.stat.countries")} labelKey="section.story.stat.countries" />
              <Stat n="11" label={t("section.story.stat.colours")} labelKey="section.story.stat.colours" />
            </div>
            <a href="#" data-ck="section.story.cta" className="mt-10 inline-flex w-fit items-center gap-3 text-sm uppercase tracking-[0.2em] text-background smeg-underline">
              {t("section.story.cta")} →
            </a>
          </Reveal>
        </div>
      </div>
    </section>
  );
}