import type { ReactNode } from "react";
import { Instagram, Facebook } from "lucide-react";
import { useI18n } from "@/lib/i18n";

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
      <div className="mx-auto max-w-[1400px] px-6 py-20 md:px-10 md:py-28">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-12">
          <div className="md:col-span-5">
            <div className="font-serif text-3xl">
              SMEG{" "}
              <span className="ml-2 text-base uppercase tracking-[0.3em] text-background/50">Armenia</span>
            </div>
            <p className="mt-6 max-w-sm text-sm text-background/65">
              Official Smeg representative in Armenia. Premium Italian household and professional appliances since 1948.
            </p>
          </div>

          <div className="md:col-span-3">
            <p className="eyebrow text-background/50">{t("footer.contact")}</p>
            <ul className="mt-5 space-y-2 text-sm">
              <li>
                <a href="tel:+37460680088" className="smeg-underline">+374 60 68 00 88</a>
              </li>
              <li>
                <a href="mailto:smeg@smeg.am" className="smeg-underline">smeg@smeg.am</a>
              </li>
            </ul>
          </div>

          <div className="md:col-span-2">
            <p className="eyebrow text-background/50">{t("footer.address")}</p>
            <p className="mt-5 text-sm text-background/80">
              Nar-Dos 2
              <br />
              Yerevan, Armenia
            </p>
          </div>

          <div className="md:col-span-2">
            <p className="eyebrow text-background/50">{t("footer.follow")}</p>
            <div className="mt-5 flex gap-3">
              <SocialLink href="https://instagram.com/smegarmenia/" label="Instagram">
                <Instagram className="h-4 w-4" />
              </SocialLink>
              <SocialLink href="https://facebook.com/SmegArmeniaOfficial" label="Facebook">
                <Facebook className="h-4 w-4" />
              </SocialLink>
            </div>
          </div>
        </div>

        <div className="mt-20 flex flex-col items-start justify-between gap-4 border-t border-background/15 pt-8 text-xs text-background/55 md:flex-row md:items-center">
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