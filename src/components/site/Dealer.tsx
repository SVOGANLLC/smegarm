import { MapPin, Phone, Mail, MessageCircle } from "lucide-react";
import type { ReactNode } from "react";
import { useI18n } from "@/lib/i18n";
import { googleMapsDirectionsUrl } from "@/lib/showroom-map";
import { Reveal, SectionHeader } from "./Section";
import { ContactForm } from "./ContactForm";
import { ShowroomMapEmbed } from "./ShowroomMapEmbed";

function Info({
  icon,
  label,
  href,
  ck,
  external,
  title,
}: {
  icon: ReactNode;
  label: string;
  href?: string;
  ck?: string;
  external?: boolean;
  title?: string;
}) {
  const inner = (
    <span className="flex items-center gap-4 text-foreground/85">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border text-foreground/60">
        {icon}
      </span>
      <span data-ck={ck} className="text-base tabular-nums">{label}</span>
    </span>
  );
  return (
    <li>
      {href ? (
        <a
          href={href}
          className="smeg-underline"
          title={title}
          {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        >
          {inner}
        </a>
      ) : (
        inner
      )}
    </li>
  );
}

export function Dealer() {
  const { t } = useI18n();
  return (
    <section id="contact" className="site-section">
      <div className="mx-auto grid max-w-[1400px] grid-cols-1 gap-10 px-4 md:grid-cols-12 md:gap-12 md:px-10">
        <div className="md:col-span-5">
          <SectionHeader
            eyebrow={t("section.dealer.eyebrow")}
            title={t("section.dealer.title")}
            eyebrowKey="section.dealer.eyebrow"
            titleKey="section.dealer.title"
          />
          <Reveal delay={0.1}>
            <p data-ck="section.dealer.body" className="mt-8 max-w-md text-base text-muted-foreground md:text-lg">{t("section.dealer.body")}</p>
            <ul className="mt-10 space-y-5">
              <Info
                icon={<MapPin className="h-4 w-4" />}
                label={t("section.dealer.address")}
                href={googleMapsDirectionsUrl()}
                ck="section.dealer.address"
                external
                title={t("hoc.contact.directions")}
              />
              <Info icon={<Phone className="h-4 w-4" />} label="+374 60 68 00 88" href="tel:+37460680088" />
              <Info icon={<Phone className="h-4 w-4" />} label="+374 98 58 00 85" href="tel:+37498580085" />
              <Info
                icon={<MessageCircle className="h-4 w-4" />}
                label="WhatsApp"
                href="https://wa.me/37498580085"
                external
              />
              <Info icon={<Mail className="h-4 w-4" />} label="smeg@smeg.am" href="mailto:smeg@smeg.am" />
            </ul>
          </Reveal>
        </div>
        <Reveal className="md:col-span-7">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            <ContactForm className="rounded-sm border border-border bg-secondary/30 p-6" />
            <ShowroomMapEmbed title="Smeg Armenia Showroom" />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
