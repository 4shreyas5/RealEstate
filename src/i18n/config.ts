export const locales = ["en", "hi"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

/** Cookie that persists a user's explicit language choice. Not localStorage —
 * must be readable on the server so the very first response in the new
 * language is correct, with no client-side flash. */
export const LOCALE_COOKIE = "NEXT_LOCALE";

/** Query param that forces a locale for one request (used for hreflang
 * alternates and shareable language-specific links) without introducing
 * locale-prefixed routes. */
export const LOCALE_QUERY_PARAM = "hl";

/** Request header the proxy (src/proxy.ts) sets to the already-resolved
 * locale for this request — "en" on /admin and /api regardless of any
 * cookie, the negotiated value everywhere else. Server Components read
 * this instead of re-deriving the locale, so <html lang> on /admin can
 * never pick up a Hindi cookie left over from the public site. */
export const LOCALE_HEADER = "x-dreamit-locale";

export function isLocale(value: string | null | undefined): value is Locale {
  return !!value && (locales as readonly string[]).includes(value);
}

const NATIVE_NAMES: Record<Locale, string> = {
  en: "English",
  hi: "हिन्दी",
};

export function nativeLanguageName(locale: Locale) {
  return NATIVE_NAMES[locale];
}
