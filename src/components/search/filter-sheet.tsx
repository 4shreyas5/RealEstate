"use client";

import { useEffect, useRef, useState } from "react";

export interface FilterTaxonomy {
  categories: { id: string; name: string }[];
  /** Cities that have published listings (never the whole country list). */
  cities: { id: string; name: string }[];
  amenities: { id: string; name: string }[];
}

/**
 * Grouped, collapsible advanced filters in a native <dialog> — gets focus
 * trapping, Escape-to-close and backdrop semantics for free, keeping this
 * accessible without a extra dependency.
 */
export function FilterSheet({
  open,
  onClose,
  taxonomy,
  searchParams,
  lockedType,
  onApply,
}: {
  open: boolean;
  onClose: () => void;
  taxonomy: FilterTaxonomy;
  searchParams: URLSearchParams;
  /** Set on the dedicated /buy and /rent routes — kept out of the draft's editable fields and re-applied on every count check. */
  lockedType?: "SALE" | "RENT";
  onApply: (params: URLSearchParams) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [draft, setDraft] = useState(() => new URLSearchParams(searchParams.toString()));
  const [liveCount, setLiveCount] = useState<number | null>(null);
  const [loaded, setLoaded] = useState<{ cityId: string; items: { id: string; name: string }[] } | null>(null);

  // Dependent lookup: localities are fetched only for the selected city.
  const draftCity = draft.get("city") ?? "";
  const localities = loaded && loaded.cityId === draftCity ? loaded.items : [];
  const localitiesLoading = !!draftCity && loaded?.cityId !== draftCity;
  useEffect(() => {
    if (!open || !draftCity) return;
    const controller = new AbortController();
    fetch(`/api/locations?level=localities&parent=${encodeURIComponent(draftCity)}`, { signal: controller.signal })
      .then((res) => res.json())
      .then((data) => setLoaded({ cityId: draftCity, items: data.items ?? [] }))
      .catch(() => {});
    return () => controller.abort();
  }, [draftCity, open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      setDraft(new URLSearchParams(searchParams.toString()));
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open, searchParams]);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    const params = new URLSearchParams(draft.toString());
    if (lockedType) params.set("type", lockedType);
    fetch(`/api/search-count?${params.toString()}`, { signal: controller.signal })
      .then((res) => res.json())
      .then((data) => setLiveCount(data.count))
      .catch(() => {});
    return () => controller.abort();
  }, [draft, open, lockedType]);

  function set(key: string, value: string) {
    setDraft((prev) => {
      const next = new URLSearchParams(prev.toString());
      if (value) next.set(key, value);
      else next.delete(key);
      if (key === "city") {
        next.delete("locality");
        next.delete("neighbourhood");
      }
      return next;
    });
  }

  const amenitiesValue = draft.get("amenities")?.split(",").filter(Boolean) ?? [];

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className="w-full max-w-lg rounded-lg border border-border bg-surface p-0 backdrop:bg-ink/40 sm:rounded-lg [&:not([open])]:hidden"
    >
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <h2 className="font-display text-lg font-medium text-ink">Filters</h2>
        <button type="button" onClick={onClose} aria-label="Close filters" className="text-ink-secondary">
          ×
        </button>
      </div>

      <div className="max-h-[60vh] space-y-6 overflow-y-auto px-5 py-5">
        <FilterGroup title="Location">
          <select
            aria-label="City"
            value={draft.get("city") ?? ""}
            onChange={(e) => set("city", e.target.value)}
            className="w-full rounded-sm border border-border px-3 py-2 text-sm focus:border-accent focus:ring-2 focus:ring-accent/30"
          >
            <option value="">Any city</option>
            {taxonomy.cities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {draft.get("city") && (
            <select
              aria-label="Locality"
              value={draft.get("locality") ?? ""}
              onChange={(e) => set("locality", e.target.value)}
              disabled={localitiesLoading}
              className="mt-3 w-full rounded-sm border border-border px-3 py-2 text-sm focus:border-accent focus:ring-2 focus:ring-accent/30 disabled:opacity-60"
            >
              <option value="">{localitiesLoading ? "Loading localities…" : "Any locality"}</option>
              {localities.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          )}
        </FilterGroup>

        <FilterGroup title="Type & category">
          <select
            aria-label="Category"
            value={draft.get("category") ?? ""}
            onChange={(e) => set("category", e.target.value)}
            className="w-full rounded-sm border border-border px-3 py-2 text-sm focus:border-accent focus:ring-2 focus:ring-accent/30"
          >
            <option value="">Any category</option>
            {taxonomy.categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </FilterGroup>

        <FilterGroup title="Price">
          <div className="flex items-center gap-2">
            <label className="sr-only" htmlFor="filter-min-price">
              Minimum price
            </label>
            <input
              id="filter-min-price"
              type="number"
              inputMode="numeric"
              placeholder="Min"
              value={draft.get("minPrice") ?? ""}
              onChange={(e) => set("minPrice", e.target.value)}
              className="w-full rounded-sm border border-border px-3 py-2 text-sm focus:border-accent focus:ring-2 focus:ring-accent/30"
            />
            <span aria-hidden="true" className="text-ink-tertiary">
              –
            </span>
            <label className="sr-only" htmlFor="filter-max-price">
              Maximum price
            </label>
            <input
              id="filter-max-price"
              type="number"
              inputMode="numeric"
              placeholder="Max"
              value={draft.get("maxPrice") ?? ""}
              onChange={(e) => set("maxPrice", e.target.value)}
              className="w-full rounded-sm border border-border px-3 py-2 text-sm focus:border-accent focus:ring-2 focus:ring-accent/30"
            />
          </div>
        </FilterGroup>

        <FilterGroup title="Size & layout">
          <div className="grid grid-cols-2 gap-3">
            <select
              aria-label="Minimum bedrooms"
              value={draft.get("bedrooms") ?? ""}
              onChange={(e) => set("bedrooms", e.target.value)}
              className="rounded-sm border border-border px-3 py-2 text-sm focus:border-accent focus:ring-2 focus:ring-accent/30"
            >
              <option value="">Any beds</option>
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n}+ bd
                </option>
              ))}
            </select>
            <select
              aria-label="Furnishing"
              value={draft.get("furnishing") ?? ""}
              onChange={(e) => set("furnishing", e.target.value)}
              className="rounded-sm border border-border px-3 py-2 text-sm focus:border-accent focus:ring-2 focus:ring-accent/30"
            >
              <option value="">Any furnishing</option>
              <option value="UNFURNISHED">Unfurnished</option>
              <option value="SEMI_FURNISHED">Semi-furnished</option>
              <option value="FULLY_FURNISHED">Fully furnished</option>
            </select>
          </div>
          <select
            aria-label="Construction status"
            value={draft.get("construction") ?? ""}
            onChange={(e) => set("construction", e.target.value)}
            className="mt-3 w-full rounded-sm border border-border px-3 py-2 text-sm focus:border-accent focus:ring-2 focus:ring-accent/30"
          >
            <option value="">Any construction status</option>
            <option value="READY_TO_MOVE">Ready to move</option>
            <option value="UNDER_CONSTRUCTION">Under construction</option>
          </select>
        </FilterGroup>

        <FilterGroup title="Amenities">
          <div className="grid grid-cols-2 gap-2">
            {taxonomy.amenities.map((amenity) => {
              const checked = amenitiesValue.includes(amenity.id);
              return (
                <label key={amenity.id} className="flex items-center gap-2 text-sm text-ink">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => {
                      const next = checked
                        ? amenitiesValue.filter((id) => id !== amenity.id)
                        : [...amenitiesValue, amenity.id];
                      set("amenities", next.join(","));
                    }}
                  />
                  {amenity.name}
                </label>
              );
            })}
          </div>
        </FilterGroup>
      </div>

      <div className="flex items-center justify-between border-t border-border px-5 py-4">
        <button
          type="button"
          onClick={() => setDraft(new URLSearchParams())}
          className="text-sm font-medium text-ink-secondary"
        >
          Clear all
        </button>
        <button
          type="button"
          onClick={() => onApply(draft)}
          className="rounded-sm bg-accent px-5 py-2.5 text-sm font-medium text-canvas hover:bg-accent-hover"
        >
          Show {liveCount ?? "…"} homes
        </button>
      </div>
    </dialog>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <details open className="border-b border-border pb-4 last:border-none">
      <summary className="cursor-pointer text-sm font-medium text-ink">{title}</summary>
      <div className="mt-3">{children}</div>
    </details>
  );
}
