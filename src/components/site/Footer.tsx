import type { ReactNode } from "react";
import { Instagram, Facebook, MessageCircle, Youtube } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { googleMapsDirectionsUrl } from "@/lib/showroom-map";
import smegLogoBlack from "@/assets/smeg-logo.png.asset.json";

function SocialLink({ href, label, children }: { href: string; label: string; children: ReactNode }) {
  return (
    <a
      href={href}
      aria-label={label}
      target="_blank"
      rel="noopener noreferrer"
      className="flex h-9 w-9 items-center justify-center rounded-full border border-background/20 text-background/75 transition-colors hover:border-background hover:text-background"
    >
      {children}
    </a>
  );
}

function PhoneRow({ href, children }: { href: string; children: ReactNode }) {
  return (
    <li className="flex items-baseline gap-2">
      <a href={href} className="smeg-underline text-sm tabular-nums">
        {children}
      </a>
    </li>
  );
}

export function Footer() {
  const { t } = useI18n();
  return (
    <footer className="bg-foreground text-background">
      <div className="mx-auto max-w-[1400px] px-6 py-10 md:px-10 md:py-14">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-12 md:gap-8">
          <div className="md:col-span-5">
            <div className="flex items-center gap-3">
              <img src={smegLogoBlack.url} alt="SMEG" className="h-7 w-auto" />
              <span className="text-sm uppercase tracking-[0.3em] text-background/50">Armenia</span>
            </div>
            <p data-ck="footer.tagline" className="mt-4 max-w-sm text-sm text-background/65">
              {t("footer.tagline")}
            </p>
          </div>

          <div className="md:col-span-3">
            <p className="eyebrow text-background/50">{t("footer.contact")}</p>
            <ul className="mt-3 space-y-2 text-sm">
              <PhoneRow href="tel:+37460680088">+374 60 68 00 88</PhoneRow>
              <PhoneRow href="tel:+37498580085">+374 98 58 00 85</PhoneRow>
              <li>
                <a
                  href="https://wa.me/37498580085"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="smeg-underline inline-flex items-center gap-1.5 text-sm"
                >
                  <MessageCircle className="h-3.5 w-3.5 shrink-0" />
                  WhatsApp
                </a>
              </li>
              <li>
                <a href="mailto:smeg@smeg.am" className="smeg-underline text-sm">smeg@smeg.am</a>
              </li>
            </ul>
          </div>

          <div className="md:col-span-4">
            <p className="eyebrow text-background/50">{t("footer.address")}</p>
            <a
              href={googleMapsDirectionsUrl()}
              target="_blank"
              rel="noopener noreferrer"
              title={t("hoc.contact.directions")}
              className="smeg-underline mt-3 block text-sm text-background/80"
            >
              <span data-ck="footer.address.line1">
                {t("footer.address.line1")}
                <br />
                <span data-ck="footer.address.line2">{t("footer.address.line2")}</span>
              </span>
            </a>
          </div>
        </div>

        <div className="mt-8 flex gap-3 md:mt-10">
          <SocialLink href="https://instagram.com/smegarmenia/" label="Instagram">
            <Instagram className="h-4 w-4" />
          </SocialLink>
          <SocialLink href="https://facebook.com/SmegArmeniaOfficial" label="Facebook">
            <Facebook className="h-4 w-4" />
          </SocialLink>
          <SocialLink href="https://www.youtube.com/@smegarmeniaofficial" label="YouTube">
            <Youtube className="h-4 w-4" />
          </SocialLink>
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-3 border-t border-background/15 pt-6 text-xs text-background/55 md:flex-row md:items-center">
          <p>© {new Date().getFullYear()} Smeg Armenia. {t("footer.rights")}</p>
          <p>
            {t("footer.designed")}{" "}
            <a
              href="https://edgarmanukyan.com"
              target="_blank"
              rel="noopener noreferrer"
              className="smeg-underline text-background"
            >
              Edgar Manukyan
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
