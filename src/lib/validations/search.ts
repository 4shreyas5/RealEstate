export interface SearchParams {
  country?: string;
  state?: string;
  city?: string;
  locality?: string;
  neighbourhood?: string;
  type?: string;
  category?: string;
  minPrice?: string;
  maxPrice?: string;
  bedrooms?: string;
  furnishing?: string;
  construction?: string;
  amenities?: string; // comma-separated amenity ids
  sort?: string;
  offset?: string;
}

const LISTING_TYPES = new Set(["SALE", "RENT"]);
const FURNISHING_VALUES = new Set(["UNFURNISHED", "SEMI_FURNISHED", "FULLY_FURNISHED"]);
const CONSTRUCTION_VALUES = new Set(["UNDER_CONSTRUCTION", "READY_TO_MOVE"]);
const SORT_VALUES = new Set(["newest", "price_asc", "price_desc"]);

/** Location ids come straight from the URL — bounded and charset-limited so they can only ever be ids. */
function id(value: string | undefined) {
  return value && /^[A-Za-z0-9_-]{1,64}$/.test(value) ? value : undefined;
}

function toPositiveNumber(value: string | undefined) {
  if (!value) return undefined;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

/**
 * Every value here can come straight from a public URL — anything not on an
 * allowed list is dropped rather than passed through, so a malformed or
 * hand-edited query string degrades to "no filter" instead of a Prisma
 * validation error (a 500) or a bogus query.
 */
export function parseSearchParams(params: SearchParams) {
  return {
    countryId: id(params.country),
    stateId: id(params.state),
    cityId: id(params.city),
    localityId: id(params.locality),
    neighbourhoodId: id(params.neighbourhood),
    listingType: params.type && LISTING_TYPES.has(params.type) ? (params.type as "SALE" | "RENT") : undefined,
    categoryId: params.category || undefined,
    minPrice: toPositiveNumber(params.minPrice),
    maxPrice: toPositiveNumber(params.maxPrice),
    bedrooms: toPositiveNumber(params.bedrooms),
    furnishing: params.furnishing && FURNISHING_VALUES.has(params.furnishing) ? params.furnishing : undefined,
    constructionStatus:
      params.construction && CONSTRUCTION_VALUES.has(params.construction) ? params.construction : undefined,
    amenityIds: params.amenities
      ? [...new Set(params.amenities.split(",").filter(Boolean))].slice(0, 50)
      : undefined,
    sort: params.sort && SORT_VALUES.has(params.sort) ? (params.sort as "newest" | "price_asc" | "price_desc") : "newest",
    offset: toPositiveNumber(params.offset),
  };
}
