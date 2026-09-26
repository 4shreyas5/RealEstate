export const PROPERTY_IMAGE_BUCKET = "property-images";
export const MAX_PROPERTY_IMAGE_BYTES = 10 * 1024 * 1024;
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];

const PUBLIC_PREFIX = "/storage/v1/object/public/";

function parse(url: string) {
  try {
    return new URL(url);
  } catch {
    return null;
  }
}

/** Public Supabase Storage URL — the only remote host production is allowed to render (see next.config.ts). */
export function isSupabaseStorageUrl(url: string | null | undefined): url is string {
  if (!url) return false;
  const u = parse(url);
  return !!u && u.protocol === "https:" && u.hostname.endsWith(".supabase.co") && u.pathname.startsWith(PUBLIC_PREFIX);
}

/**
 * Mirrors next.config.ts's remotePatterns: Supabase Storage always, the
 * seed's picsum.photos placeholders only outside production. Anything else
 * would be rejected by next/image (HTTP 400), so callers skip it instead.
 */
export function isRenderableImageUrl(url: string | null | undefined): url is string {
  if (isSupabaseStorageUrl(url)) return true;
  if (process.env.NODE_ENV === "production" || !url) return false;
  return parse(url)?.hostname === "picsum.photos";
}

/** Object path inside the property-images bucket, or null if the URL isn't one of ours. */
export function propertyImagePathFromUrl(url: string): string | null {
  if (!isSupabaseStorageUrl(url)) return null;
  const marker = `${PUBLIC_PREFIX}${PROPERTY_IMAGE_BUCKET}/`;
  const pathname = new URL(url).pathname;
  return pathname.startsWith(marker) ? decodeURIComponent(pathname.slice(marker.length)) : null;
}

/** Storage-safe object name: original file names (spaces, unicode, quotes) are never used. */
export function buildPropertyImagePath(propertyId: string, file: { name: string; type: string }) {
  const fromName = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "");
  const fromType = file.type.split("/")[1]?.replace("jpeg", "jpg");
  const ext = fromName && fromName.length <= 5 ? fromName : (fromType ?? "jpg");
  return `${propertyId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
}
