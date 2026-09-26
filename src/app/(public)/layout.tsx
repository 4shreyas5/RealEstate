import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { getCitiesWithListings } from "@/lib/taxonomy";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  // Cached (5 min, shared) — cities that actually have published listings.
  const cities = (await getCitiesWithListings()).map(({ id, name, slug }) => ({ id, name, slug }));

  return (
    <>
      <SiteHeader cities={cities} />
      <main className="flex-1">{children}</main>
      <SiteFooter cities={cities} />
    </>
  );
}
