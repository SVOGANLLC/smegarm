export const SHOWROOM_LAT = 40.164568;
export const SHOWROOM_LNG = 44.508932;

export const SHOWROOM_PLACE_QUERY = "Smeg Armenia, 2 Nar-Dos St, Yerevan, Armenia";

/** Embedded Google Maps iframe (no API key). */
export function googleMapsEmbedUrl(lang = "ru") {
  const q = encodeURIComponent(SHOWROOM_PLACE_QUERY);
  return `https://maps.google.com/maps?q=${q}&z=17&hl=${lang}&output=embed`;
}

/** Open place in Google Maps. */
export function googleMapsPlaceUrl() {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(SHOWROOM_PLACE_QUERY)}`;
}

/** Build driving directions in Google Maps. */
export function googleMapsDirectionsUrl() {
  return `https://www.google.com/maps/dir/?api=1&destination=${SHOWROOM_LAT},${SHOWROOM_LNG}`;
}
