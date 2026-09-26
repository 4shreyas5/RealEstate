import type { Metadata } from "next";
import { searchProperties } from "@/lib/properties";
import { getAllCategories, getCitiesWithListings } from "@/lib/taxonomy";
import { prisma } from "@/lib/prisma";
import { parseSearchParams, type SearchParams } from "@/lib/validations/search";
import { SearchExperience } from "@/components/search/search-experience";

export const metadata: Metadata = {
  title: "Properties for Rent",
  description:
    "Browse curated properties for rent — every home shown here has been seen, shortlisted, and photographed by our own team.",
  alternates: { canonical: "/rent" },
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

  const [{ properties, count, hasMore }, categories, amenities, cities] = await Promise.all([
    searchProperties(filters),
    getAllCategories(),
    prisma.amenity.findMany({ orderBy: { name: "asc" } }),
    getCitiesWithListings(),
  ]);

  return (
    <div>
      <div className="border-b border-border px-4 py-8 sm:px-6 lg:px-10">
        <h1 className="font-display text-3xl font-medium text-ink">Properties for Rent</h1>
        <p className="mt-2 text-ink-secondary">
          {count} curated {count === 1 ? "home" : "homes"} available to rent.
        </p>
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
        emptyMessage="No properties for rent match these filters. Try widening your price range or clearing a filter."
      />
    </div>
  );
}
