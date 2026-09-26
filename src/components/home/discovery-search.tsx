"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export interface SearchOption {
  id: string;
  name: string;
}

/**
 * Establishes the discovery model (location, buy/rent, category, price,
 * bedrooms) without faking results here — submitting takes the visitor to
 * the dedicated /buy or /rent journey, which is where the real, filterable
 * result set lives, scoped to that transaction type.
 */
export function DiscoverySearch({
  cities,
  categories,
  defaultCityId,
}: {
  cities: SearchOption[];
  categories: SearchOption[];
  defaultCityId?: string;
}) {
  const router = useRouter();
  const [cityId, setCityId] = useState(cities.some((c) => c.id === defaultCityId) ? defaultCityId! : (cities[0]?.id ?? ""));
  const [listingType, setListingType] = useState<"SALE" | "RENT">("SALE");
  const [categoryId, setCategoryId] = useState("");
  const [bedrooms, setBedrooms] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (cityId) params.set("city", cityId);
    if (categoryId) params.set("category", categoryId);
    if (bedrooms) params.set("bedrooms", bedrooms);
    const destination = listingType === "SALE" ? "/buy" : "/rent";
    const query = params.toString();
    router.push(query ? `${destination}?${query}` : destination);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-3 shadow-md sm:flex-row sm:items-center"
    >
      <div className="flex rounded-sm bg-canvas-alt p-1 text-sm">
        {(["SALE", "RENT"] as const).map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => setListingType(type)}
            aria-pressed={listingType === type}
            className={
              listingType === type
                ? "rounded-xs bg-surface px-3 py-1.5 font-medium text-ink shadow-sm"
                : "rounded-xs px-3 py-1.5 text-ink-secondary"
            }
          >
            {type === "SALE" ? "Buy" : "Rent"}
          </button>
        ))}
      </div>

      <label className="sr-only" htmlFor="search-city">
        City
      </label>
      <select
        id="search-city"
        value={cityId}
        onChange={(e) => setCityId(e.target.value)}
        className="flex-1 rounded-sm border border-border px-3 py-2.5 text-sm text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
      >
        {cities.map((city) => (
          <option key={city.id} value={city.id}>
            {city.name}
          </option>
        ))}
      </select>

      <label className="sr-only" htmlFor="search-category">
        Property type
      </label>
      <select
        id="search-category"
        value={categoryId}
        onChange={(e) => setCategoryId(e.target.value)}
        className="flex-1 rounded-sm border border-border px-3 py-2.5 text-sm text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
      >
        <option value="">Any type</option>
        {categories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </select>

      <label className="sr-only" htmlFor="search-bedrooms">
        Bedrooms
      </label>
      <select
        id="search-bedrooms"
        value={bedrooms}
        onChange={(e) => setBedrooms(e.target.value)}
        className="rounded-sm border border-border px-3 py-2.5 text-sm text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
      >
        <option value="">Any beds</option>
        {[1, 2, 3, 4, 5].map((n) => (
          <option key={n} value={n}>
            {n}+ bd
          </option>
        ))}
      </select>

      <button
        type="submit"
        className="rounded-sm bg-accent px-6 py-2.5 text-sm font-medium text-canvas hover:bg-accent-hover"
      >
        Search
      </button>
    </form>
  );
}
