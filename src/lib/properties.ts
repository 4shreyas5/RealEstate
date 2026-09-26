import { cache } from "react";
import { prisma } from "@/lib/prisma";
import type { ListingType, Prisma } from "@prisma/client";
import { isRenderableImageUrl } from "@/lib/storage";

/** The exact fields the property card needs — nothing else. */
export interface PropertyCardData {
  id: string;
  slug: string;
  title: string;
  listingType: ListingType;
  rentPeriod: string | null;
  priceAmount: number;
  priceCurrency: string;
  areaValue: number;
  areaUnit: string;
  bedrooms: number | null;
  bathrooms: number | null;
  cityName: string;
  localityName: string;
  status: string;
  coverImage: { url: string; altText: string } | null;
}

const cardSelect = {
  id: true,
  slug: true,
  title: true,
  listingType: true,
  rentPeriod: true,
  priceAmount: true,
  priceCurrency: true,
  areaValue: true,
  areaUnit: true,
  bedrooms: true,
  bathrooms: true,
  status: true,
  city: { select: { name: true } },
  locality: { select: { name: true } },
  images: {
    where: { isCover: true },
    take: 1,
    select: { url: true, altText: true },
  },
} satisfies Prisma.PropertySelect;

type RawCardProperty = Prisma.PropertyGetPayload<{ select: typeof cardSelect }>;

function toCardData(property: RawCardProperty): PropertyCardData {
  return {
    id: property.id,
    slug: property.slug,
    title: property.title,
    listingType: property.listingType,
    rentPeriod: property.rentPeriod,
    priceAmount: Number(property.priceAmount),
    priceCurrency: property.priceCurrency,
    areaValue: Number(property.areaValue),
    areaUnit: property.areaUnit,
    bedrooms: property.bedrooms,
    bathrooms: property.bathrooms,
    cityName: property.city.name,
    localityName: property.locality.name,
    status: property.status,
    coverImage: property.images[0] && isRenderableImageUrl(property.images[0].url) ? property.images[0] : null,
  };
}

export async function getFeaturedProperties(limit = 6): Promise<PropertyCardData[]> {
  const properties = await prisma.property.findMany({
    where: { status: "PUBLISHED", featured: true },
    select: cardSelect,
    orderBy: [{ featuredEntries: { _count: "desc" } }, { publishedAt: "desc" }],
    take: limit,
  });
  return properties.map(toCardData);
}

export async function getRecentProperties(limit = 8, excludeIds: string[] = []) {
  const properties = await prisma.property.findMany({
    where: { status: "PUBLISHED", id: { notIn: excludeIds } },
    select: cardSelect,
    orderBy: { publishedAt: "desc" },
    take: limit,
  });
  return properties.map(toCardData);
}

export async function getSimilarProperties(
  propertyId: string,
  localityId: string,
  limit = 6,
): Promise<PropertyCardData[]> {
  const properties = await prisma.property.findMany({
    where: { status: "PUBLISHED", localityId, id: { not: propertyId } },
    select: cardSelect,
    orderBy: { publishedAt: "desc" },
    take: limit,
  });
  return properties.map(toCardData);
}

/**
 * Cached per request — the detail page calls this from both
 * `generateMetadata` and the page body; `cache()` dedupes those into one
 * database round trip instead of two.
 */
export const getPropertyBySlug = cache(async (slug: string) => {
  return prisma.property.findUnique({
    where: { slug },
    include: {
      category: true,
      city: true,
      locality: true,
      neighbourhood: true,
      images: { orderBy: { position: "asc" } },
      amenities: { include: { amenity: true } },
    },
  });
});

export const DEFAULT_SEARCH_PAGE_SIZE = 24;

export interface PropertySearchFilters {
  countryId?: string;
  stateId?: string;
  cityId?: string;
  localityId?: string;
  neighbourhoodId?: string;
  listingType?: ListingType;
  categoryId?: string;
  minPrice?: number;
  maxPrice?: number;
  bedrooms?: number;
  furnishing?: string;
  constructionStatus?: string;
  amenityIds?: string[];
  sort?: "newest" | "price_asc" | "price_desc";
  limit?: number;
  offset?: number;
}

export async function searchProperties(filters: PropertySearchFilters) {
  const where: Prisma.PropertyWhereInput = {
    status: "PUBLISHED",
    // Country / state are reached through the city's relations, so a property
    // is searchable at every level of the hierarchy without denormalising.
    ...(filters.countryId && { city: { state: { countryId: filters.countryId } } }),
    ...(filters.stateId && !filters.countryId && { city: { stateId: filters.stateId } }),
    ...(filters.stateId && filters.countryId && { city: { stateId: filters.stateId, state: { countryId: filters.countryId } } }),
    ...(filters.cityId && { cityId: filters.cityId }),
    ...(filters.localityId && { localityId: filters.localityId }),
    ...(filters.neighbourhoodId && { neighbourhoodId: filters.neighbourhoodId }),
    ...(filters.listingType && { listingType: filters.listingType }),
    ...(filters.categoryId && { categoryId: filters.categoryId }),
    ...(filters.bedrooms !== undefined && { bedrooms: { gte: filters.bedrooms } }),
    ...(filters.furnishing && { furnishing: filters.furnishing as never }),
    ...(filters.constructionStatus && {
      constructionStatus: filters.constructionStatus as never,
    }),
    ...(filters.amenityIds && filters.amenityIds.length > 0
      ? { amenities: { some: { amenityId: { in: filters.amenityIds } } } }
      : {}),
    ...((filters.minPrice !== undefined || filters.maxPrice !== undefined) && {
      priceAmount: {
        ...(filters.minPrice !== undefined && { gte: filters.minPrice }),
        ...(filters.maxPrice !== undefined && { lte: filters.maxPrice }),
      },
    }),
  };

  const primarySort: Prisma.PropertyOrderByWithRelationInput =
    filters.sort === "price_asc"
      ? { priceAmount: "asc" }
      : filters.sort === "price_desc"
        ? { priceAmount: "desc" }
        : { publishedAt: "desc" };

  // `id` as a secondary key keeps result order stable across pages —
  // `publishedAt`/price alone can tie, which would otherwise skip or repeat
  // rows between one "Show more" fetch and the next.
  const orderBy: Prisma.PropertyOrderByWithRelationInput[] = [primarySort, { id: "asc" }];

  // Clamped regardless of caller — this also backs a public API route, so an
  // arbitrary/huge limit or negative offset can't turn into an unbounded scan.
  const limit = Math.min(Math.max(filters.limit ?? DEFAULT_SEARCH_PAGE_SIZE, 1), 60);
  const offset = Math.max(filters.offset ?? 0, 0);

  const [properties, count] = await Promise.all([
    prisma.property.findMany({
      where,
      select: {
        ...cardSelect,
        latitude: true,
        longitude: true,
      },
      orderBy,
      skip: offset,
      take: limit,
    }),
    prisma.property.count({ where }),
  ]);

  return {
    count,
    hasMore: offset + properties.length < count,
    properties: properties.map((property) => ({
      ...toCardData(property),
      latitude: property.latitude,
      longitude: property.longitude,
    })),
  };
}
