/**
 * Creates exactly one PUBLISHED, clearly QA-labelled property before the
 * suite runs, so read-only specs that need real public listings (locations
 * list, the search filter sheet's city dropdown, Hindi property detail /
 * enquiry) pass deterministically — independent of whatever real listings
 * currently exist or their status. Pairs with global-teardown.ts, which
 * removes everything this creates. Never touches existing properties.
 *
 * Uses Prisma directly (not the admin UI/server actions) because this runs
 * before any browser is launched and doesn't require admin credentials.
 */
import { PrismaClient } from "@prisma/client";
import "dotenv/config";
import { QA_PUBLISHED_FIXTURE_TITLE, QA_PUBLISHED_NO_PHOTOS_TITLE, QA_PUBLISHED_NO_PHOTOS_SLUG } from "./fixtures";

function placeholderImage(seed: string) {
  return `https://picsum.photos/seed/${seed}/1200/900`;
}

export default async function globalSetup() {
  const prisma = new PrismaClient();
  try {
    const city = await prisma.city.findFirst({ where: { name: "Lucknow" } });
    const locality = city ? await prisma.locality.findFirst({ where: { cityId: city.id, name: "Gomti Nagar" } }) : null;
    const category = await prisma.category.findFirst({ orderBy: { name: "asc" } });

    if (!city || !category) {
      console.warn("[global-setup] No seeded city/category found — skipping published-property fixture.");
      return;
    }

    const slug = `qa-e2e-fixture-published-${Date.now()}`;
    const property = await prisma.property.create({
      data: {
        title: `${QA_PUBLISHED_FIXTURE_TITLE} ${Date.now()}`,
        slug,
        listingType: "SALE",
        categoryId: category.id,
        cityId: city.id,
        localityId: locality?.id ?? null,
        priceAmount: 5_000_000,
        priceCurrency: "INR",
        areaValue: 1200,
        areaUnit: "SQFT",
        bedrooms: 3,
        bathrooms: 2,
        description: "Automated E2E fixture property — safe to ignore, removed after the test run.",
        status: "PUBLISHED",
        publishedAt: new Date(),
        images: {
          create: Array.from({ length: 5 }, (_, i) => ({
            url: placeholderImage(`${slug}-${i}`),
            altText: `QA fixture photo ${i + 1}`,
            position: i,
            isCover: i === 0,
          })),
        },
      },
    });

    console.log(`[global-setup] Created published fixture property ${property.id} (${property.slug})`);

    // A second published fixture with zero photographs — photos are optional
    // for publishing, so public pages must render this correctly too (card
    // placeholder, gallery placeholder, no broken <img>). Upserted on a fixed
    // slug (not a timestamped one) so public.spec.ts can navigate straight to
    // it, and so a prior run's teardown failure never collides with a P2002.
    const noPhotoData = {
      title: `${QA_PUBLISHED_NO_PHOTOS_TITLE} ${Date.now()}`,
      listingType: "SALE" as const,
      categoryId: category.id,
      cityId: city.id,
      localityId: locality?.id ?? null,
      priceAmount: 3_000_000,
      priceCurrency: "INR",
      areaValue: 900,
      areaUnit: "SQFT" as const,
      bedrooms: 2,
      bathrooms: 1,
      description: "Automated E2E fixture property with no photographs — safe to ignore, removed after the test run.",
      status: "PUBLISHED" as const,
      publishedAt: new Date(),
    };
    const noPhotoProperty = await prisma.property.upsert({
      where: { slug: QA_PUBLISHED_NO_PHOTOS_SLUG },
      create: { ...noPhotoData, slug: QA_PUBLISHED_NO_PHOTOS_SLUG },
      update: noPhotoData,
    });
    // Belt and suspenders: strip any images a previous, non-cleaned-up run left on it.
    await prisma.propertyImage.deleteMany({ where: { propertyId: noPhotoProperty.id } });

    console.log(`[global-setup] Created no-photo published fixture property ${noPhotoProperty.id} (${noPhotoProperty.slug})`);
  } finally {
    await prisma.$disconnect();
  }
}
