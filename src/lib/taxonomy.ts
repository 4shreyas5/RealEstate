import { prisma } from "@/lib/prisma";

export async function getExploreLocations(limit = 6) {
  const localities = await prisma.locality.findMany({
    take: limit,
    orderBy: { name: "asc" },
    include: { city: { select: { name: true, slug: true } } },
  });

  return localities.map((locality) => ({
    id: locality.id,
    name: locality.name,
    slug: locality.slug,
    citySlug: locality.city.slug,
    cityName: locality.city.name,
    imageUrl: locality.imageUrl,
  }));
}

export async function getExploreCategories(limit = 6) {
  const categories = await prisma.category.findMany({
    take: limit,
    orderBy: { name: "asc" },
  });

  return categories.map((category) => ({
    id: category.id,
    name: category.name,
    slug: category.slug,
    imageUrl: category.imageUrl,
  }));
}

export async function getAllCities() {
  const cities = await prisma.city.findMany({ orderBy: { name: "asc" } });
  return cities.map((c) => ({ id: c.id, name: c.name, slug: c.slug, imageUrl: c.imageUrl }));
}

export async function getAllCategories() {
  const categories = await prisma.category.findMany({ orderBy: { name: "asc" } });
  return categories.map((c) => ({ id: c.id, name: c.name, slug: c.slug }));
}
