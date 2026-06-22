import type { Lang } from "@/lib/i18n";
import {
  HOUSE_OF_COFFEE_BUILTIN_IMAGE,
  HOUSE_OF_COFFEE_SPOTLIGHT,
  HOUSE_OF_COFFEE_YOUTUBE_ID,
} from "@/lib/house-of-coffee";

export const DEFAULT_HOC_HERO_IMAGE = "/brand/house-of-coffee/hero-banner.jpg";
export const DEFAULT_HOC_BANNER_IMAGE = "/brand/house-of-coffee/banner-after-video.jpg";

export type HouseOfCoffeeMedia = {
  youtubeId: string;
  heroImage: string;
  bannerImage: string;
  spotlightSku: string;
  spotlightImage: string;
  builtinImage: string;
};

type BlockValue = Record<string, Partial<Record<Lang, string>>>;

function cfg(value: BlockValue, key: string, fallback: string): string {
  const v = value[key];
  const raw = v?.ru?.trim() || v?.en?.trim() || v?.hy?.trim();
  return raw || fallback;
}

export function parseHouseOfCoffeeMedia(value: BlockValue = {}): HouseOfCoffeeMedia {
  return {
    youtubeId: cfg(value, "config.youtubeId", HOUSE_OF_COFFEE_YOUTUBE_ID),
    heroImage: cfg(value, "config.heroImage", DEFAULT_HOC_HERO_IMAGE),
    bannerImage: cfg(value, "config.bannerImage", ""),
    spotlightSku: cfg(value, "config.spotlightSku", HOUSE_OF_COFFEE_SPOTLIGHT.sku),
    spotlightImage: cfg(value, "config.spotlightImage", HOUSE_OF_COFFEE_SPOTLIGHT.image),
    builtinImage: cfg(value, "config.builtinImage", HOUSE_OF_COFFEE_BUILTIN_IMAGE),
  };
}

export function setHouseOfCoffeeConfig(value: BlockValue, key: string, text: string): BlockValue {
  const patch = { ru: text, en: text, hy: text };
  return { ...value, [key]: patch };
}
