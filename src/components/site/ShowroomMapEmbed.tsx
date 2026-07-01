import { useI18n } from "@/lib/i18n";
import { googleMapsEmbedUrl } from "@/lib/showroom-map";
import { cn } from "@/lib/utils";

type ShowroomMapEmbedProps = {
  title: string;
  className?: string;
};

export function ShowroomMapEmbed({ title, className }: ShowroomMapEmbedProps) {
  const { lang } = useI18n();
  const hl = lang === "hy" ? "hy" : lang === "en" ? "en" : "ru";

  return (
    <div
      className={cn(
        "relative aspect-[4/3] overflow-hidden rounded-sm border border-border bg-secondary lg:aspect-auto lg:min-h-[280px]",
        className,
      )}
    >
      <iframe
        title={title}
        src={googleMapsEmbedUrl(hl)}
        className="h-full w-full min-h-[240px] grayscale-[40%]"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
      />
    </div>
  );
}
