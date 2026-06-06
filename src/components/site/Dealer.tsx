import { MapPin, Phone, Mail } from "lucide-react";
import type { ReactNode } from "react";
import { useI18n } from "@/lib/i18n";
import { Reveal, SectionHeader } from "./Section";

function Info({ icon, label, href }: { icon: ReactNode; label: string; href?: string }) {
  const inner = (
    <span className="flex items-center gap-4 text-foreground/85">
      <span className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-foreground/60">
        {icon}
      </span>
      <span className="text-base">{label}</span>
    </span>
  );
  return <li>{href ? <a href={href} className="smeg-underline">{inner}</a> : inner}</li>;
}

export function Dealer() {
  const { t } = useI18n();
  return (
    <section id="dealer" className="py-28 md:py-40">
      <div className="mx-auto grid max-w-[1400px] grid-cols-1 gap-12 px-6 md:grid-cols-12 md:px-10">
        <div className="md:col-span-5">
          <SectionHeader eyebrow={t("section.dealer.eyebrow")} title={t("section.dealer.title")} />
          <Reveal delay={0.1}>
            <p className="mt-8 max-w-md text-base text-muted-foreground md:text-lg">{t("section.dealer.body")}</p>
            <ul className="mt-10 space-y-5">
              <Info icon={<MapPin className="h-4 w-4" />} label="Nar-Dos 2, Yerevan, Armenia" />
              <Info icon={<Phone className="h-4 w-4" />} label="+374 60 68 00 88" href="tel:+37460680088" />
              <Info icon={<Mail className="h-4 w-4" />} label="smeg@smeg.am" href="mailto:smeg@smeg.am" />
            </ul>
            <a
              href="mailto:smeg@smeg.am"
              className="mt-10 inline-flex items-center gap-3 rounded-full bg-foreground px-7 py-3.5 text-sm font-medium text-background transition-transform hover:-translate-y-0.5"
            >
              {t("section.dealer.cta")} →
            </a>
          </Reveal>
        </div>
        <Reveal className="md:col-span-7">
          <div className="relative aspect-[4/3] overflow-hidden rounded-sm border border-border bg-secondary">
            <iframe
              title="Smeg Armenia Showroom"
              src="https://www.openstreetmap.org/export/embed.html?bbox=44.5108%2C40.1750%2C44.5208%2C40.1830&layer=mapnik&marker=40.1790,44.5158"
              className="h-full w-full grayscale-[40%]"
              loading="lazy"
            />
          </div>
        </Reveal>
      </div>
    </section>
  );
}