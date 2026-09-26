import { PrismaClient, type ListingType, type AreaUnit } from "@prisma/client";

const prisma = new PrismaClient();

// DEVELOPMENT-ONLY placeholder photography (picsum.photos). Production never
// depends on it: next.config.ts does not allow this host in production
// builds, and the public UI skips such URLs there. Do not run this seed
// against a production database — real photos are uploaded through the
// admin ImageManager into Supabase Storage.
function placeholderImage(seed: string, w = 1200, h = 900) {
  return `https://picsum.photos/seed/${seed}/${w}/${h}`;
}

async function main() {
  const country = await prisma.country.upsert({
    where: { code: "IN" },
    update: {},
    create: { name: "India", code: "IN" },
  });

  const state = await prisma.stateProvince.upsert({
    where: { countryId_name: { countryId: country.id, name: "Uttar Pradesh" } },
    update: {},
    create: { name: "Uttar Pradesh", code: "UP", countryId: country.id },
  });

  const city = await prisma.city.upsert({
    where: { slug: "lucknow" },
    update: { imageUrl: placeholderImage("lucknow-city", 1200, 1500) },
    create: {
      name: "Lucknow",
      slug: "lucknow",
      stateId: state.id,
      imageUrl: placeholderImage("lucknow-city", 1200, 1500),
    },
  });

  const localityNames = ["Gomti Nagar", "Hazratganj", "Indira Nagar", "Aliganj"];
  const localities = await Promise.all(
    localityNames.map((name) =>
      prisma.locality.upsert({
        where: { cityId_slug: { cityId: city.id, slug: slugify(name) } },
        update: { imageUrl: placeholderImage(slugify(name), 1200, 1500) },
        create: {
          name,
          slug: slugify(name),
          cityId: city.id,
          imageUrl: placeholderImage(slugify(name), 1200, 1500),
        },
      }),
    ),
  );

  await prisma.neighbourhood.upsert({
    where: {
      localityId_slug: { localityId: localities[0].id, slug: "vibhuti-khand" },
    },
    update: {},
    create: { name: "Vibhuti Khand", slug: "vibhuti-khand", localityId: localities[0].id },
  });

  const categoryDefs = [
    { name: "Apartments", areaUnit: "SQFT" as AreaUnit },
    { name: "Villas", areaUnit: "SQFT" as AreaUnit },
    { name: "Independent Houses", areaUnit: "SQFT" as AreaUnit },
    { name: "Plots", areaUnit: "SQFT" as AreaUnit },
  ];
  const categories = await Promise.all(
    categoryDefs.map((def) =>
      prisma.category.upsert({
        where: { slug: slugify(def.name) },
        update: { imageUrl: placeholderImage(slugify(def.name), 1200, 900) },
        create: {
          name: def.name,
          slug: slugify(def.name),
          imageUrl: placeholderImage(slugify(def.name), 1200, 900),
        },
      }),
    ),
  );

  const amenityNames = [
    "Covered parking",
    "Lift",
    "Power backup",
    "24x7 security",
    "Gymnasium",
    "Swimming pool",
    "Club house",
    "Park / green space",
  ];
  const amenities = await Promise.all(
    amenityNames.map((name) =>
      prisma.amenity.upsert({
        where: { slug: slugify(name) },
        update: {},
        create: { name, slug: slugify(name) },
      }),
    ),
  );

  // ---- Sample properties (dev-only, for visual validation) ----
  const sampleProperties = [
    {
      title: "3 BHK Apartment",
      listingType: "SALE" as ListingType,
      categoryId: categories[0].id,
      localityIndex: 0,
      price: 8_500_000,
      area: 1650,
      bedrooms: 3,
      bathrooms: 3,
      featured: true,
    },
    {
      title: "2 BHK Apartment",
      listingType: "RENT" as ListingType,
      categoryId: categories[0].id,
      localityIndex: 1,
      price: 28_000,
      rentPeriod: "MONTHLY" as const,
      area: 1100,
      bedrooms: 2,
      bathrooms: 2,
      featured: true,
    },
    {
      title: "4 BHK Villa",
      listingType: "SALE" as ListingType,
      categoryId: categories[1].id,
      localityIndex: 0,
      price: 21_000_000,
      area: 3200,
      bedrooms: 4,
      bathrooms: 4,
      featured: true,
    },
    {
      title: "Independent House",
      listingType: "SALE" as ListingType,
      categoryId: categories[2].id,
      localityIndex: 2,
      price: 12_500_000,
      area: 2400,
      bedrooms: 3,
      bathrooms: 3,
    },
    {
      title: "Residential Plot",
      listingType: "SALE" as ListingType,
      categoryId: categories[3].id,
      localityIndex: 3,
      price: 6_000_000,
      area: 2000,
    },
    {
      title: "3 BHK Apartment",
      listingType: "RENT" as ListingType,
      categoryId: categories[0].id,
      localityIndex: 1,
      price: 35_000,
      rentPeriod: "MONTHLY" as const,
      area: 1450,
      bedrooms: 3,
      bathrooms: 2,
    },
    {
      title: "2 BHK Apartment",
      listingType: "SALE" as ListingType,
      categoryId: categories[0].id,
      localityIndex: 2,
      price: 6_200_000,
      area: 950,
      bedrooms: 2,
      bathrooms: 2,
    },
    {
      title: "5 BHK Villa",
      listingType: "SALE" as ListingType,
      categoryId: categories[1].id,
      localityIndex: 3,
      price: 32_000_000,
      area: 4100,
      bedrooms: 5,
      bathrooms: 5,
    },
  ];

  for (const [index, def] of sampleProperties.entries()) {
    const slug = `${slugify(def.title)}-${slugify(localities[def.localityIndex].name)}-${slugify(city.name)}-${index}`;

    const property = await prisma.property.upsert({
      where: { slug },
      update: {},
      create: {
        title: def.title,
        slug,
        listingType: def.listingType,
        rentPeriod: "rentPeriod" in def ? def.rentPeriod : undefined,
        categoryId: def.categoryId,
        cityId: city.id,
        localityId: localities[def.localityIndex].id,
        priceAmount: def.price,
        priceCurrency: "INR",
        areaValue: def.area,
        areaUnit: "SQFT",
        bedrooms: def.bedrooms,
        bathrooms: def.bathrooms,
        furnishing: "SEMI_FURNISHED",
        constructionStatus: "READY_TO_MOVE",
        description:
          "A well-maintained home in a quiet, established part of the city, close to schools, parks and everyday conveniences. Shown by our team — reach out to arrange a visit.",
        status: "PUBLISHED",
        featured: "featured" in def && def.featured === true,
        publishedAt: new Date(),
        amenities: {
          createMany: {
            data: amenities.slice(0, 4 + (index % 4)).map((a) => ({ amenityId: a.id })),
          },
        },
        images: {
          createMany: {
            data: Array.from({ length: 6 }).map((_, i) => ({
              url: placeholderImage(`${slug}-${i}`),
              altText: `${def.title} in ${localities[def.localityIndex].name} — photo ${i + 1}`,
              roomLabel: ["Exterior", "Living room", "Kitchen", "Bedroom", "Bathroom", "View"][i],
              position: i,
              isCover: i === 0,
            })),
          },
        },
      },
    });

    if ("featured" in def && def.featured === true) {
      await prisma.featuredProperty.upsert({
        where: { propertyId: property.id },
        update: { position: index },
        create: { propertyId: property.id, position: index },
      });
    }
  }

  await prisma.featuredCity.upsert({
    where: { cityId: city.id },
    update: { position: 0 },
    create: { cityId: city.id, position: 0 },
  });

  console.log("Seeded taxonomy + 8 sample published properties for local visual validation.");
  console.log(
    "Next: add yourself as an AdminUser (see README) — seeding cannot create Supabase Auth users.",
  );
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
