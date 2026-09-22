import type { PropertyCardData } from "@/lib/properties";
import { PropertyCard, PropertyCardSkeleton } from "./property-card";

export function PropertyGrid({
  properties,
  priorityCount = 0,
}: {
  properties: PropertyCardData[];
  /** Number of above-the-fold cards to mark as priority for LCP. */
  priorityCount?: number;
}) {
  if (properties.length === 0) {
    return <PropertyGridEmptyState />;
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 lg:gap-10">
      {properties.map((property, index) => (
        <PropertyCard key={property.id} property={property} priority={index < priorityCount} />
      ))}
    </div>
  );
}

export function PropertyGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 lg:gap-10">
      {Array.from({ length: count }).map((_, index) => (
        <PropertyCardSkeleton key={index} />
      ))}
    </div>
  );
}

export function PropertyGridEmptyState({
  message = "No properties match these filters.",
  action,
}: {
  message?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-4 py-20 text-center">
      <p className="font-display text-lg text-ink">{message}</p>
      {action}
    </div>
  );
}
