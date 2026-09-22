import { PropertyGridSkeleton } from "@/components/property/property-grid";

export default function SearchLoading() {
  return (
    <div className="px-4 py-8 sm:px-6 lg:px-10">
      <PropertyGridSkeleton count={6} />
    </div>
  );
}
