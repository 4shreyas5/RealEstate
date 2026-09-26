/**
 * PAN-INDIA location seed — production-safe and idempotent.
 *
 *   npm run db:seed:locations            # DRY RUN (default): prints exactly what would be inserted, writes nothing
 *   npm run db:seed:locations -- --apply # inserts the missing rows
 *
 * Guarantees:
 *  - INSERT-only: existing rows are never updated, renamed or deleted
 *    (createMany + skipDuplicates → ON CONFLICT DO NOTHING on the unique keys).
 *  - Re-running creates nothing new. No properties/images/leads are touched.
 *  - Aborts before writing if a planned slug would collide with a static route
 *    or with an existing city/locality that belongs to a different parent.
 */
import { PrismaClient } from "@prisma/client";
import { CITIES, COUNTRY, LOCALITIES, NEIGHBOURHOODS, RESERVED_SLUGS, STATES } from "./data/india-locations";

const prisma = new PrismaClient();
const APPLY = process.argv.includes("--apply");

export function slugify(input: string) {
  return input.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");
}

function cuidLike() {
  // Prisma's @default(cuid()) is client-side; createMany needs ids supplied explicitly.
  return "c" + Date.now().toString(36) + Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 8);
}

async function main() {
  const problems: string[] = [];

  // ---- read current state (read-only)
  const country = await prisma.country.findUnique({ where: { code: COUNTRY.code } });
  const existingStates = country ? await prisma.stateProvince.findMany({ where: { countryId: country.id } }) : [];
  const existingCities = await prisma.city.findMany({ include: { state: true } });
  const existingLocalities = await prisma.locality.findMany({ include: { city: true } });
  const existingNeighbourhoods = await prisma.neighbourhood.findMany();

  const stateByName = new Map(existingStates.map((s) => [s.name, s]));
  const citySlugs = new Map(existingCities.map((c) => [c.slug, c]));

  // ---- plan
  const newStates = STATES.filter((s) => !stateByName.has(s.name));
  const newCities: { name: string; slug: string; state: string }[] = [];
  const seenSlugs = new Set<string>();
  for (const [state, names] of Object.entries(CITIES)) {
    if (!STATES.some((s) => s.name === state)) problems.push(`City list references unknown state "${state}"`);
    for (const name of names) {
      const slug = slugify(name);
      if (RESERVED_SLUGS.includes(slug)) problems.push(`City slug "${slug}" collides with a reserved route`);
      if (seenSlugs.has(slug)) problems.push(`Duplicate city slug in seed data: "${slug}"`);
      seenSlugs.add(slug);
      const existing = citySlugs.get(slug);
      if (existing) {
        if (existing.state.name !== state) problems.push(`Existing city "${existing.name}" (slug ${slug}) is in ${existing.state.name}, seed says ${state}`);
        continue;
      }
      newCities.push({ name, slug, state });
    }
  }

  const allCityNames = new Map<string, string>(); // city name -> slug (existing or planned)
  for (const c of existingCities) allCityNames.set(c.name, c.slug);
  for (const c of newCities) allCityNames.set(c.name, c.slug);

  const localityKey = (citySlug: string, slug: string) => `${citySlug}/${slug}`;
  const existingLocalityKeys = new Set(existingLocalities.map((l) => localityKey(l.city.slug, l.slug)));
  const newLocalities: { name: string; slug: string; city: string }[] = [];
  for (const [city, names] of Object.entries(LOCALITIES)) {
    const citySlug = allCityNames.get(city);
    if (!citySlug) { problems.push(`Locality list references unknown city "${city}"`); continue; }
    const seen = new Set<string>();
    for (const name of names) {
      const slug = slugify(name);
      if (seen.has(slug)) problems.push(`Duplicate locality slug ${city}/${slug}`);
      seen.add(slug);
      if (existingLocalityKeys.has(localityKey(citySlug, slug))) continue;
      newLocalities.push({ name, slug, city });
    }
  }

  const existingNbKeys = new Set(existingNeighbourhoods.map((n) => `${n.localityId}/${n.slug}`));
  const localityIdByKey = new Map(existingLocalities.map((l) => [localityKey(l.city.slug, l.slug), l.id]));
  const newNeighbourhoods: { name: string; slug: string; locality: string; city: string }[] = [];
  for (const [city, byLocality] of Object.entries(NEIGHBOURHOODS)) {
    for (const [locality, names] of Object.entries(byLocality)) {
      const citySlug = allCityNames.get(city);
      const lid = citySlug ? localityIdByKey.get(localityKey(citySlug, slugify(locality))) : undefined;
      for (const name of names) {
        if (lid && existingNbKeys.has(`${lid}/${slugify(name)}`)) continue;
        newNeighbourhoods.push({ name, slug: slugify(name), locality, city });
      }
    }
  }

  // ---- report
  console.log(APPLY ? "MODE: APPLY (writing missing rows only)\n" : "MODE: DRY RUN (nothing is written)\n");
  console.log(`Existing:  country=${country ? 1 : 0}  states=${existingStates.length}  cities=${existingCities.length}  localities=${existingLocalities.length}  neighbourhoods=${existingNeighbourhoods.length}`);
  console.log(`To insert: country=${country ? 0 : 1}  states=${newStates.length}  cities=${newCities.length}  localities=${newLocalities.length}  neighbourhoods=${newNeighbourhoods.length}\n`);
  if (!country) console.log(`COUNTRY  + ${COUNTRY.name} (${COUNTRY.code})`);
  for (const s of newStates) console.log(`STATE    + ${s.name} (${s.code}, ${s.type === "ut" ? "Union Territory" : "State"})`);
  for (const c of newCities) console.log(`CITY     + ${c.name}  /${c.slug}  [${c.state}]`);
  for (const l of newLocalities) console.log(`LOCALITY + ${l.name}  ${l.city}/${l.slug}`);
  for (const n of newNeighbourhoods) console.log(`NEIGHB.  + ${n.name}  ${n.city} › ${n.locality}`);
  if (problems.length) { console.log("\nPROBLEMS (abort):"); problems.forEach((p) => console.log("  - " + p)); process.exitCode = 1; return; }
  if (!APPLY) { console.log("\nDry run only. Re-run with --apply to insert exactly the rows listed above."); return; }

  // ---- apply (insert-only)
  const c = country ?? (await prisma.country.create({ data: { name: COUNTRY.name, code: COUNTRY.code } }));
  if (newStates.length) {
    await prisma.stateProvince.createMany({
      data: newStates.map((s) => ({ id: cuidLike(), name: s.name, code: s.code, countryId: c.id })),
      skipDuplicates: true,
    });
  }
  const states = await prisma.stateProvince.findMany({ where: { countryId: c.id } });
  const stateId = new Map(states.map((s) => [s.name, s.id]));
  if (newCities.length) {
    await prisma.city.createMany({
      data: newCities.map((x) => ({ id: cuidLike(), name: x.name, slug: x.slug, stateId: stateId.get(x.state)! })),
      skipDuplicates: true,
    });
  }
  const cities = await prisma.city.findMany();
  const cityIdByName = new Map(cities.map((x) => [x.name, x.id]));
  if (newLocalities.length) {
    await prisma.locality.createMany({
      data: newLocalities.map((l) => ({ id: cuidLike(), name: l.name, slug: l.slug, cityId: cityIdByName.get(l.city)! })),
      skipDuplicates: true,
    });
  }
  if (newNeighbourhoods.length) {
    const locs = await prisma.locality.findMany({ include: { city: true } });
    const lidByKey = new Map(locs.map((l) => [`${l.city.name}/${l.name}`, l.id]));
    await prisma.neighbourhood.createMany({
      data: newNeighbourhoods.flatMap((n) => {
        const localityId = lidByKey.get(`${n.city}/${n.locality}`);
        return localityId ? [{ id: cuidLike(), name: n.name, slug: n.slug, localityId }] : [];
      }),
      skipDuplicates: true,
    });
  }
  console.log("\nDone. Re-running this command will insert 0 rows.");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
