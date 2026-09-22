"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/lib/admin-auth";

/** Records an image already uploaded client-side to Supabase Storage. */
export async function addPropertyImage(propertyId: string, url: string) {
  await requireAdminUser();

  const count = await prisma.propertyImage.count({ where: { propertyId } });

  const image = await prisma.propertyImage.create({
    data: {
      propertyId,
      url,
      altText: "",
      position: count,
      isCover: count === 0,
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
