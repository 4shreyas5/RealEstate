import { cookies, headers } from "next/headers";
import { LOCALE_COOKIE, LOCALE_HEADER, defaultLocale, isLocale, type Locale } from "./config";
import { getDictionary } from "./dictionaries";
import { createTranslator } from "./translate";

/** The proxy (src/proxy.ts) resolves the locale once per request and
 * forwards it as a header — this is what keeps /admin on "en" even when a
 * visitor's cookie says "hi" from browsing the public site. The cookie is
 * read only as a fallback (e.g. a render that somehow bypassed the proxy).
 * Both `headers()` and `cookies()` are memoized by Next per request, so
 * calling this from many server components is cheap. */
export async function getLocale(): Promise<Locale> {
  const headerValue = (await headers()).get(LOCALE_HEADER);
  if (isLocale(headerValue)) return headerValue;

  const cookieValue = (await cookies()).get(LOCALE_COOKIE)?.value;
  return isLocale(cookieValue) ? cookieValue : defaultLocale;
}

export async function getT() {
  const locale = await getLocale();
  const dict = getDictionary(locale);
  return { t: createTranslator(dict), locale, dict };
}
