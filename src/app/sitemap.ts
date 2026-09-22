import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [properties, cities, localities, categories] = await Promise.all([
    prisma.property.findMany({
      where: { status: { in: ["PUBLISHED", "UNDER_OFFER"] } },
      select: { slug: true, updatedAt: true },
    }),
    prisma.city.findMany({ select: { slug: true } }),
    prisma.locality.findMany({ select: { slug: true, city: { select: { slug: true } } } }),
    prisma.category.findMany({ select: { slug: true } }),
  ]);

  const cityRoutes = cities.map((city) => ({
    url: `${SITE_URL}/${city.slug}`,
    changeFrequency: "daily" as const,
  }));

  const localityRoutes = localities.map((locality) => ({
    url: `${SITE_URL}/${locality.city.slug}/${locality.slug}`,
    changeFrequency: "daily" as const,
  }));

  const categoryRoutesPerCity = cities.flatMap((city) =>
    categories.map((category) => ({
      url: `${SITE_URL}/${city.slug}/${category.slug}`,
      changeFrequency: "daily" as const,
    })),
  );

  const propertyRoutes = properties.map((property) => ({
    url: `${SITE_URL}/properties/${property.slug}`,
    lastModified: property.updatedAt,
    changeFrequency: "weekly" as const,
  }));

  return [
    { url: SITE_URL, changeFrequency: "daily" },
    { url: `${SITE_URL}/search`, changeFrequency: "hourly" },
    ...cityRoutes,
    ...localityRoutes,
    ...categoryRoutesPerCity,
    ...propertyRoutes,
  ];
}
