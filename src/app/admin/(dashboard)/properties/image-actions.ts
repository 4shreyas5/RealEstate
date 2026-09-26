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

export async function updateImageAltText(imageId: string, altText: string) {
  await requireAdminUser();
  await prisma.propertyImage.update({ where: { id: imageId }, data: { altText } });
}

export async function updateImageRoomLabel(imageId: string, roomLabel: string) {
  await requireAdminUser();
  await prisma.propertyImage.update({ where: { id: imageId }, data: { roomLabel } });
}

export async function setCoverImage(propertyId: string, imageId: string) {
  await requireAdminUser();
  await prisma.$transaction([
    prisma.propertyImage.updateMany({
      where: { propertyId },
      data: { isCover: false },
    }),
    prisma.propertyImage.update({ where: { id: imageId }, data: { isCover: true } }),
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

  const removed = await prisma.propertyImage.delete({ where: { id: imageId } });

  // Best-effort: drop the Storage object too so removed photos don't pile up
  // as orphans. Placeholder (non-Storage) URLs have nothing to delete.
  const objectPath = propertyImagePathFromUrl(removed.url);
  if (objectPath) {
    const supabase = await createClient();
    const { data, error } = await supabase.storage.from(PROPERTY_IMAGE_BUCKET).remove([objectPath]);
    if (error || !data || data.length === 0) {
      console.error("property image removed from DB but Storage object was not deleted:", objectPath, error?.message);
    }
  }

  if (removed.isCover) {
    const next = await prisma.propertyImage.findFirst({
      where: { propertyId },
      orderBy: { position: "asc" },
    });
    if (next) {
      await prisma.propertyImage.update({ where: { id: next.id }, data: { isCover: true } });
    }
  }

  revalidatePath(`/admin/properties/${propertyId}`);
}
