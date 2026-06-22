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
  /** Resolved URL for the public page (empty = nothing to show). */
  heroImage: string;
  /** Custom upload URL, or null when the bundled default is used. */
  heroImageStored: string | null;
  heroVisible: boolean;
  bannerImage: string;
  bannerVisible: boolean;
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

function cfgImage(value: BlockValue, key: string, fallback?: string): string {
  if (!(key in value)) return fallback ?? "";
  const v = value[key];
  return v?.ru?.trim() ?? v?.en?.trim() ?? v?.hy?.trim() ?? "";
}

function cfgBool(value: BlockValue, key: string, fallback: boolean): boolean {
  if (!(key in value)) return fallback;
  const raw = cfg(value, key, fallback ? "1" : "0").toLowerCase();
  if (raw === "0" || raw === "false" || raw === "off" || raw === "no") return false;
  if (raw === "1" || raw === "true" || raw === "on" || raw === "yes") return true;
  return fallback;
}

export function parseHouseOfCoffeeMedia(value: BlockValue = {}): HouseOfCoffeeMedia {
  const heroImageStored = "config.heroImage" in value ? cfgImage(value, "config.heroImage", "") : null;
  const heroImage =
    heroImageStored === null ? DEFAULT_HOC_HERO_IMAGE : heroImageStored;
  const bannerImage = cfgImage(value, "config.bannerImage", "");

  return {
    youtubeId: cfg(value, "config.youtubeId", HOUSE_OF_COFFEE_YOUTUBE_ID),
    heroImage,
    heroImageStored,
    heroVisible: cfgBool(value, "config.heroVisible", true),
    bannerImage,
    bannerVisible: cfgBool(value, "config.bannerVisible", Boolean(bannerImage)),
    spotlightSku: cfg(value, "config.spotlightSku", HOUSE_OF_COFFEE_SPOTLIGHT.sku),
    spotlightImage: cfg(value, "config.spotlightImage", HOUSE_OF_COFFEE_SPOTLIGHT.image),
    builtinImage: cfg(value, "config.builtinImage", HOUSE_OF_COFFEE_BUILTIN_IMAGE),
  };
}

export function setHouseOfCoffeeConfig(value: BlockValue, key: string, text: string): BlockValue {
  const patch = { ru: text, en: text, hy: text };
  return { ...value, [key]: patch };
}

export function setHouseOfCoffeeBool(value: BlockValue, key: string, on: boolean): BlockValue {
  return setHouseOfCoffeeConfig(value, key, on ? "1" : "0");
}
