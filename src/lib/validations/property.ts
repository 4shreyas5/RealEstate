import { z } from "zod";

export const propertyFormSchema = z.object({
  // Basic Info
  title: z.string().min(3, "Title is required"),
  listingType: z.enum(["SALE", "RENT"]),
  categoryId: z.string().min(1, "Category is required"),

  // Location
  cityId: z.string().min(1, "City is required"),
  localityId: z.string().min(1, "Locality is required"),
  neighbourhoodId: z.string().optional(),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),

  // Pricing
  priceAmount: z.coerce.number().positive("Enter a price"),
  priceCurrency: z.string().length(3, "Use a 3-letter currency code, e.g. INR"),
  rentPeriod: z.enum(["MONTHLY", "YEARLY"]).optional(),

  // Specifications
  areaValue: z.coerce.number().positive("Enter an area"),
  areaUnit: z.enum(["SQFT", "SQM", "ACRE", "HECTARE", "MARLA", "KANAL"]),
  bedrooms: z.coerce.number().int().min(0).optional(),
  bathrooms: z.coerce.number().int().min(0).optional(),
  floor: z.coerce.number().int().optional(),
  totalFloors: z.coerce.number().int().optional(),
  facing: z
    .enum([
      "NORTH",
      "SOUTH",
      "EAST",
      "WEST",
      "NORTH_EAST",
      "NORTH_WEST",
      "SOUTH_EAST",
      "SOUTH_WEST",
    ])
    .optional(),
  furnishing: z.enum(["UNFURNISHED", "SEMI_FURNISHED", "FULLY_FURNISHED"]).optional(),
  propertyAgeYears: z.coerce.number().int().min(0).optional(),
  constructionStatus: z.enum(["UNDER_CONSTRUCTION", "READY_TO_MOVE"]).optional(),
  possessionDate: z.string().optional(),
  parkingSpaces: z.coerce.number().int().min(0).optional(),

  // Amenities
  amenityIds: z.array(z.string()).default([]),

  // Description
  description: z.string().min(1, "Add a description"),

  // SEO
  slug: z.string().min(1, "Slug is required"),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
});

export type PropertyFormValues = z.infer<typeof propertyFormSchema>;

/**
 * Server-side validation for `savePropertyDraft` — every field optional (a
 * draft is allowed to be incomplete), but any field that IS present must
 * still satisfy the same type/enum constraints as the publish-time schema.
 *
 * `priceAmount`/`areaValue`/`description` are relaxed from the publish-time
 * schema (`.positive()`, `.min(1)`) because a brand-new draft is persisted
 * with `0`/`""` as explicit not-yet-entered placeholders (see
 * `savePropertyDraft`'s create fallback) — without this, resuming that
 * draft before touching those fields would fail validation on the app's
 * own placeholder values.
 */
export const propertyDraftSchema = propertyFormSchema.partial().extend({
  priceAmount: z.coerce.number().min(0, "Price can't be negative").optional(),
  areaValue: z.coerce.number().min(0, "Area can't be negative").optional(),
  description: z.string().optional(),
});

export const propertyStepFields = {
  basic: ["title", "listingType", "categoryId"],
  location: ["cityId", "localityId", "neighbourhoodId", "latitude", "longitude"],
  pricing: ["priceAmount", "priceCurrency", "rentPeriod"],
  specifications: [
    "areaValue",
    "areaUnit",
    "bedrooms",
    "bathrooms",
    "floor",
    "totalFloors",
    "facing",
    "furnishing",
    "propertyAgeYears",
    "constructionStatus",
    "possessionDate",
    "parkingSpaces",
  ],
  amenities: ["amenityIds"],
  description: ["description"],
  seo: ["slug", "metaTitle", "metaDescription"],
} as const satisfies Record<string, (keyof PropertyFormValues)[]>;

export function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}
