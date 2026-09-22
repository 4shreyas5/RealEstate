"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/lib/admin-auth";
import { slugify } from "@/lib/validations/property";

export async function createAmenity(formData: FormData) {
  await requireAdminUser();
  const name = String(formData.get("name") ?? "");
  if (!name) return;

  await prisma.amenity.create({ data: { name, slug: slugify(name) } });
  revalidatePath("/admin/amenities");
}

export async function deleteAmenity(amenityId: string) {
  await requireAdminUser();
  await prisma.amenity.delete({ where: { id: amenityId } }).catch(() => {});
  revalidatePath("/admin/amenities");
}
