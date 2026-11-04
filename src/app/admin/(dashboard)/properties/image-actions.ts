"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/lib/admin-auth";
import { createClient } from "@/lib/supabase/server";
import { PROPERTY_IMAGE_BUCKET, propertyImagePathFromUrl } from "@/lib/storage";

/** Records an image already uploaded client-side to Supabase Storage. */
export async function addPropertyImage(propertyId: string, url: string) {
  await requireAdminUser();

  // Only objects this property's own upload flow could have produced —
  // never an arbitrary external URL.
  const path = propertyImagePathFromUrl(url);
  if (!path || !path.startsWith(`${propertyId}/`)) {
    throw new Error("Image URL must be a property-images Storage URL for this property.");
  }

  const existing = await prisma.propertyImage.findMany({
    where: { propertyId },
    select: { position: true },
  });
  const nextPosition = existing.reduce((max, i) => Math.max(max, i.position), -1) + 1;

  const image = await prisma.propertyImage.create({
    data: {
      propertyId,
      url,
      altText: "",
      position: nextPosition,
      isCover: existing.length === 0,
    },
  });

  revalidatePath(`/admin/properties/${propertyId}`);
  return image;
}

/** Every mutation below is scoped with `propertyId` in its `where`, not just
 * `id` — a stale or tampered imageId from a different property then simply
 * matches zero rows instead of silently mutating someone else's image. */

export async function updateImageAltText(propertyId: string, imageId: string, altText: string) {
  await requireAdminUser();
  await prisma.propertyImage.updateMany({ where: { id: imageId, propertyId }, data: { altText } });
  revalidatePath(`/admin/properties/${propertyId}`);
}

export async function updateImageRoomLabel(propertyId: string, imageId: string, roomLabel: string) {
  await requireAdminUser();
  await prisma.propertyImage.updateMany({ where: { id: imageId, propertyId }, data: { roomLabel } });
  revalidatePath(`/admin/properties/${propertyId}`);
}

export async function setCoverImage(propertyId: string, imageId: string) {
  await requireAdminUser();
  await prisma.$transaction([
    prisma.propertyImage.updateMany({
      where: { propertyId },
      data: { isCover: false },
    }),
    prisma.propertyImage.updateMany({ where: { id: imageId, propertyId }, data: { isCover: true } }),
  ]);
  revalidatePath(`/admin/properties/${propertyId}`);
}

/** Swaps an image with its neighbor — the accessible equivalent of drag-to-reorder. */
export async function moveImage(propertyId: string, imageId: string, direction: "up" | "down") {
  await requireAdminUser();

  const images = await prisma.propertyImage.findMany({
    where: { propertyId },
    orderBy: { position: "asc" },
  });

  const index = images.findIndex((image) => image.id === imageId);
  const swapWith = direction === "up" ? index - 1 : index + 1;
  if (index === -1 || swapWith < 0 || swapWith >= images.length) return;

  const a = images[index];
  const b = images[swapWith];

  await prisma.$transaction([
    prisma.propertyImage.update({ where: { id: a.id }, data: { position: b.position } }),
    prisma.propertyImage.update({ where: { id: b.id }, data: { position: a.position } }),
  ]);

  revalidatePath(`/admin/properties/${propertyId}`);
}

export async function removePropertyImage(propertyId: string, imageId: string) {
  await requireAdminUser();

  const [target, property] = await Promise.all([
    prisma.propertyImage.findFirst({ where: { id: imageId, propertyId } }),
    prisma.property.findUnique({ where: { id: propertyId }, select: { status: true } }),
  ]);
  if (!target || !property) {
    return { ok: false as const, errors: ["That photo no longer exists."] };
  }

  // A published listing must always keep at least one photo — removing the
  // last one would leave it visibly broken instead of just un-publishable.
  if (property.status === "PUBLISHED") {
    const remaining = await prisma.propertyImage.count({ where: { propertyId } });
    if (remaining <= 1) {
      return {
        ok: false as const,
        errors: ["Can't remove the only photo of a published property — add a replacement first, or unpublish it."],
      };
    }
  }

  const { count } = await prisma.propertyImage.deleteMany({ where: { id: imageId, propertyId } });
  if (count === 0) {
    return { ok: false as const, errors: ["That photo no longer exists."] };
  }

  // Best-effort: drop the Storage object too so removed photos don't pile up
  // as orphans. Placeholder (non-Storage) URLs have nothing to delete.
  const objectPath = propertyImagePathFromUrl(target.url);
  if (objectPath) {
    const supabase = await createClient();
    const { data, error } = await supabase.storage.from(PROPERTY_IMAGE_BUCKET).remove([objectPath]);
    if (error || !data || data.length === 0) {
      console.error("property image removed from DB but Storage object was not deleted:", objectPath, error?.message);
    }
  }

  if (target.isCover) {
    const next = await prisma.propertyImage.findFirst({
      where: { propertyId },
      orderBy: { position: "asc" },
    });
    if (next) {
      await prisma.propertyImage.update({ where: { id: next.id }, data: { isCover: true } });
    }
  }

  revalidatePath(`/admin/properties/${propertyId}`);
  return { ok: true as const };
}
