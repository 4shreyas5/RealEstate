import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { searchProperties } from "@/lib/properties";
import { PropertyGrid } from "@/components/property/property-grid";

export const dynamic = "force-dynamic";

// Cached per request — called from both generateMetadata and the page body.
const resolvePage = cache(async (citySlug: string, slug: string) => {
  const city = await prisma.city.findUnique({ where: { slug: citySlug } });
  if (!city) return null;

  const locality = await prisma.locality.findUnique({
    where: { cityId_slug: { cityId: city.id, slug } },
  });
  if (locality) return { kind: "locality" as const, city, locality };

  const category = await prisma.category.findUnique({ where: { slug } });
  if (category) return { kind: "category" as const, city, category };

  return null;
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ city: string; slug: string }>;
}): Promise<Metadata> {
  const { city, slug } = await params;
  const resolved = await resolvePage(city, slug);
  if (!resolved) return {};

  const name = resolved.kind === "locality" ? resolved.locality.name : resolved.category.name;
  const title =
    resolved.kind === "locality"
      ? `Properties in ${name}, ${resolved.city.name}`
      : `${name} in ${resolved.city.name}`;

  return {
    title,
    description: `Curated ${resolved.kind === "locality" ? "properties in" : name.toLowerCase() + " in"} ${resolved.city.name}.`,
    alternates: { canonical: `/${resolved.city.slug}/${slug}` },
  };
}

export default async function LocalityOrCategoryPage({
  params,
}: {
  params: Promise<{ city: string; slug: string }>;
}) {
  const { city: citySlug, slug } = await params;
  const resolved = await resolvePage(citySlug, slug);
  if (!resolved) notFound();

  const { properties, count } =
    resolved.kind === "locality"
      ? await searchProperties({ cityId: resolved.city.id, localityId: resolved.locality.id })
      : await searchProperties({ cityId: resolved.city.id, categoryId: resolved.category.id });

  const name = resolved.kind === "locality" ? resolved.locality.name : resolved.category.name;

  return (
    <div className="mx-auto max-w-(--breakpoint-xl) px-4 py-16 sm:px-6 lg:px-10">
      <p className="text-sm text-ink-secondary">
        <Link href={`/${resolved.city.slug}`} className="hover:underline">
          {resolved.city.name}
        </Link>
      </p>
      <h1 className="font-display mt-1 text-3xl font-medium text-ink">
        {resolved.kind === "locality" ? name : `${name} in ${resolved.city.name}`}
      </h1>
      <p className="mt-2 text-ink-secondary">{count} curated homes</p>

      <div className="mt-8">
        <PropertyGrid properties={properties} priorityCount={3} />
      </div>
    </div>
  );
}
