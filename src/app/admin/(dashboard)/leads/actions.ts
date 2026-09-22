"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/lib/admin-auth";
import type { LeadStatus } from "@prisma/client";

export async function updateLeadStatus(leadId: string, status: LeadStatus) {
  await requireAdminUser();
  await prisma.lead.update({ where: { id: leadId }, data: { status } });
  revalidatePath("/admin/leads");
}
