import { createFileRoute, Link } from "@tanstack/react-router";
import { MapPin, Phone, Mail, MessageCircle, ShieldCheck, Wrench, HelpCircle } from "lucide-react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { ContactForm } from "@/components/site/ContactForm";
import { ShowroomMapEmbed } from "@/components/site/ShowroomMapEmbed";
import { Reveal, SectionHeader } from "@/components/site/Section";
import { useI18n, getI18nDefaults } from "@/lib/i18n";
import { googleMapsDirectionsUrl } from "@/lib/showroom-map";
import { breadcrumbJsonLd, canonicalLink, hreflangLinks, seoMeta } from "@/lib/seo";

const hy = getI18nDefaults().hy;

export const Route = createFileRoute("/service")({
  head: () => {
    const path = "/service";
    const title = hy["service.metaTitle"] ?? "Service — Smeg Armenia";
    const description = hy["service.metaDesc"] ?? title;
    return {
      meta: seoMeta({ title, description, path, locale: "hy_AM" }),
      links: [...hreflangLinks(path), ...canonicalLink(path)],
      scripts: [
        {
          type: "application/ld+json" as const,
          children: JSON.stringify(
            breadcrumbJsonLd([
              { name: "Smeg Armenia", path: "/" },
              { name: hy["nav.service"] ?? "Service", path },
            ]),
          ),
        },
      ],
    };
  },
  component: ServicePage,
});

function ServicePage() {
  const { t } = useI18n();

  const cards = [
    {
      icon: ShieldCheck,
      title: t("service.warranty.title"),
      body: t("service.warranty.body"),
    },
    {
      icon: Wrench,
      title: t("service.support.title"),
      body: t("service.support.body"),
    },
    {
      icon: HelpCircle,
      title: t("service.faq.title"),
      body: t("service.faq.body"),
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="pt-14 md:pt-20">
        <section className="border-b border-border/60 bg-secondary/30">
          <div className="mx-auto max-w-[1400px] px-4 py-12 md:px-10 md:py-20">
            <p className="eyebrow text-muted-foreground">{t("service.eyebrow")}</p>
            <h1 className="mt-3 font-serif text-[clamp(2rem,5vw,3.5rem)] leading-tight">{t("service.title")}</h1>
            <p className="mt-5 max-w-2xl text-base text-muted-foreground md:text-lg">{t("service.intro")}</p>
          </div>
        </section>

        <section className="site-section">
          <div className="mx-auto grid max-w-[1400px] grid-cols-1 gap-6 px-4 md:grid-cols-3 md:px-10">
            {cards.map((card, i) => (
              <Reveal key={card.title} delay={i * 0.06}>
                <div className="h-full rounded-sm border border-border bg-background p-6 md:p-8">
                  <card.icon className="h-6 w-6 text-foreground/70" />
                  <h2 className="mt-4 font-serif text-xl">{card.title}</h2>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{card.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        <section className="site-section border-t border-border/60 bg-secondary/20">
          <div className="mx-auto max-w-[1400px] px-4 md:px-10">
            <SectionHeader eyebrow={t("service.contacts.eyebrow")} title={t("service.contacts.title")} />
            <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-12">
              <Reveal className="lg:col-span-5">
                <p className="max-w-md text-base text-muted-foreground">{t("service.contacts.body")}</p>
                <ul className="mt-8 space-y-4 text-sm">
                  <li>
                    <a
                      href={googleMapsDirectionsUrl()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-start gap-3 text-foreground/85 hover:text-foreground"
                    >
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>{t("section.dealer.address")}</span>
                    </a>
                  </li>
                  <li>
                    <a href="tel:+37460680088" className="flex items-center gap-3 text-foreground/85 hover:text-foreground">
                      <Phone className="h-4 w-4 shrink-0" />
                      +374 60 68 00 88
                    </a>
                  </li>
                  <li>
                    <a href="tel:+37498580085" className="flex items-center gap-3 text-foreground/85 hover:text-foreground">
                      <Phone className="h-4 w-4 shrink-0" />
                      +374 98 58 00 85
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://wa.me/37498580085"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 text-foreground/85 hover:text-foreground"
                    >
                      <MessageCircle className="h-4 w-4 shrink-0" />
                      WhatsApp
                    </a>
                  </li>
                  <li>
                    <a href="mailto:smeg@smeg.am" className="flex items-center gap-3 text-foreground/85 hover:text-foreground">
                      <Mail className="h-4 w-4 shrink-0" />
                      smeg@smeg.am
                    </a>
                  </li>
                </ul>
                <p className="mt-8 text-sm text-muted-foreground">{t("service.hours")}</p>
                <Link to="/" hash="contact" className="smeg-underline mt-6 inline-block text-sm uppercase tracking-[0.16em]">
                  {t("service.toShowroom")} →
                </Link>
              </Reveal>
              <Reveal className="lg:col-span-7" delay={0.08}>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <ContactForm className="rounded-sm border border-border bg-background p-6" />
                  <ShowroomMapEmbed title={t("hoc.contact.mapTitle")} className="min-h-[280px]" />
                </div>
              </Reveal>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
