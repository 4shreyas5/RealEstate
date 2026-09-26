import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPropertyBySlug, getSimilarProperties } from "@/lib/properties";
import { formatArea, formatListingType, formatPrice } from "@/lib/format";
import { PropertyGallery } from "@/components/property/property-gallery";
import { PrimarySpecs, SecondarySpecs } from "@/components/property/property-specs";
import { AmenitiesList } from "@/components/property/amenities-list";
import { ContactPanel } from "@/components/property/contact-panel";
import { ContactActionsRow } from "@/components/shared/contact-actions";
import { PropertyGrid } from "@/components/property/property-grid";
import { isRenderableImageUrl } from "@/lib/storage";
import { PropertyLocationMap } from "@/components/property/property-location-map";

const CLOSED_STATUSES = new Set(["SOLD", "RENTED", "UNAVAILABLE", "ARCHIVED"]);

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const property = await getPropertyBySlug(slug);
  if (!property) return {};

  const title = property.metaTitle || `${property.title} in ${property.locality.name}, ${property.city.name}`;
  const description =
    property.metaDescription ||
    `${formatPrice(Number(property.priceAmount), property.priceCurrency)} · ${formatArea(Number(property.areaValue), property.areaUnit)} · ${property.locality.name}, ${property.city.name}`;
  const noindex = property.status === "DRAFT" || CLOSED_STATUSES.has(property.status);

  return {
    title,
    description,
    alternates: { canonical: `/properties/${property.slug}` },
    robots: noindex ? { index: false, follow: true } : undefined,
    openGraph: {
      title,
      description,
      type: "website",
      images: property.images[0] ? [{ url: property.images[0].url }] : undefined,
    },
  };
}

export default async function PropertyDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const property = await getPropertyBySlug(slug);

  if (!property || property.status === "DRAFT") notFound();

  const similar = await getSimilarProperties(property.id, property.localityId, 6);
  const isClosed = CLOSED_STATUSES.has(property.status);

  const context = {
    propertyId: property.id,
    cityId: property.cityId,
    localityId: property.localityId,
    title: property.title,
    locality: property.locality.name,
    url: `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/properties/${property.slug}`,
    source: "detail_sticky_bar",
  };

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Residence",
    name: property.title,
    description: property.description,
    address: {
      "@type": "PostalAddress",
      addressLocality: property.locality.name,
      addressRegion: property.city.name,
    },
    image: property.images.map((img) => img.url),
    numberOfRooms: property.bedrooms ?? undefined,
    floorSize: {
      "@type": "QuantitativeValue",
      value: Number(property.areaValue),
      unitCode: property.areaUnit,
    },
  };

  return (
    <div className="pb-24 lg:pb-0">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <div className="mx-auto max-w-(--breakpoint-xl) px-4 py-8 sm:px-6 lg:px-10">
        <PropertyGallery
          images={property.images.filter((img) => isRenderableImageUrl(img.url)).map((img) => ({
            id: img.id,
            url: img.url,
            altText: img.altText,
            roomLabel: img.roomLabel,
          }))}
        />

        <div className="mt-8 lg:grid lg:grid-cols-[1fr_320px] lg:gap-10">
          <div>
            {isClosed && (
              <p className="mb-4 rounded-sm border border-border-strong bg-canvas-alt px-4 py-3 text-sm text-ink-secondary">
                This home is no longer available. Explore similar homes below.
              </p>
            )}

            <h1 className="font-display text-3xl font-medium text-ink">{property.title}</h1>
            <p className="mt-2 font-sans text-2xl font-semibold tabular-nums text-ink">
              {formatPrice(Number(property.priceAmount), property.priceCurrency)}
              <span className="ml-2 text-sm font-normal text-ink-secondary">
                {formatListingType(property.listingType, property.rentPeriod)}
              </span>
            </p>
            <p className="mt-1 text-ink-secondary">
              {property.locality.name}
              {property.neighbourhood ? `, ${property.neighbourhood.name}` : ""}, {property.city.name}
            </p>

            <div className="mt-6">
              <PrimarySpecs
                specs={{
                  bedrooms: property.bedrooms,
                  bathrooms: property.bathrooms,
                  areaValue: Number(property.areaValue),
                  areaUnit: property.areaUnit,
                  categoryName: property.category.name,
                  floor: property.floor,
                  totalFloors: property.totalFloors,
                  facing: property.facing,
                  furnishing: property.furnishing,
                  propertyAgeYears: property.propertyAgeYears,
                  constructionStatus: property.constructionStatus,
                  possessionDate: property.possessionDate,
                  parkingSpaces: property.parkingSpaces,
                }}
              />
            </div>

            <div className="mt-6 border-b border-border py-6">
              <h2 className="font-display text-xl font-medium text-ink">About this home</h2>
              <p className="mt-3 whitespace-pre-wrap text-ink-secondary">{property.description}</p>
            </div>

            <AmenitiesList amenities={property.amenities.map((a) => a.amenity)} />

            <SecondarySpecs
              specs={{
                bedrooms: property.bedrooms,
                bathrooms: property.bathrooms,
                areaValue: Number(property.areaValue),
                areaUnit: property.areaUnit,
                categoryName: property.category.name,
                floor: property.floor,
                totalFloors: property.totalFloors,
                facing: property.facing,
                furnishing: property.furnishing,
                propertyAgeYears: property.propertyAgeYears,
                constructionStatus: property.constructionStatus,
                possessionDate: property.possessionDate,
                parkingSpaces: property.parkingSpaces,
              }}
            />

            {property.latitude !== null && property.longitude !== null && (
              <div className="py-6">
                <h2 className="font-display text-xl font-medium text-ink">Location</h2>
                <div className="mt-4">
                  <PropertyLocationMap latitude={property.latitude} longitude={property.longitude} />
                </div>
              </div>
            )}
          </div>

          <div className="mt-8 lg:mt-0">
            <ContactPanel
              priceAmount={Number(property.priceAmount)}
              priceCurrency={property.priceCurrency}
              context={context}
            />
          </div>
        </div>
      </div>

      {similar.length > 0 && (
        <section className="border-t border-border bg-canvas-alt py-16">
          <div className="mx-auto max-w-(--breakpoint-xl) px-4 sm:px-6 lg:px-10">
            <h2 className="font-display text-2xl font-medium text-ink">Similar properties</h2>
            <div className="mt-8">
              <PropertyGrid properties={similar} />
            </div>
          </div>
        </section>
      )}

      <section className="py-16 text-center">
        <h2 className="font-display text-2xl font-medium text-ink">Still deciding?</h2>
        <p className="mt-2 text-ink-secondary">Talk to the team that knows this home.</p>
        <div className="mt-6 flex justify-center">
          <ContactActionsRow context={{ ...context, source: "detail_final_cta" }} />
        </div>
      </section>
    </div>
  );
}
