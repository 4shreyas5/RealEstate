"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/lib/admin-auth";
import type { AdminRole } from "@prisma/client";

/**
 * Grants admin access to an existing Supabase Auth user (created via the
 * Supabase dashboard first — this never creates the auth identity itself).
 */
export async function addAdminUser(formData: FormData) {
  const actingAdmin = await requireAdminUser();
  if (actingAdmin.role !== "ADMIN") return;

  const id = String(formData.get("userId") ?? "");
  const email = String(formData.get("email") ?? "");
  const name = String(formData.get("name") ?? "");
  const role = String(formData.get("role") ?? "EDITOR") as AdminRole;
  if (!id || !email || !name) return;

  await prisma.adminUser.create({ data: { id, email, name, role } });
  revalidatePath("/admin/users");
}

export async function removeAdminUser(adminUserId: string) {
  const actingAdmin = await requireAdminUser();
  if (actingAdmin.role !== "ADMIN" || actingAdmin.id === adminUserId) return;

  await prisma.adminUser.delete({ where: { id: adminUserId } });
  revalidatePath("/admin/users");
}
