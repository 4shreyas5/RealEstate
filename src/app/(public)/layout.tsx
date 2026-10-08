import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { getCitiesWithListings } from "@/lib/taxonomy";
import { getLocale } from "@/i18n/server";
import { getDictionary } from "@/i18n/dictionaries";
import { LocaleProvider } from "@/i18n/locale-context";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  // Cached (5 min, shared) — cities that actually have published listings.
  const cities = (await getCitiesWithListings()).map(({ id, name, slug }) => ({ id, name, slug }));
  const locale = await getLocale();
  const dict = getDictionary(locale);

  return (
    <LocaleProvider locale={locale} dict={dict}>
      <SiteHeader cities={cities} />
      <main className="flex-1">{children}</main>
      <SiteFooter cities={cities} />
    </LocaleProvider>
  );
}
