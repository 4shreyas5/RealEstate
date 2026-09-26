"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PropertyCard } from "@/components/property/property-card";
import { PropertyGridEmptyState } from "@/components/property/property-grid";
import { SearchMap, type MapProperty } from "./search-map";
import { FilterSheet, type FilterTaxonomy } from "./filter-sheet";

export function SearchExperience({
  properties,
  count,
  hasMore,
  taxonomy,
  lockedType,
  emptyMessage = "No properties match these filters. Try widening your price range or clearing a filter.",
}: {
  properties: MapProperty[];
  count: number;
  hasMore: boolean;
  taxonomy: FilterTaxonomy;
  /** Set on the dedicated /buy and /rent routes — the transaction type is the page's identity, not a removable filter. */
  lockedType?: "SALE" | "RENT";
  emptyMessage?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<"list" | "map">("list");
  const [sheetOpen, setSheetOpen] = useState(false);

  // The server gives us the first page for the current filters. When a new
  // `properties` array arrives (filters/sort changed → new navigation → new
  // server render), reset local state to it during render rather than in an
  // effect — the sanctioned React pattern for "adjust state when a prop
  // changes" (avoids the extra render an effect-based sync would cause).
  const [items, setItems] = useState(properties);
  const [moreAvailable, setMoreAvailable] = useState(hasMore);
  const [loadingMore, setLoadingMore] = useState(false);
  const [prevProperties, setPrevProperties] = useState(properties);

  if (properties !== prevProperties) {
    setPrevProperties(properties);
    setItems(properties);
    setMoreAvailable(hasMore);
  }

  /** Re-applies the locked transaction type after any param mutation — it must survive every navigation/fetch on /buy and /rent. */
  function withLockedType(params: URLSearchParams) {
    if (lockedType) params.set("type", lockedType);
    return params;
  }

  function updateParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`${pathname}?${withLockedType(params).toString()}`, { scroll: false });
  }

  function updateParams(changes: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    router.push(`${pathname}?${withLockedType(params).toString()}`, { scroll: false });
  }

  async function loadMore() {
    setLoadingMore(true);
    const params = withLockedType(new URLSearchParams(searchParams.toString()));
    params.set("offset", String(items.length));
    try {
      const res = await fetch(`/api/search?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setItems((prev) => [...prev, ...data.properties]);
        setMoreAvailable(data.hasMore);
      }
    } finally {
      setLoadingMore(false);
    }
  }

  const appliedChips = useMemo(() => {
    const chips: { key: string; label: string }[] = [];
    // On /buy and /rent, the transaction type is the page itself, not a
    // removable filter chip — only surface it as a chip on generic /search.
    const type = searchParams.get("type");
    if (!lockedType && type) chips.push({ key: "type", label: type === "SALE" ? "Buy" : "Rent" });
    const city = searchParams.get("city");
    if (city) {
      const found = taxonomy.cities.find((c) => c.id === city);
      chips.push({ key: "city", label: found?.name ?? "City" });
    }
    if (searchParams.get("locality")) chips.push({ key: "locality", label: "Locality" });
    const category = searchParams.get("category");
    if (category) {
      const found = taxonomy.categories.find((c) => c.id === category);
      if (found) chips.push({ key: "category", label: found.name });
    }
    const bedrooms = searchParams.get("bedrooms");
    if (bedrooms) chips.push({ key: "bedrooms", label: `${bedrooms}+ bd` });
    const minPrice = searchParams.get("minPrice");
    const maxPrice = searchParams.get("maxPrice");
    if (minPrice || maxPrice) {
      chips.push({
        key: "price",
        label: `${minPrice ?? "0"} – ${maxPrice ?? "Any"}`,
      });
    }
    return chips;
  }, [searchParams, taxonomy.categories, taxonomy.cities, lockedType]);

  function clearChip(key: string) {
    if (key === "city") {
      updateParams({ city: null, locality: null, neighbourhood: null });
      return;
    }
    if (key === "price") {
      updateParams({ minPrice: null, maxPrice: null });
      return;
    }
    updateParam(key, null);
  }

  function clearAll() {
    const params = withLockedType(new URLSearchParams());
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  const sort = searchParams.get("sort") ?? "newest";

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-4 sm:px-6 lg:px-10">
        <p className="text-sm text-ink-secondary" aria-live="polite">
          {count} {count === 1 ? "home" : "homes"}
        </p>
        <div className="flex items-center gap-3">
          <label className="sr-only" htmlFor="search-sort">
            Sort
          </label>
          <select
            id="search-sort"
            value={sort}
            onChange={(e) => updateParam("sort", e.target.value)}
            className="rounded-sm border border-border bg-surface px-3 py-2 text-sm focus:border-accent focus:ring-2 focus:ring-accent/30"
          >
            <option value="newest">Newest</option>
            <option value="price_asc">Price: low to high</option>
            <option value="price_desc">Price: high to low</option>
          </select>
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className="rounded-sm border border-border-strong px-4 py-2 text-sm font-medium text-ink hover:bg-canvas-alt"
          >
            More filters
          </button>
        </div>
      </div>

      {appliedChips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 px-4 py-3 sm:px-6 lg:px-10">
          {appliedChips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={() => clearChip(chip.key)}
              className="flex items-center gap-1.5 rounded-sm bg-accent-subtle px-3 py-1.5 text-xs font-medium text-accent"
            >
              {chip.label}
              <span aria-hidden="true">×</span>
            </button>
          ))}
          <button type="button" onClick={clearAll} className="text-xs text-ink-secondary underline">
            Clear all
          </button>
        </div>
      )}

      {/* Mobile map toggle */}
      <div className="sticky top-16 z-20 flex justify-center py-2 lg:hidden">
        <button
          type="button"
          onClick={() => setMobileView((v) => (v === "list" ? "map" : "list"))}
          className="rounded-full border border-border-strong bg-surface px-5 py-2 text-sm font-medium text-ink shadow-md"
        >
          {mobileView === "list" ? "Map" : "List"}
        </button>
      </div>

      <div className="lg:flex lg:h-[calc(100vh-8.5rem)]">
        <div
          className={`px-4 py-6 sm:px-6 lg:w-[45%] lg:overflow-y-auto lg:px-10 lg:py-8 ${
            mobileView === "map" ? "hidden lg:block" : ""
          }`}
        >
          {items.length === 0 && <PropertyGridEmptyState message={emptyMessage} />}
          <ul className="space-y-8">
            {items.map((property, index) => (
              <li
                key={property.id}
                onMouseEnter={() => setSelectedId(property.id)}
                onFocus={() => setSelectedId(property.id)}
                className={selectedId === property.id ? "rounded-md ring-2 ring-accent" : ""}
              >
                <PropertyCard
                  property={property}
                  priority={index < 2}
                  sizes="(min-width: 1024px) 45vw, 100vw"
                />
              </li>
            ))}
          </ul>

          {moreAvailable && (
            <div className="mt-10 text-center">
              <button
                type="button"
                onClick={loadMore}
                disabled={loadingMore}
                className="rounded-sm border border-border-strong px-6 py-2.5 text-sm font-medium text-ink hover:bg-canvas-alt disabled:opacity-40"
              >
                {loadingMore ? "Loading…" : "Show more"}
              </button>
            </div>
          )}
        </div>

        <div
          className={`lg:w-[55%] ${mobileView === "map" ? "block h-[calc(100vh-10rem)]" : "hidden"} lg:block`}
        >
          <SearchMap properties={items} selectedId={selectedId} onSelect={setSelectedId} />
        </div>
      </div>

      <FilterSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        taxonomy={taxonomy}
        searchParams={searchParams}
        lockedType={lockedType}
        onApply={(params) => {
          router.push(`${pathname}?${withLockedType(params).toString()}`, { scroll: false });
          setSheetOpen(false);
        }}
      />
    </div>
  );
}
