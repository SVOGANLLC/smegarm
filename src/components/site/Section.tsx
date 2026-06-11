import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Reveal({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.9, delay, ease: [0.2, 0.7, 0.2, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  align = "left",
  className,
  eyebrowKey,
  titleKey,
}: {
  eyebrow: string;
  title: ReactNode;
  align?: "left" | "center";
  className?: string;
  eyebrowKey?: string;
  titleKey?: string;
}) {
  return (
    <Reveal className={cn(align === "center" && "text-center", className)}>
      <p data-ck={eyebrowKey} className="eyebrow text-accent">{eyebrow}</p>
      <h2 data-ck={titleKey} className="mt-4 display-xl text-[clamp(2rem,5vw,4.5rem)] text-foreground whitespace-pre-line">
        {title}
      </h2>
    </Reveal>
  );
}