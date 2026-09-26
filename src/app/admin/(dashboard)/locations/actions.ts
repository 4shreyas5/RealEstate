"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/lib/admin-auth";
import { slugify } from "@/lib/validations/property";
import { LOCATIONS_CACHE_TAG } from "@/lib/taxonomy";

// City slugs are top-level URLs (/mumbai) — they must never shadow a static route.
const RESERVED_SLUGS = new Set(["buy", "rent", "search", "contact", "about", "admin", "api", "properties", "locations", "categories", "cities"]);

function refreshLocations() {
  revalidatePath("/admin/locations");
  revalidateTag(LOCATIONS_CACHE_TAG, { expire: 0 });
}

export async function createCity(formData: FormData) {
  await requireAdminUser();
  const name = String(formData.get("name") ?? "");
  const stateId = String(formData.get("stateId") ?? "");
  const imageUrl = String(formData.get("imageUrl") ?? "") || undefined;
  if (!name || !stateId) return;

  // Same-named cities exist in different states — disambiguate the slug with
  // the state rather than failing on the unique constraint.
  const state = await prisma.stateProvince.findUnique({ where: { id: stateId }, select: { name: true } });
  if (!state) return;
  let slug = slugify(name);
  if (RESERVED_SLUGS.has(slug) || (await prisma.city.findUnique({ where: { slug } }))) {
    slug = `${slug}-${slugify(state.name)}`;
  }
  if (await prisma.city.findUnique({ where: { slug } })) return;

  await prisma.city.create({ data: { name, slug, stateId, imageUrl } });
  refreshLocations();
}

export async function createLocality(formData: FormData) {
  await requireAdminUser();
  const name = String(formData.get("name") ?? "");
  const cityId = String(formData.get("cityId") ?? "");
  const imageUrl = String(formData.get("imageUrl") ?? "") || undefined;
  if (!name || !cityId) return;

  const slug = slugify(name);
  if (await prisma.locality.findUnique({ where: { cityId_slug: { cityId, slug } } })) return;

  await prisma.locality.create({ data: { name, slug, cityId, imageUrl } });
  refreshLocations();
}

export async function createNeighbourhood(formData: FormData) {
  await requireAdminUser();
  const name = String(formData.get("name") ?? "");
  const localityId = String(formData.get("localityId") ?? "");
  if (!name || !localityId) return;

  const slug = slugify(name);
  if (await prisma.neighbourhood.findUnique({ where: { localityId_slug: { localityId, slug } } })) return;

  await prisma.neighbourhood.create({ data: { name, slug, localityId } });
  refreshLocations();
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
  refreshLocations();
}
