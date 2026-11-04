"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/lib/admin-auth";
import { createClient } from "@/lib/supabase/server";
import { PROPERTY_IMAGE_BUCKET, propertyImagePathFromUrl } from "@/lib/storage";
import { propertyInputSchema, slugify, type PropertyFormValues } from "@/lib/validations/property";
import { LOCATIONS_CACHE_TAG } from "@/lib/taxonomy";
import type { PropertyStatus } from "@prisma/client";

/** The one place publish-readiness is decided — used by the dedicated Publish
 * button AND by every other path that can set status to PUBLISHED (the
 * per-row status select, bulk actions), so none of them can bypass it.
 * Photos are entirely optional: a property with zero images is publishable
 * as-is. Once it has at least one image, that image set must be coherent
 * (a cover chosen, every image with alt text) — but there is no minimum count. */
function publishBlockers(property: { description: string; images: { isCover: boolean; altText: string }[] }): string[] {
  const errors: string[] = [];
  if (property.images.length > 0) {
    if (!property.images.some((image) => image.isCover)) {
      errors.push("Choose a cover image before publishing.");
    }
    if (property.images.some((image) => !image.altText.trim())) {
      errors.push("Every photo needs alt text before publishing.");
    }
  }
  if (!property.description.trim()) {
    errors.push("Add a description before publishing.");
  }
  return errors;
}

/** Finds a locality by name under the given city (case-insensitive), or creates it — so
 * typing a locality name never creates duplicate rows for the same place. Locality is
 * entirely optional: if neither an id nor a name was given, the property simply has none. */
async function resolveLocalityId(
  tx: Prisma.TransactionClient,
  cityId: string,
  localityId: string | undefined,
  localityName: string | undefined,
): Promise<string | null> {
  if (localityId) return localityId;
  const name = localityName?.trim();
  if (!name) return null;
  const slug = slugify(name) || "locality";
  const existing = await tx.locality.findFirst({
    where: { cityId, OR: [{ slug }, { name: { equals: name, mode: "insensitive" } }] },
  });
  if (existing) return existing.id;
  const created = await tx.locality.create({ data: { cityId, name, slug } });
  return created.id;
}

/** Appends `-2`, `-3`, … until the slug is unique, so two properties with the
 * same title never collide on Property.slug (unique). */
async function uniqueSlug(tx: Prisma.TransactionClient, base: string, excludeId?: string): Promise<string> {
  let candidate = base || "property";
  let suffix = 1;
  while (
    await tx.property.findFirst({
      where: { slug: candidate, ...(excludeId ? { id: { not: excludeId } } : {}) },
      select: { id: true },
    })
  ) {
    suffix += 1;
    candidate = `${base || "property"}-${suffix}`;
  }
  return candidate;
}

function readableSaveError(error: unknown): string {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") return "That URL slug is already in use by another property.";
    if (error.code === "P2003" || error.code === "P2025") {
      return "The selected category, city or locality no longer exists — please re-select and try again.";
    }
  }
  if (error instanceof Error) return error.message;
  return "Couldn't save this property — please try again.";
}

/** Creates the property on first save, updates it on every save after. Always
 * transactional, so a failure partway through (e.g. a bad amenity id) never
 * leaves the property half-written. */
export async function savePropertyDraft(
  propertyId: string | null,
  rawValues: Partial<PropertyFormValues> & { localityName?: string },
) {
  const adminUser = await requireAdminUser();

  const parsed = propertyInputSchema.safeParse(rawValues);
  if (!parsed.success) {
    return {
      ok: false as const,
      errors: parsed.error.issues.map((issue) => issue.message),
    };
  }
  const values = parsed.data;

  try {
    const id = await prisma.$transaction(async (tx) => {
      const localityId = await resolveLocalityId(tx, values.cityId, values.localityId, values.localityName);
      const slug = await uniqueSlug(tx, slugify(values.slug || values.title), propertyId ?? undefined);

      const data = {
        title: values.title,
        slug,
        listingType: values.listingType,
        categoryId: values.categoryId,
        cityId: values.cityId,
        localityId,
        // A neighbourhood belongs to a locality — never keep one without the locality it's under.
        neighbourhoodId: localityId ? values.neighbourhoodId || null : null,
        address: values.address || null,
        latitude: values.latitude ?? null,
        longitude: values.longitude ?? null,
        priceAmount: values.priceAmount,
        priceCurrency: values.priceCurrency,
        rentPeriod: values.listingType === "RENT" ? values.rentPeriod ?? null : null,
        areaValue: values.areaValue,
        areaUnit: values.areaUnit,
        bedrooms: values.bedrooms ?? null,
        bathrooms: values.bathrooms ?? null,
        floor: values.floor ?? null,
        totalFloors: values.totalFloors ?? null,
        facing: values.facing ?? null,
        furnishing: values.furnishing ?? null,
        propertyAgeYears: values.propertyAgeYears ?? null,
        constructionStatus: values.constructionStatus ?? null,
        possessionDate: values.possessionDate ? new Date(values.possessionDate) : null,
        parkingSpaces: values.parkingSpaces ?? null,
        description: values.description,
        metaTitle: values.metaTitle || null,
        metaDescription: values.metaDescription || null,
      };

      const property = propertyId
        ? await tx.property.update({ where: { id: propertyId }, data })
        : await tx.property.create({ data: { ...data, status: "DRAFT" } });

      await tx.propertyAmenity.deleteMany({ where: { propertyId: property.id } });
      if (values.amenityIds.length > 0) {
        await tx.propertyAmenity.createMany({
          data: values.amenityIds.map((amenityId) => ({ propertyId: property.id, amenityId })),
          skipDuplicates: true,
        });
      }

      await tx.auditLogEntry.create({
        data: {
          adminUserId: adminUser.id,
          propertyId: property.id,
          action: propertyId ? "draft_saved" : "created",
        },
      });

      return property.id;
    });

    revalidatePath("/admin/properties");
    return { ok: true as const, id };
  } catch (error) {
    return { ok: false as const, errors: [readableSaveError(error)] };
  }
}

/**
 * Photos are optional for publishing — see `publishBlockers` for the exact
 * rules that still apply once a property does have images.
 */
export async function publishProperty(propertyId: string) {
  const adminUser = await requireAdminUser();

  const property = await prisma.property.findUniqueOrThrow({
    where: { id: propertyId },
    include: { images: true },
  });

  const errors = publishBlockers(property);
  if (errors.length > 0) {
    return { ok: false as const, errors };
  }

  await prisma.property.update({
    where: { id: propertyId },
    data: { status: "PUBLISHED", publishedAt: new Date() },
  });

  await prisma.auditLogEntry.create({
    data: { adminUserId: adminUser.id, propertyId, action: "published" },
  });

  revalidatePath("/admin/properties");
  revalidatePath(`/properties/${property.slug}`);
  revalidateTag(LOCATIONS_CACHE_TAG, { expire: 0 });
  return { ok: true as const };
}

/** Any status change that targets PUBLISHED goes through the same
 * `publishBlockers` check as the dedicated Publish button — there is no
 * second, looser path to a published listing. */
export async function changePropertyStatus(propertyId: string, status: PropertyStatus) {
  const adminUser = await requireAdminUser();

  if (status === "PUBLISHED") {
    const current = await prisma.property.findUniqueOrThrow({
      where: { id: propertyId },
      include: { images: true },
    });
    const errors = publishBlockers(current);
    if (errors.length > 0) {
      return { ok: false as const, errors };
    }
  }

  const property = await prisma.property.update({
    where: { id: propertyId },
    data: { status, ...(status === "PUBLISHED" && { publishedAt: new Date() }) },
  });

  await prisma.auditLogEntry.create({
    data: {
      adminUserId: adminUser.id,
      propertyId,
      action: "status_changed",
      detail: { status },
    },
  });

  revalidatePath("/admin/properties");
  revalidatePath(`/properties/${property.slug}`);
  revalidateTag(LOCATIONS_CACHE_TAG, { expire: 0 });
  return { ok: true as const };
}

export async function toggleFeatured(propertyId: string, featured: boolean) {
  const adminUser = await requireAdminUser();

  await prisma.property.update({ where: { id: propertyId }, data: { featured } });

  await prisma.auditLogEntry.create({
    data: {
      adminUserId: adminUser.id,
      propertyId,
      action: featured ? "featured" : "unfeatured",
    },
  });

  revalidatePath("/admin/properties");
}

export async function bulkChangeStatus(propertyIds: string[], status: PropertyStatus) {
  const adminUser = await requireAdminUser();

  let eligibleIds = propertyIds;
  const blocked: { id: string; title: string; errors: string[] }[] = [];

  if (status === "PUBLISHED") {
    const candidates = await prisma.property.findMany({
      where: { id: { in: propertyIds } },
      include: { images: true },
    });
    eligibleIds = [];
    for (const candidate of candidates) {
      const errors = publishBlockers(candidate);
      if (errors.length > 0) {
        blocked.push({ id: candidate.id, title: candidate.title, errors });
      } else {
        eligibleIds.push(candidate.id);
      }
    }
  }

  if (eligibleIds.length > 0) {
    await prisma.property.updateMany({
      where: { id: { in: eligibleIds } },
      data: { status, ...(status === "PUBLISHED" && { publishedAt: new Date() }) },
    });

    await prisma.auditLogEntry.createMany({
      data: eligibleIds.map((propertyId) => ({
        adminUserId: adminUser.id,
        propertyId,
        action: "status_changed",
        detail: { status },
      })),
    });
  }

  revalidatePath("/admin/properties");
  revalidateTag(LOCATIONS_CACHE_TAG, { expire: 0 });
  return { ok: true as const, updatedCount: eligibleIds.length, blocked };
}

/**
 * Deletes a property and its images/amenities/featured entries (all
 * `onDelete: Cascade` in the schema); leads and audit log entries reference
 * it with `onDelete: SetNull`, so that history survives with the property
 * reference cleared — the audit entry below is written first so at least
 * the title/slug is kept even after the FK is nulled. Storage objects are
 * not covered by the Cascade (they live outside Postgres), so they're
 * removed explicitly first.
 */
export async function deleteProperty(propertyId: string) {
  const adminUser = await requireAdminUser();

  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    include: { images: true },
  });
  if (!property) {
    return { ok: false as const, errors: ["That property no longer exists."] };
  }

  const objectPaths = property.images.map((image) => propertyImagePathFromUrl(image.url)).filter((p): p is string => !!p);
  if (objectPaths.length > 0) {
    const supabase = await createClient();
    const { error } = await supabase.storage.from(PROPERTY_IMAGE_BUCKET).remove(objectPaths);
    if (error) {
      console.error("some property image Storage objects were not deleted:", error.message);
    }
  }

  await prisma.$transaction([
    prisma.auditLogEntry.create({
      data: {
        adminUserId: adminUser.id,
        propertyId: property.id,
        action: "deleted",
        detail: { title: property.title, slug: property.slug },
      },
    }),
    prisma.property.delete({ where: { id: propertyId } }),
  ]);

  revalidatePath("/admin/properties");
  revalidatePath(`/properties/${property.slug}`);
  revalidateTag(LOCATIONS_CACHE_TAG, { expire: 0 });
  return { ok: true as const };
}

export async function duplicateProperty(propertyId: string) {
  const adminUser = await requireAdminUser();

  const source = await prisma.property.findUniqueOrThrow({
    where: { id: propertyId },
    include: { amenities: true },
  });

  const copy = await prisma.property.create({
    data: {
      title: `${source.title} (copy)`,
      slug: `${source.slug}-copy-${Date.now()}`,
      listingType: source.listingType,
      categoryId: source.categoryId,
      cityId: source.cityId,
      localityId: source.localityId,
      neighbourhoodId: source.neighbourhoodId,
      latitude: source.latitude,
      longitude: source.longitude,
      address: source.address,
      priceAmount: source.priceAmount,
      priceCurrency: source.priceCurrency,
      rentPeriod: source.rentPeriod,
      areaValue: source.areaValue,
      areaUnit: source.areaUnit,
      bedrooms: source.bedrooms,
      bathrooms: source.bathrooms,
      floor: source.floor,
      totalFloors: source.totalFloors,
      facing: source.facing,
      furnishing: source.furnishing,
      propertyAgeYears: source.propertyAgeYears,
      constructionStatus: source.constructionStatus,
      possessionDate: source.possessionDate,
      parkingSpaces: source.parkingSpaces,
      description: source.description,
      status: "DRAFT",
      amenities: {
        createMany: {
          data: source.amenities.map((a) => ({ amenityId: a.amenityId })),
        },
      },
    },
  });

  await prisma.auditLogEntry.create({
    data: {
      adminUserId: adminUser.id,
      propertyId: copy.id,
      action: "duplicated",
      detail: { fromPropertyId: propertyId },
    },
  });

  revalidatePath("/admin/properties");
  redirect(`/admin/properties/${copy.id}`);
}
