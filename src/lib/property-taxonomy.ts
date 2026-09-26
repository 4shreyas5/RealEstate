import { prisma } from "@/lib/prisma";

/**
 * Wizard reference data. Locations are deliberately NOT loaded here beyond
 * the (small) list of states/UTs — cities, localities and neighbourhoods are
 * fetched on demand by the wizard as each parent is chosen.
 */
export async function getWizardTaxonomy() {
  const [categories, states, amenities] = await Promise.all([
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.stateProvince.findMany({ include: { country: { select: { code: true } } }, orderBy: [{ country: { name: "asc" } }, { name: "asc" }] }),
    prisma.amenity.findMany({ orderBy: { name: "asc" } }),
  ]);

  return {
    categories: categories.map((c) => ({ id: c.id, name: c.name })),
    states: states.map((s) => ({ id: s.id, name: s.name, countryCode: s.country.code })),
    amenities: amenities.map((a) => ({ id: a.id, name: a.name })),
  };
}

/** For editing an existing property: the state plus the option lists along its saved city → locality chain. */
export async function getWizardLocationChain(cityId: string, localityId: string) {
  const city = await prisma.city.findUnique({ where: { id: cityId }, select: { stateId: true } });
  const [cities, localities, neighbourhoods] = await Promise.all([
    city
      ? prisma.city.findMany({ where: { stateId: city.stateId }, select: { id: true, name: true }, orderBy: { name: "asc" } })
      : Promise.resolve([]),
    prisma.locality.findMany({ where: { cityId }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.neighbourhood.findMany({ where: { localityId }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  return { stateId: city?.stateId ?? "", cities, localities, neighbourhoods };
}
