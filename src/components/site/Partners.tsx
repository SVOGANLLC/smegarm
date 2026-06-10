import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n, pickLocalized } from "@/lib/i18n";
import { Reveal } from "./Section";

type Partner = {
  id: string;
  name: string;
  name_en: string | null;
  name_hy: string | null;
  description: string | null;
  description_en: string | null;
  description_hy: string | null;
  logo_url: string | null;
  link_url: string | null;
};

export function Partners() {
  const { t, lang } = useI18n();
  const [items, setItems] = useState<Partner[]>([]);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("partners")
        .select("id,name,name_en,name_hy,description,description_en,description_hy,logo_url,link_url")
        .eq("is_published", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (!cancelled && data) setItems(data as Partner[]);
    })();
    return () => { cancelled = true; };
  }, []);

  if (items.length === 0) return null;

  return (
    <section id="partners" className="bg-background">
      <div className="mx-auto max-w-[1400px] px-6 py-20 md:px-10 md:py-28">
        <Reveal className="text-center">
          <p data-ck="section.partners.eyebrow" className="eyebrow text-accent">
            {t("section.partners.eyebrow")}
          </p>
          <h2 data-ck="section.partners.title" className="mt-4 display-xl text-[clamp(2rem,4.5vw,3.75rem)] text-foreground">
            {t("section.partners.title")}
          </h2>
        </Reveal>

        <div className="mt-14 grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((p) => {
            const name = pickLocalized(p as unknown as Record<string, unknown>, "name", lang) || p.name;
            const desc = pickLocalized(p as unknown as Record<string, unknown>, "description", lang);
            const Card = (
              <div className="group flex h-full flex-col items-center text-center">
                <div className="flex h-24 w-full items-center justify-center">
                  {p.logo_url ? (
                    <img
                      src={p.logo_url}
                      alt={name}
                      loading="lazy"
                      className="max-h-20 max-w-[180px] object-contain opacity-90 transition-opacity group-hover:opacity-100"
                    />
                  ) : (
                    <span className="font-serif text-2xl text-foreground">{name}</span>
                  )}
                </div>
                {p.logo_url && (
                  <p className="mt-4 font-serif text-lg text-foreground">{name}</p>
                )}
                {desc && <p className="mt-2 max-w-xs text-sm text-muted-foreground">{desc}</p>}
              </div>
            );
            return p.link_url ? (
              <a key={p.id} href={p.link_url} target="_blank" rel="noopener noreferrer">
                {Card}
              </a>
            ) : (
              <div key={p.id}>{Card}</div>
            );
          })}
        </div>
      </div>
    </section>
  );
}