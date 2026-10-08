import type { Metadata } from "next";
import { searchProperties } from "@/lib/properties";
import { getAllCategories, getCitiesWithListings } from "@/lib/taxonomy";
import { prisma } from "@/lib/prisma";
import { parseSearchParams, type SearchParams } from "@/lib/validations/search";
import { SearchExperience } from "@/components/search/search-experience";
import { getT } from "@/i18n/server";

export const metadata: Metadata = {
  title: "Properties for Rent",
  description:
    "Browse curated properties for rent — every home shown here has been seen, shortlisted, and photographed by our own team.",
  alternates: {
    canonical: "/rent",
    languages: { en: "/rent?hl=en", hi: "/rent?hl=hi", "x-default": "/rent?hl=en" },
  },
};
export const dynamic = "force-dynamic";

export default async function RentPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  // The transaction type is this page's identity, not a URL-driven filter —
  // always RENT regardless of what a hand-edited `type` query param says.
  const filters = { ...parseSearchParams(params), listingType: "RENT" as const };

  const [{ properties, count, hasMore }, categories, amenities, cities, { t }] = await Promise.all([
    searchProperties(filters),
    getAllCategories(),
    prisma.amenity.findMany({ orderBy: { name: "asc" } }),
    getCitiesWithListings(),
    getT(),
  ]);

  return (
    <div>
      <div className="border-b border-border px-4 py-8 sm:px-6 lg:px-10">
        <h1 className="font-display text-3xl font-medium text-ink">{t("pages.propertiesForRent")}</h1>
        <p className="mt-2 text-ink-secondary">{t("property.curatedHomesAvailableToRent", { count })}</p>
      </div>
      <SearchExperience
        properties={properties}
        count={count}
        hasMore={hasMore}
        taxonomy={{
          categories,
          cities: cities.map((c) => ({ id: c.id, name: c.name })),
          amenities: amenities.map((a) => ({ id: a.id, name: a.name })),
        }}
        lockedType="RENT"
        emptyMessage={t("search.noPropertiesForRent")}
      />
    </div>
  );
}
