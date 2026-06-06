import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import heroImg from "@/assets/hero-fridge.jpg";
import { useI18n } from "@/lib/i18n";

export function Hero() {
  const { t } = useI18n();
  const title = t("hero.title");
  return (
    <section className="relative h-[100svh] min-h-[640px] w-full overflow-hidden bg-background">
      <motion.div
        initial={{ scale: 1.08 }}
        animate={{ scale: 1 }}
        transition={{ duration: 2.4, ease: [0.2, 0.7, 0.2, 1] }}
        className="absolute inset-0"
      >
        <img
          src={heroImg}
          alt=""
          width={1920}
          height={1080}
          className="h-full w-full object-cover"
          fetchPriority="high"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/70 via-background/10 to-background/30" />
      </motion.div>

      <div className="relative z-10 mx-auto flex h-full max-w-[1400px] flex-col justify-end px-6 pb-16 md:px-10 md:pb-24">
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="eyebrow text-foreground/70"
        >
          {t("hero.eyebrow")}
        </motion.p>

        <h1 className="mt-6 max-w-[14ch] display-xl text-[clamp(2.75rem,8vw,7.5rem)] text-foreground">
          {title.split("\n").map((line, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.5 + i * 0.12, ease: [0.2, 0.7, 0.2, 1] }}
              className="block"
            >
              {line}
            </motion.span>
          ))}
        </h1>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.1 }}
          className="mt-8 flex max-w-xl flex-col gap-6"
        >
          <p className="text-base text-foreground/75 md:text-lg">{t("hero.subtitle")}</p>
          <div className="flex flex-wrap items-center gap-4">
            <a
              href="#catalog"
              className="group inline-flex items-center gap-3 rounded-full bg-foreground px-7 py-3.5 text-sm font-medium tracking-wide text-background transition-transform hover:-translate-y-0.5"
            >
              {t("hero.cta")}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </a>
            <a
              href="#story"
              className="smeg-underline text-sm uppercase tracking-[0.2em] text-foreground/80"
            >
              {t("hero.cta2")}
            </a>
          </div>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4, duration: 1 }}
        className="absolute bottom-6 right-6 hidden flex-col items-end gap-2 text-[10px] uppercase tracking-[0.3em] text-foreground/50 md:flex"
      >
        <span>Made in Italy</span>
        <span>Since 1948</span>
      </motion.div>
    </section>
  );
}