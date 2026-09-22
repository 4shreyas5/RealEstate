"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/lib/admin-auth";

export async function reorderFeatured(propertyId: string, direction: "up" | "down") {
  await requireAdminUser();

  const entries = await prisma.featuredProperty.findMany({ orderBy: { position: "asc" } });
  const index = entries.findIndex((e) => e.propertyId === propertyId);
  const swapWith = direction === "up" ? index - 1 : index + 1;
  if (index === -1 || swapWith < 0 || swapWith >= entries.length) return;

  const a = entries[index];
  const b = entries[swapWith];
  await prisma.$transaction([
    prisma.featuredProperty.update({ where: { id: a.id }, data: { position: b.position } }),
    prisma.featuredProperty.update({ where: { id: b.id }, data: { position: a.position } }),
  ]);

  revalidatePath("/admin/featured");
  revalidatePath("/");
}

export async function removeFeatured(propertyId: string) {
  await requireAdminUser();
  await prisma.featuredProperty.delete({ where: { propertyId } }).catch(() => {});
  await prisma.property.update({ where: { id: propertyId }, data: { featured: false } });
  revalidatePath("/admin/featured");
  revalidatePath("/");
}

export async function addFeatured(propertyId: string) {
  await requireAdminUser();
  const count = await prisma.featuredProperty.count();
  await prisma.featuredProperty.upsert({
    where: { propertyId },
    update: {},
    create: { propertyId, position: count },
  });
  await prisma.property.update({ where: { id: propertyId }, data: { featured: true } });
  revalidatePath("/admin/featured");
  revalidatePath("/");
}
