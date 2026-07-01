import { MapPin, Phone, Mail, MessageCircle } from "lucide-react";
import type { ReactNode } from "react";
import { useI18n } from "@/lib/i18n";
import { Reveal, SectionHeader } from "./Section";
import { SmegWordmark } from "./SmegWordmark";

const MAP_EMBED_URL =
  "https://maps.google.com/maps?q=40.164568,44.508932&z=17&hl=ru&output=embed";

const MAP_LINK_URL = "https://www.google.com/maps/search/?api=1&query=40.164568,44.508932";

function ContactRow({
  icon,
  label,
  href,
  external,
}: {
  icon: ReactNode;
  label: string;
  href?: string;
  external?: boolean;
}) {
  const inner = (
    <span className="flex items-center gap-4 text-foreground/85">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border text-foreground/60">
        {icon}
      </span>
      <span className="text-base tabular-nums">{label}</span>
    </span>
  );
  return (
    <li>
      {href ? (
        <a
          href={href}
          className="smeg-underline"
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

export function ShowroomContacts({ className, plainEyebrow }: { className?: string; plainEyebrow?: boolean }) {
  const { t } = useI18n();

  return (
    <section id="contact" className={className ?? "site-section bg-secondary/30 border-t border-border/60"}>
      <div className="mx-auto max-w-[1400px] px-4 md:px-10">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-16">
          <div>
            <SectionHeader
              eyebrow={plainEyebrow ? t("section.dealer.title") : <SmegWordmark text={t("section.dealer.eyebrow")} variant="light" />}
              title={t("footer.contact")}
              eyebrowKey="section.dealer.eyebrow"
            />
            <Reveal delay={0.08}>
              <p className="mt-6 max-w-md text-base text-muted-foreground md:text-lg">{t("section.dealer.body")}</p>
              <ul className="mt-8 space-y-5">
                <ContactRow icon={<MapPin className="h-4 w-4" />} label={t("section.dealer.address")} />
                <ContactRow icon={<Phone className="h-4 w-4" />} label="+374 60 68 00 88" href="tel:+37460680088" />
                <ContactRow icon={<Phone className="h-4 w-4" />} label="+374 98 58 00 85" href="tel:+37498580085" />
                <ContactRow
                  icon={<MessageCircle className="h-4 w-4" />}
                  label="WhatsApp"
                  href="https://wa.me/37498580085"
                  external
                />
                <ContactRow icon={<Mail className="h-4 w-4" />} label="smeg@smeg.am" href="mailto:smeg@smeg.am" />
              </ul>
              <a
                href={MAP_LINK_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-8 inline-block text-xs uppercase tracking-[0.18em] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                {t("hoc.contact.openMap")}
              </a>
            </Reveal>
          </div>
          <Reveal delay={0.12}>
            <div className="relative aspect-[4/3] overflow-hidden rounded-sm border border-border bg-secondary lg:aspect-auto lg:min-h-[360px]">
              <iframe
                title={t("hoc.contact.mapTitle")}
                src={MAP_EMBED_URL}
                className="h-full w-full min-h-[280px] grayscale-[40%]"
                loading="lazy"
              />
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
