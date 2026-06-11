import type { ReactNode } from "react";
import { Instagram, Facebook, MessageCircle } from "lucide-react";
import { useI18n } from "@/lib/i18n";
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

export function Footer() {
  const { t } = useI18n();
  return (
    <footer id="contact" className="bg-foreground text-background">
      <div className="mx-auto max-w-[1400px] px-6 py-10 md:px-10 md:py-14">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-12">
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
            <ul className="mt-3 space-y-1.5 text-sm">
              <li>
                <a href="tel:+37460680088" className="smeg-underline">+374 60 68 00 88</a>
              </li>
              <li>
                <a
                  href="https://wa.me/37498580085"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="smeg-underline inline-flex items-center gap-1.5"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  WhatsApp +374 98 58 00 85
                </a>
              </li>
              <li>
                <a href="mailto:smeg@smeg.am" className="smeg-underline">smeg@smeg.am</a>
              </li>
            </ul>
          </div>

          <div className="md:col-span-2">
            <p className="eyebrow text-background/50">{t("footer.address")}</p>
            <p data-ck="footer.address.line1" className="mt-3 text-sm text-background/80">
              {t("footer.address.line1")}
              <br />
              <span data-ck="footer.address.line2">{t("footer.address.line2")}</span>
            </p>
          </div>

          <div className="md:col-span-2">
            <p className="eyebrow text-background/50">{t("footer.follow")}</p>
            <div className="mt-3 flex gap-3">
              <SocialLink href="https://instagram.com/smegarmenia/" label="Instagram">
                <Instagram className="h-4 w-4" />
              </SocialLink>
              <SocialLink href="https://facebook.com/SmegArmeniaOfficial" label="Facebook">
                <Facebook className="h-4 w-4" />
              </SocialLink>
            </div>
          </div>
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