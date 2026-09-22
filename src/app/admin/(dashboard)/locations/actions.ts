"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/lib/admin-auth";
import { slugify } from "@/lib/validations/property";

export async function createCity(formData: FormData) {
  await requireAdminUser();
  const name = String(formData.get("name") ?? "");
  const stateId = String(formData.get("stateId") ?? "");
  const imageUrl = String(formData.get("imageUrl") ?? "") || undefined;
  if (!name || !stateId) return;

  await prisma.city.create({ data: { name, slug: slugify(name), stateId, imageUrl } });
  revalidatePath("/admin/locations");
}

export async function createLocality(formData: FormData) {
  await requireAdminUser();
  const name = String(formData.get("name") ?? "");
  const cityId = String(formData.get("cityId") ?? "");
  const imageUrl = String(formData.get("imageUrl") ?? "") || undefined;
  if (!name || !cityId) return;

  await prisma.locality.create({ data: { name, slug: slugify(name), cityId, imageUrl } });
  revalidatePath("/admin/locations");
}

export async function createNeighbourhood(formData: FormData) {
  await requireAdminUser();
  const name = String(formData.get("name") ?? "");
  const localityId = String(formData.get("localityId") ?? "");
  if (!name || !localityId) return;

  await prisma.neighbourhood.create({ data: { name, slug: slugify(name), localityId } });
  revalidatePath("/admin/locations");
}

export async function createCountryAndState(formData: FormData) {
  await requireAdminUser();
  const countryName = String(formData.get("countryName") ?? "");
  const countryCode = String(formData.get("countryCode") ?? "").toUpperCase();
  const stateName = String(formData.get("stateName") ?? "");
  if (!countryName || !countryCode || !stateName) return;

  const country = await prisma.country.upsert({
    where: { code: countryCode },
    update: {},
    create: { name: countryName, code: countryCode },
  });
  await prisma.stateProvince.upsert({
    where: { countryId_name: { countryId: country.id, name: stateName } },
    update: {},
    create: { name: stateName, countryId: country.id },
  });
  revalidatePath("/admin/locations");
}
