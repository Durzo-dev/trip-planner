/**
 * Finds the position of an address with OpenStreetMap's free geocoder (Nominatim), so a place pasted as
 * a short Google Maps share link (which holds no coordinates) can still be drawn on the map. Used only
 * when the organiser saves a place whose coordinates are missing: one request per place, well within
 * Nominatim's usage policy (at most one request per second, no bulk use).
 */
const NOMINATIM = "https://nominatim.openstreetmap.org/search";

/** Reads the first result of a Nominatim search; null when there is none or it is not usable. */
export function readNominatim(body: unknown): { lat: number; lng: number } | null {
  if (!Array.isArray(body) || !body.length) return null;
  const lat = Number(body[0]?.lat);
  const lng = Number(body[0]?.lon);
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat, lng } : null;
}

export async function geocodeAddress(address: string, language: string): Promise<{ lat: number; lng: number } | null> {
  const params = new URLSearchParams({ format: "jsonv2", limit: "1", q: address, "accept-language": language });
  try {
    const res = await fetch(`${NOMINATIM}?${params}`, { signal: AbortSignal.timeout(8000) });
    return res.ok ? readNominatim(await res.json()) : null;
  } catch {
    return null;
  }
}
