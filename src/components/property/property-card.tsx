import Image from "next/image";
import Link from "next/link";
import { formatArea, formatPrice } from "@/lib/format";
import type { PropertyCardData } from "@/lib/properties";

const STATUS_LABEL: Partial<Record<PropertyCardData["status"], string>> = {
  UNDER_OFFER: "Under offer",
  SOLD: "Sold",
  RENTED: "Rented",
};

/**
 * The single property-card component reused across the homepage, search
 * results, similar properties, and location/category pages. Photo, price,
 * title, location, beds/baths/area — nothing else. No badge stacking.
 */
export function PropertyCard({
  property,
  priority = false,
  sizes = "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw",
}: {
  property: PropertyCardData;
  priority?: boolean;
  /** Override for contexts where the card isn't in the standard 1/2/3-col grid (e.g. the ~45%-wide search results list). */
  sizes?: string;
}) {
  const statusLabel = STATUS_LABEL[property.status];
  const specs = [
    property.bedrooms !== null && `${property.bedrooms} bd`,
    property.bathrooms !== null && `${property.bathrooms} ba`,
    formatArea(property.areaValue, property.areaUnit),
  ].filter(Boolean);

  return (
    <Link
      href={`/properties/${property.slug}`}
      className="group block rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
    >
      <div className="relative aspect-4/3 overflow-hidden rounded-md bg-canvas-alt">
        {property.coverImage ? (
          <Image
            src={property.coverImage.url}
            alt={property.coverImage.altText}
            fill
            sizes={sizes}
            priority={priority}
            className="object-cover transition-transform duration-300 ease-out group-hover:scale-[1.03] group-focus-visible:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-ink-tertiary">
            No photo yet
          </div>
        )}

        {statusLabel && (
          <span className="absolute left-3 top-3 rounded-xs bg-surface/95 px-2 py-1 text-xs font-medium text-unavailable">
            {statusLabel}
          </span>
        )}

        <span className="absolute right-3 top-3 rounded-xs bg-surface/95 px-2 py-1 text-xs font-medium text-ink-secondary">
          {property.listingType === "SALE" ? "For Sale" : "For Rent"}
        </span>
      </div>

      <div className="mt-3 space-y-0.5">
        <p className="font-sans text-lg font-semibold tabular-nums text-ink">
          {formatPrice(property.priceAmount, property.priceCurrency)}
          {property.listingType === "RENT" && (
            <span className="text-sm font-normal text-ink-secondary">
              {" "}
              /{property.rentPeriod === "YEARLY" ? "yr" : "mo"}
            </span>
          )}
        </p>
        <p className="text-base font-medium text-ink">{property.title}</p>
        <p className="text-sm text-ink-secondary">
          {property.localityName}, {property.cityName}
        </p>
        <p className="pt-1 text-sm text-ink-secondary">{specs.join(" · ")}</p>
      </div>
    </Link>
  );
}

export function PropertyCardSkeleton() {
  return (
    <div aria-hidden="true">
      <div className="aspect-4/3 animate-pulse rounded-md bg-canvas-alt" />
      <div className="mt-3 space-y-2">
        <div className="h-5 w-24 animate-pulse rounded-xs bg-canvas-alt" />
        <div className="h-4 w-40 animate-pulse rounded-xs bg-canvas-alt" />
        <div className="h-4 w-32 animate-pulse rounded-xs bg-canvas-alt" />
      </div>
    </div>
  );
}
