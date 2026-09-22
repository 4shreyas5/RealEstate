import { prisma } from "@/lib/prisma";

export async function getWizardTaxonomy() {
  const [categories, cities, localities, neighbourhoods, amenities] = await Promise.all([
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.city.findMany({ orderBy: { name: "asc" } }),
    prisma.locality.findMany({ orderBy: { name: "asc" } }),
    prisma.neighbourhood.findMany({ orderBy: { name: "asc" } }),
    prisma.amenity.findMany({ orderBy: { name: "asc" } }),
  ]);

  return {
    categories: categories.map((c) => ({ id: c.id, name: c.name })),
    cities: cities.map((c) => ({ id: c.id, name: c.name })),
    localities: localities.map((l) => ({ id: l.id, cityId: l.cityId, name: l.name })),
    neighbourhoods: neighbourhoods.map((n) => ({
      id: n.id,
      localityId: n.localityId,
      name: n.name,
    })),
    amenities: amenities.map((a) => ({ id: a.id, name: a.name })),
  };
}
