import { motion } from "motion/react";

const words = [
  "Refrigerators",
  "Ovens",
  "Hobs",
  "Hoods",
  "Dishwashers",
  "Wine coolers",
  "Espresso",
  "Kettles",
  "Toasters",
  "Mixers",
];

export function Marquee() {
  return (
    <div className="overflow-hidden border-y border-border bg-background py-6">
      <motion.div
        className="flex gap-16 whitespace-nowrap"
        animate={{ x: ["0%", "-50%"] }}
        transition={{ duration: 40, ease: "linear", repeat: Infinity }}
      >
        {[...words, ...words, ...words].map((w, i) => (
          <span key={i} className="font-serif text-3xl text-foreground/70 md:text-5xl">
            {w} <span className="mx-6 text-accent">·</span>
          </span>
        ))}
      </motion.div>
    </div>
  );
}