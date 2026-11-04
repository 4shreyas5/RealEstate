import { z } from "zod";

/** Empty strings from number/date inputs mean "not entered" — never coerce them into 0. */
const emptyToUndefined = (value: unknown) => (value === "" || value === null ? undefined : value);
const optionalInt = () => z.preprocess(emptyToUndefined, z.coerce.number().int().optional());
const optionalNonNegativeInt = () => z.preprocess(emptyToUndefined, z.coerce.number().int().min(0).optional());
const optionalText = () => z.preprocess(emptyToUndefined, z.string().trim().optional());
/** A required string field that was never touched in form state (e.g. a
 * `<select>` nobody chose an option on) submits as `undefined`, not `""`.
 * Zod's base type check rejects that BEFORE the `.min(1, message)` below
 * ever runs, producing a generic "expected string, received undefined"
 * instead of the field's actual message — the exact bug this preprocess
 * closes, by normalizing a missing value to "" first so `.min()` is always
 * what reports it. */
const requiredText = (message: string, minLength = 1) =>
  z.preprocess((v) => (v === undefined || v === null ? "" : v), z.string().trim().min(minLength, message));

const FACING_VALUES = [
  "NORTH",
  "SOUTH",
  "EAST",
  "WEST",
  "NORTH_EAST",
  "NORTH_WEST",
  "SOUTH_EAST",
  "SOUTH_WEST",
] as const;

/**
 * Single schema for both create and update — this form has no partial
 * "draft" steps anymore, so every submit carries the full set of fields.
 * Only the fields with a genuine business/DB reason to be mandatory are
 * required; everything else is nullable/optional and must save that way
 * (no fake 0/"" placeholders).
 */
export const propertyInputSchema = z.object({
  // Basic information
  title: requiredText("Title is required", 3),
  listingType: z.enum(["SALE", "RENT"]),
  categoryId: requiredText("Property type is required"),
  description: requiredText("Description is required"),

  // Location — Country is implicitly India (this is a single-country
  // platform); State only drives the City dropdown and isn't stored on
  // Property itself. Locality is entirely optional: a property can be saved
  // with only its state and city known.
  cityId: requiredText("City is required"),
  localityId: optionalText(),
  localityName: optionalText(),
  neighbourhoodId: optionalText(),
  address: optionalText(),
  latitude: z.preprocess(emptyToUndefined, z.coerce.number().min(-90).max(90).optional()),
  longitude: z.preprocess(emptyToUndefined, z.coerce.number().min(-180).max(180).optional()),

  // Pricing
  priceAmount: z.coerce.number().positive("Enter a price"),
  priceCurrency: z.string().length(3, "Use a 3-letter currency code, e.g. INR").default("INR"),
  rentPeriod: z.enum(["MONTHLY", "YEARLY"]).optional(),

  // Specifications — all optional except area, which every property type
  // (apartment, plot or land) needs in some form.
  areaValue: z.coerce.number().positive("Enter an area"),
  areaUnit: z.enum(["SQFT", "SQM", "ACRE", "HECTARE", "MARLA", "KANAL"]).default("SQFT"),
  bedrooms: optionalNonNegativeInt(),
  bathrooms: optionalNonNegativeInt(),
  floor: optionalInt(),
  totalFloors: optionalInt(),
  facing: z.enum(FACING_VALUES).optional(),
  furnishing: z.enum(["UNFURNISHED", "SEMI_FURNISHED", "FULLY_FURNISHED"]).optional(),
  propertyAgeYears: optionalNonNegativeInt(),
  constructionStatus: z.enum(["UNDER_CONSTRUCTION", "READY_TO_MOVE"]).optional(),
  possessionDate: optionalText(),
  parkingSpaces: optionalNonNegativeInt(),

  // Amenities — an empty array is a completely valid, final answer.
  amenityIds: z.array(z.string()).default([]),

  // SEO — entirely optional; slug is auto-generated server-side when absent.
  slug: optionalText(),
  metaTitle: optionalText(),
  metaDescription: optionalText(),
});

export type PropertyFormValues = z.infer<typeof propertyInputSchema>;

export function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

/** Which specification fields are relevant for a category, by name — keyed off
 * the category's own name/slug so newly-added categories (e.g. "Agricultural
 * Land", "Commercial Property") pick up the right profile automatically,
 * without introducing new Category rows ourselves. */
export function specProfileForCategory(categoryName: string | undefined): "land" | "commercial" | "residential" {
  const name = (categoryName ?? "").toLowerCase();
  if (/plot|land|agricult/.test(name)) return "land";
  if (/commercial|office|shop|retail/.test(name)) return "commercial";
  return "residential";
}
