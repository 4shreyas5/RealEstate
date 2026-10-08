import type { Metadata } from "next";
import { searchProperties } from "@/lib/properties";
import { getAllCategories, getCitiesWithListings } from "@/lib/taxonomy";
import { prisma } from "@/lib/prisma";
import { parseSearchParams, type SearchParams } from "@/lib/validations/search";
import { SearchExperience } from "@/components/search/search-experience";
import { getT } from "@/i18n/server";

export const metadata: Metadata = {
  title: "Search properties",
  alternates: {
    canonical: "/search",
    languages: { en: "/search?hl=en", hi: "/search?hl=hi", "x-default": "/search?hl=en" },
  },
};
export const dynamic = "force-dynamic";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const filters = parseSearchParams(params);

  const [{ properties, count, hasMore }, categories, amenities, cities, { t }] = await Promise.all([
    searchProperties(filters),
    getAllCategories(),
    prisma.amenity.findMany({ orderBy: { name: "asc" } }),
    getCitiesWithListings(),
    getT(),
  ]);

  return (
    <div>
      <h1 className="sr-only">{t("pages.searchHeading")}</h1>
      <SearchExperience
        properties={properties}
        count={count}
        hasMore={hasMore}
        taxonomy={{
          categories,
          cities: cities.map((c) => ({ id: c.id, name: c.name })),
          amenities: amenities.map((a) => ({ id: a.id, name: a.name })),
        }}
        emptyMessage={t("search.noPropertiesMatch")}
      />
    </div>
  );
}
