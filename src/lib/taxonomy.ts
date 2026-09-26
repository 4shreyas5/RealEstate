import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

export const LOCATIONS_CACHE_TAG = "locations";
const LOCATIONS_REVALIDATE_SECONDS = 300;

export interface ListedCity {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  stateName: string;
  count: number;
}

/**
 * Cities that currently have at least one PUBLISHED property, busiest first.
 * This — not "every city in the database" — is what public navigation, the
 * homepage search, the filter sheet and the sitemap are built from, so a
 * pan-India location taxonomy doesn't turn into 170 empty pages.
 * Cached (shared across requests) and invalidated via the "locations" tag.
 */
export const getCitiesWithListings = unstable_cache(
  async (): Promise<ListedCity[]> => {
    const groups = await prisma.property.groupBy({
      by: ["cityId"],
      where: { status: "PUBLISHED" },
      _count: { _all: true },
    });
    if (groups.length === 0) return [];

    const cities = await prisma.city.findMany({
      where: { id: { in: groups.map((g) => g.cityId) } },
      select: { id: true, name: true, slug: true, imageUrl: true, state: { select: { name: true } } },
    });
    const counts = new Map(groups.map((g) => [g.cityId, g._count._all]));

    return cities
      .map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        imageUrl: c.imageUrl,
        stateName: c.state.name,
        count: counts.get(c.id) ?? 0,
      }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  },
  ["cities-with-listings"],
  { revalidate: LOCATIONS_REVALIDATE_SECONDS, tags: [LOCATIONS_CACHE_TAG] },
);

/** Featured city first (admin-curated), else the busiest city, else any city. */
export async function getPrimaryCity(listed: ListedCity[]) {
  const featured = await prisma.featuredCity.findFirst({
    orderBy: { position: "asc" },
    include: { city: { select: { id: true, name: true, slug: true, imageUrl: true } } },
  });
  if (featured) return featured.city;
  if (listed[0]) return listed[0];
  return prisma.city.findFirst({
    orderBy: { name: "asc" },
    select: { id: true, name: true, slug: true, imageUrl: true },
  });
}

/** Localities that have published listings, busiest first — falls back to alphabetical if none do yet. */
export const getExploreLocations = unstable_cache(
  async (limit = 6) => {
    const groups = await prisma.property.groupBy({
      by: ["localityId"],
      where: { status: "PUBLISHED" },
      _count: { _all: true },
      orderBy: { _count: { localityId: "desc" } },
      take: limit,
    });

    const include = { city: { select: { name: true, slug: true } } };
    let localities = groups.length
      ? await prisma.locality.findMany({ where: { id: { in: groups.map((g) => g.localityId) } }, include })
      : await prisma.locality.findMany({ take: limit, orderBy: { name: "asc" }, include });

    if (groups.length) {
      const order = new Map(groups.map((g, i) => [g.localityId, i]));
      localities = localities.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
    }

    return localities.map((locality) => ({
      id: locality.id,
      name: locality.name,
      slug: locality.slug,
      citySlug: locality.city.slug,
      cityName: locality.city.name,
      imageUrl: locality.imageUrl,
    }));
  },
  ["explore-locations"],
  { revalidate: LOCATIONS_REVALIDATE_SECONDS, tags: [LOCATIONS_CACHE_TAG] },
);

export async function getExploreCategories(limit = 6) {
  const categories = await prisma.category.findMany({
    take: limit,
    orderBy: { name: "asc" },
  });

  return categories.map((category) => ({
    id: category.id,
    name: category.name,
    slug: category.slug,
    imageUrl: category.imageUrl,
  }));
}

/** Every city (unfiltered) — for admin-style pickers and fallbacks only, never for public navigation. */
export async function getAllCities() {
  const cities = await prisma.city.findMany({ orderBy: { name: "asc" } });
  return cities.map((c) => ({ id: c.id, name: c.name, slug: c.slug, imageUrl: c.imageUrl }));
}

export async function getAllCategories() {
  const categories = await prisma.category.findMany({ orderBy: { name: "asc" } });
  return categories.map((c) => ({ id: c.id, name: c.name, slug: c.slug }));
}
