import { motion } from "motion/react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { categoryLabel } from "@/lib/category-i18n";

const DEFAULT_KEYS = [
  "Refrigerators",
  "Ovens",
  "Hobs",
  "Hoods",
  "Dishwashers",
  "Wine coolers",
  "Espresso coffee machines",
  "Kettles",
  "Toasters",
  "Stand mixers",
] as const;

function parseMarqueeText(raw: string | undefined, lang: "ru" | "en" | "hy"): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(/[\n,|]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((item) => {
      if (/^[A-Za-z][A-Za-z\s/&-]*$/.test(item) && lang !== "en") {
        return categoryLabel(item, lang);
      }
      return item;
    });
}

export function Marquee() {
  const { lang, t } = useI18n();
  const { data: customText } = useQuery({
    queryKey: ["marquee-content"],
    queryFn: async () => {
      const { data } = await supabase.from("site_content").select("value").eq("key", "marquee").maybeSingle();
      const block = (data?.value ?? {}) as Record<string, Partial<Record<"ru" | "en" | "hy", string>>>;
      return block["marquee.text"]?.[lang] ?? block["marquee.text"]?.hy ?? "";
    },
    staleTime: 60_000,
  });

  const fromAdmin = parseMarqueeText(customText, lang);
  const words =
    fromAdmin.length > 0
      ? fromAdmin
      : DEFAULT_KEYS.map((k) => categoryLabel(k, lang));

  return (
    <div className="overflow-hidden border-y border-border bg-background py-4 md:py-6">
      <motion.div
        className="flex gap-10 whitespace-nowrap md:gap-16"
        animate={{ x: ["0%", "-50%"] }}
        transition={{ duration: 45, ease: "linear", repeat: Infinity }}
      >
        {[...words, ...words, ...words].map((w, i) => (
          <span key={i} className="font-serif text-xl text-foreground/70 md:text-5xl">
            {w} <span className="mx-4 text-accent md:mx-6">·</span>
          </span>
        ))}
      </motion.div>
    </div>
  );
}
