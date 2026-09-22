"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/lib/admin-auth";
import { slugify } from "@/lib/validations/property";

export async function createCategory(formData: FormData) {
  await requireAdminUser();
  const name = String(formData.get("name") ?? "");
  const imageUrl = String(formData.get("imageUrl") ?? "") || undefined;
  if (!name) return;

  await prisma.category.create({ data: { name, slug: slugify(name), imageUrl } });
  revalidatePath("/admin/categories");
}

export async function deleteCategory(categoryId: string) {
  await requireAdminUser();
  await prisma.category.delete({ where: { id: categoryId } }).catch(() => {
    // In use by properties — categories are Restrict on delete by relation.
  });
  revalidatePath("/admin/categories");
}
