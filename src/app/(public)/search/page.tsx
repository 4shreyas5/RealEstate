import type { Metadata } from "next";
import { searchProperties } from "@/lib/properties";
import { getAllCategories, getCitiesWithListings } from "@/lib/taxonomy";
import { prisma } from "@/lib/prisma";
import { parseSearchParams, type SearchParams } from "@/lib/validations/search";
import { SearchExperience } from "@/components/search/search-experience";

export const metadata: Metadata = { title: "Search properties" };
export const dynamic = "force-dynamic";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const filters = parseSearchParams(params);

  const [{ properties, count, hasMore }, categories, amenities, cities] = await Promise.all([
    searchProperties(filters),
    getAllCategories(),
    prisma.amenity.findMany({ orderBy: { name: "asc" } }),
    getCitiesWithListings(),
  ]);

  return (
    <div>
      <h1 className="sr-only">Search properties</h1>
      <SearchExperience
        properties={properties}
        count={count}
        hasMore={hasMore}
        taxonomy={{
          categories,
          cities: cities.map((c) => ({ id: c.id, name: c.name })),
          amenities: amenities.map((a) => ({ id: a.id, name: a.name })),
        }}
      />
    </div>
  );
}
