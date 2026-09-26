import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Image from "next/image";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { searchProperties } from "@/lib/properties";
import { PropertyGrid } from "@/components/property/property-grid";
import { isRenderableImageUrl } from "@/lib/storage";
import { EditorialImageCard } from "@/components/shared/editorial-image-card";

export const dynamic = "force-dynamic";

// Cached per request — called from both generateMetadata and the page body.
const getCity = cache(async (slug: string) => {
  return prisma.city.findUnique({
    where: { slug },
    include: { localities: { orderBy: { name: "asc" } } },
  });
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ city: string }>;
}): Promise<Metadata> {
  const { city: citySlug } = await params;
  const city = await getCity(citySlug);
  if (!city) return {};
  return {
    title: `Properties in ${city.name}`,
    description: `Curated properties in ${city.name}, shown and shortlisted by our team.`,
    alternates: { canonical: `/${city.slug}` },
  };
}

export default async function CityPage({ params }: { params: Promise<{ city: string }> }) {
  const { city: citySlug } = await params;
  const city = await getCity(citySlug);
  if (!city) notFound();

  const { properties, count } = await searchProperties({ cityId: city.id });

  return (
    <div>
      <section className="relative flex min-h-[360px] items-end overflow-hidden bg-ink text-canvas">
        {isRenderableImageUrl(city.imageUrl) && (
          <Image src={city.imageUrl} alt="" fill sizes="100vw" className="object-cover opacity-70" />
        )}
        <div className="relative mx-auto w-full max-w-(--breakpoint-xl) px-4 pb-10 sm:px-6 lg:px-10">
          <h1 className="font-display text-4xl font-light">Properties in {city.name}</h1>
          <p className="mt-2 text-canvas/80">{count} curated homes</p>
        </div>
      </section>

      {city.localities.length > 0 && (
        <section className="mx-auto max-w-(--breakpoint-xl) px-4 py-12 sm:px-6 lg:px-10">
          <h2 className="font-display text-xl font-medium text-ink">Localities</h2>
          <div className="mt-6 flex gap-4 overflow-x-auto pb-2 lg:grid lg:grid-cols-4 lg:overflow-visible">
            {city.localities.map((locality) => (
              <EditorialImageCard
                key={locality.id}
                href={`/${city.slug}/${locality.slug}`}
                label={locality.name}
                imageUrl={locality.imageUrl}
                imageAlt={locality.name}
                className="w-48 lg:w-auto"
              />
            ))}
          </div>
        </section>
      )}

      <section className="mx-auto max-w-(--breakpoint-xl) px-4 py-12 sm:px-6 lg:px-10">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-medium text-ink">All properties</h2>
          <Link href={`/search?city=${city.id}`} className="text-sm font-medium text-accent">
            Refine on the full search
          </Link>
        </div>
        <div className="mt-6">
          <PropertyGrid properties={properties} priorityCount={3} />
        </div>
      </section>
    </div>
  );
}
