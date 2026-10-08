import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const dynamic = "force-dynamic";

/** Every URL on the public site serves either language (cookie/`hl`-negotiated,
 * see src/proxy.ts) rather than living at a separate path, so hreflang
 * alternates point at the same path with an `hl` override — real, distinct,
 * crawlable URLs per language without a locale-prefixed route structure. */
function languages(url: string) {
  return { en: `${url}?hl=en`, hi: `${url}?hl=hi`, "x-default": `${url}?hl=en` };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Only cities/localities that actually have listings — a pan-India location
  // taxonomy must not add hundreds of empty pages to the sitemap.
  const listed = { properties: { some: { status: "PUBLISHED" as const } } };
  const [properties, cities, localities, categories] = await Promise.all([
    prisma.property.findMany({
      where: { status: { in: ["PUBLISHED", "UNDER_OFFER"] } },
      select: { slug: true, updatedAt: true },
    }),
    prisma.city.findMany({ where: listed, select: { slug: true } }),
    prisma.locality.findMany({ where: listed, select: { slug: true, city: { select: { slug: true } } } }),
    prisma.category.findMany({ select: { slug: true } }),
  ]);

  const cityRoutes = cities.map((city) => {
    const url = `${SITE_URL}/${city.slug}`;
    return { url, changeFrequency: "daily" as const, alternates: { languages: languages(url) } };
  });

  const localityRoutes = localities.map((locality) => {
    const url = `${SITE_URL}/${locality.city.slug}/${locality.slug}`;
    return { url, changeFrequency: "daily" as const, alternates: { languages: languages(url) } };
  });

  const categoryRoutesPerCity = cities.flatMap((city) =>
    categories.map((category) => {
      const url = `${SITE_URL}/${city.slug}/${category.slug}`;
      return { url, changeFrequency: "daily" as const, alternates: { languages: languages(url) } };
    }),
  );

  const propertyRoutes = properties.map((property) => {
    const url = `${SITE_URL}/properties/${property.slug}`;
    return {
      url,
      lastModified: property.updatedAt,
      changeFrequency: "weekly" as const,
      alternates: { languages: languages(url) },
    };
  });

  return [
    { url: SITE_URL, changeFrequency: "daily", alternates: { languages: languages(SITE_URL) } },
    { url: `${SITE_URL}/buy`, changeFrequency: "hourly", alternates: { languages: languages(`${SITE_URL}/buy`) } },
    { url: `${SITE_URL}/rent`, changeFrequency: "hourly", alternates: { languages: languages(`${SITE_URL}/rent`) } },
    {
      url: `${SITE_URL}/search`,
      changeFrequency: "hourly",
      alternates: { languages: languages(`${SITE_URL}/search`) },
    },
    {
      url: `${SITE_URL}/locations`,
      changeFrequency: "daily",
      alternates: { languages: languages(`${SITE_URL}/locations`) },
    },
    ...cityRoutes,
    ...localityRoutes,
    ...categoryRoutesPerCity,
    ...propertyRoutes,
  ];
}
