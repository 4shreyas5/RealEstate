import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { LOCALE_COOKIE, LOCALE_HEADER, LOCALE_QUERY_PARAM, defaultLocale, isLocale } from "@/i18n/config";

const ONE_YEAR = 60 * 60 * 24 * 365;

/** Negotiates the public-site locale without ever changing the URL: the
 * `hl` query param (for shareable/hreflang links) wins for this request and
 * is persisted; otherwise the existing cookie wins; otherwise the browser's
 * Accept-Language is sniffed once, for first-time visitors only. Once a
 * visitor has a cookie, it is never overridden by Accept-Language again. */
function resolveLocale(request: NextRequest): { locale: string; shouldSetCookie: boolean } {
  const queryLocale = request.nextUrl.searchParams.get(LOCALE_QUERY_PARAM);
  if (isLocale(queryLocale)) {
    return { locale: queryLocale, shouldSetCookie: true };
  }

  const cookieLocale = request.cookies.get(LOCALE_COOKIE)?.value;
  if (isLocale(cookieLocale)) {
    return { locale: cookieLocale, shouldSetCookie: false };
  }

  const acceptLanguage = request.headers.get("accept-language") ?? "";
  const prefersHindi = acceptLanguage
    .split(",")
    .some((part) => part.trim().toLowerCase().startsWith("hi"));
  const negotiated = prefersHindi ? "hi" : defaultLocale;
  return { locale: negotiated, shouldSetCookie: true };
}

export async function proxy(request: NextRequest) {
  const response = await updateSession(request);

  const isAdminOrApi = request.nextUrl.pathname.startsWith("/admin") || request.nextUrl.pathname.startsWith("/api");

  // A redirect (e.g. unauthenticated /admin → /admin/login) never renders a
  // Server Component on this request — the browser follows it and a fresh
  // request hits the proxy again — so there's nothing to resolve a locale
  // header for here.
  if (response.headers.get("location")) {
    return response;
  }

  const locale = isAdminOrApi
    ? { locale: defaultLocale, shouldSetCookie: false }
    : resolveLocale(request);

  // Forward the resolved locale to Server Components via a request header
  // (read by src/i18n/server.ts) — this is what keeps <html lang> correct
  // on /admin even when a visitor already has a Hindi cookie from the
  // public site, since admin stays English-only regardless of that cookie.
  const forwardedHeaders = new Headers(request.headers);
  forwardedHeaders.set(LOCALE_HEADER, locale.locale);
  const finalResponse = NextResponse.next({ request: { headers: forwardedHeaders } });
  response.cookies.getAll().forEach((cookie) => finalResponse.cookies.set(cookie));

  if (!isAdminOrApi && locale.shouldSetCookie) {
    finalResponse.cookies.set(LOCALE_COOKIE, locale.locale, {
      maxAge: ONE_YEAR,
      path: "/",
      sameSite: "lax",
    });
  }

  return finalResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
