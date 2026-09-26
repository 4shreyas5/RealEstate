"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/lib/admin-auth";
import { propertyDraftSchema, type PropertyFormValues } from "@/lib/validations/property";
import { LOCATIONS_CACHE_TAG } from "@/lib/taxonomy";
import type { PropertyStatus } from "@prisma/client";

/** Creates the property on first save, updates it on every step after — always as a Draft. */
export async function savePropertyDraft(
  propertyId: string | null,
  rawValues: Partial<PropertyFormValues>,
) {
  const adminUser = await requireAdminUser();

  const parsed = propertyDraftSchema.safeParse(rawValues);
  if (!parsed.success) {
    return {
      ok: false as const,
      errors: parsed.error.issues.map((issue) => issue.message),
    };
  }
  const values = parsed.data;

  const data = {
    ...(values.title !== undefined && { title: values.title }),
    ...(values.listingType !== undefined && { listingType: values.listingType }),
    ...(values.categoryId !== undefined && {
      category: { connect: { id: values.categoryId } },
    }),
    ...(values.cityId !== undefined && { city: { connect: { id: values.cityId } } }),
    ...(values.localityId !== undefined && {
      locality: { connect: { id: values.localityId } },
    }),
    ...(values.neighbourhoodId !== undefined && {
      neighbourhood: values.neighbourhoodId
        ? { connect: { id: values.neighbourhoodId } }
        : { disconnect: true },
    }),
    ...(values.latitude !== undefined && { latitude: values.latitude }),
    ...(values.longitude !== undefined && { longitude: values.longitude }),
    ...(values.priceAmount !== undefined && { priceAmount: values.priceAmount }),
    ...(values.priceCurrency !== undefined && {
      priceCurrency: values.priceCurrency,
    }),
    ...(values.rentPeriod !== undefined && { rentPeriod: values.rentPeriod }),
    ...(values.areaValue !== undefined && { areaValue: values.areaValue }),
    ...(values.areaUnit !== undefined && { areaUnit: values.areaUnit }),
    ...(values.bedrooms !== undefined && { bedrooms: values.bedrooms }),
    ...(values.bathrooms !== undefined && { bathrooms: values.bathrooms }),
    ...(values.floor !== undefined && { floor: values.floor }),
    ...(values.totalFloors !== undefined && { totalFloors: values.totalFloors }),
    ...(values.facing !== undefined && { facing: values.facing }),
    ...(values.furnishing !== undefined && { furnishing: values.furnishing }),
    ...(values.propertyAgeYears !== undefined && {
      propertyAgeYears: values.propertyAgeYears,
    }),
    ...(values.constructionStatus !== undefined && {
      constructionStatus: values.constructionStatus,
    }),
    ...(values.possessionDate !== undefined && {
      possessionDate: values.possessionDate ? new Date(values.possessionDate) : null,
    }),
    ...(values.parkingSpaces !== undefined && {
      parkingSpaces: values.parkingSpaces,
    }),
    ...(values.description !== undefined && { description: values.description }),
    ...(values.slug !== undefined && { slug: values.slug }),
    ...(values.metaTitle !== undefined && { metaTitle: values.metaTitle }),
    ...(values.metaDescription !== undefined && {
      metaDescription: values.metaDescription,
    }),
  };

  let id = propertyId;

  if (!id) {
    // `category`/`city`/`locality` are required, non-nullable relations on
    // Property — a first save can't create a row without them, regardless
    // of which wizard step collected them last. Catch that here with a
    // clear message instead of letting Prisma throw a raw validation error.
    if (!values.categoryId || !values.cityId || !values.localityId) {
      return {
        ok: false as const,
        errors: ["Select a category, city, and locality before saving this draft for the first time."],
      };
    }

    // A brand-new draft needs the minimum fields a relation requires up front.
    const created = await prisma.property.create({
      data: {
        title: values.title || "Untitled property",
        slug: values.slug || `untitled-${Date.now()}`,
        listingType: values.listingType ?? "SALE",
        priceAmount: values.priceAmount ?? 0,
        priceCurrency: values.priceCurrency ?? "INR",
        areaValue: values.areaValue ?? 0,
        areaUnit: values.areaUnit ?? "SQFT",
        description: values.description ?? "",
        status: "DRAFT",
        category: { connect: { id: values.categoryId } },
        city: { connect: { id: values.cityId } },
        locality: { connect: { id: values.localityId } },
      },
    });
    id = created.id;
  } else {
    await prisma.property.update({ where: { id }, data });
  }

  if (values.amenityIds) {
    await prisma.propertyAmenity.deleteMany({ where: { propertyId: id } });
    await prisma.propertyAmenity.createMany({
      data: values.amenityIds.map((amenityId) => ({ propertyId: id!, amenityId })),
      skipDuplicates: true,
    });
  }

  await prisma.auditLogEntry.create({
    data: {
      adminUserId: adminUser.id,
      propertyId: id,
      action: "draft_saved",
    },
  });

  revalidatePath("/admin/properties");
  return { ok: true as const, id };
}

const MIN_IMAGES_TO_PUBLISH = 5;

/**
 * Photography is part of the product quality — a property cannot be
 * published without a cover image, a minimum image count, and alt text on
 * every image. This is enforced here, not worked around with decorative UI.
 */
export async function publishProperty(propertyId: string) {
  const adminUser = await requireAdminUser();

  const property = await prisma.property.findUniqueOrThrow({
    where: { id: propertyId },
    include: { images: true },
  });

  const errors: string[] = [];
  if (!property.images.some((image) => image.isCover)) {
    errors.push("Choose a cover image before publishing.");
  }
  if (property.images.length < MIN_IMAGES_TO_PUBLISH) {
    errors.push(`Add at least ${MIN_IMAGES_TO_PUBLISH} photos before publishing.`);
  }
  if (property.images.some((image) => !image.altText.trim())) {
    errors.push("Every photo needs alt text before publishing.");
  }
  if (!property.description.trim()) {
    errors.push("Add a description before publishing.");
  }

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

export async function changePropertyStatus(propertyId: string, status: PropertyStatus) {
  const adminUser = await requireAdminUser();

  const property = await prisma.property.update({
    where: { id: propertyId },
    data: { status },
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

  await prisma.property.updateMany({
    where: { id: { in: propertyIds } },
    data: { status },
  });

  await prisma.auditLogEntry.createMany({
    data: propertyIds.map((propertyId) => ({
      adminUserId: adminUser.id,
      propertyId,
      action: "status_changed",
      detail: { status },
    })),
  });

  revalidatePath("/admin/properties");
  revalidateTag(LOCATIONS_CACHE_TAG, { expire: 0 });
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
