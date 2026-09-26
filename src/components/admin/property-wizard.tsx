"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { savePropertyDraft, publishProperty } from "@/app/admin/(dashboard)/properties/actions";
import { slugify, type PropertyFormValues } from "@/lib/validations/property";
import {
  getCitiesForState,
  getLocalitiesForCity,
  getNeighbourhoodsForLocality,
  type LocationOption,
} from "@/app/admin/(dashboard)/properties/location-actions";
import { ImageManager, type PropertyImageRow } from "./image-manager";

const STEPS = [
  "Basic Info",
  "Location",
  "Pricing",
  "Specifications",
  "Amenities",
  "Images",
  "Description",
  "SEO",
  "Preview",
] as const;

export interface WizardTaxonomy {
  categories: { id: string; name: string }[];
  states: { id: string; name: string; countryCode: string }[];
  amenities: { id: string; name: string }[];
}

export interface WizardLocationChain {
  stateId: string;
  cities: LocationOption[];
  localities: LocationOption[];
  neighbourhoods: LocationOption[];
}

const input =
  "mt-1 w-full rounded-sm border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/30";
const label = "text-xs font-medium text-ink";

export function PropertyWizard({
  propertyId: initialPropertyId,
  initialValues,
  images,
  taxonomy,
  initialLocation,
}: {
  propertyId: string | null;
  initialValues: Partial<PropertyFormValues>;
  images: PropertyImageRow[];
  taxonomy: WizardTaxonomy;
  initialLocation?: WizardLocationChain;
}) {
  const router = useRouter();
  const [propertyId, setPropertyId] = useState(initialPropertyId);
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<Partial<PropertyFormValues>>(initialValues);
  const [isPending, startTransition] = useTransition();
  const [publishErrors, setPublishErrors] = useState<string[]>([]);
  const [draftErrors, setDraftErrors] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);

  function set<K extends keyof PropertyFormValues>(key: K, value: PropertyFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  function saveAndGo(nextStep: number) {
    // A brand-new property can't be persisted yet without category/city/
    // locality (required relations) — Basic Info (step 0) only collects
    // category, and city/locality live on the very next step. Rather than
    // surface a "fill Location first" error on every first save, just
    // advance locally until enough is known to actually create the row;
    // nothing is lost since `values` stays in React state.
    if (!propertyId && !(values.categoryId && values.cityId && values.localityId)) {
      setDraftErrors([]);
      setStep(nextStep);
      return;
    }

    startTransition(async () => {
      const withSlug = {
        ...values,
        slug: values.slug || (values.title ? slugify(values.title) : undefined),
      };
      const result = await savePropertyDraft(propertyId, withSlug);
      if (!result.ok) {
        setDraftErrors(result.errors);
        return;
      }
      setDraftErrors([]);
      setPropertyId(result.id);
      setSaved(true);
      setStep(nextStep);
      if (!propertyId) {
        router.replace(`/admin/properties/${result.id}`);
      }
    });
  }

  function handlePublish() {
    if (!propertyId) return;
    startTransition(async () => {
      const result = await publishProperty(propertyId);
      if (!result.ok) {
        setPublishErrors(result.errors);
      } else {
        setPublishErrors([]);
        router.push("/admin/properties");
      }
    });
  }

  // Dependent location dropdowns: State → City → Locality → Neighbourhood.
  // Each list is fetched only when its parent is chosen.
  const [stateId, setStateId] = useState(initialLocation?.stateId ?? "");
  const [cities, setCities] = useState<LocationOption[]>(initialLocation?.cities ?? []);
  const [localities, setLocalities] = useState<LocationOption[]>(initialLocation?.localities ?? []);
  const [neighbourhoods, setNeighbourhoods] = useState<LocationOption[]>(initialLocation?.neighbourhoods ?? []);
  const [loadingLevel, setLoadingLevel] = useState<"city" | "locality" | "neighbourhood" | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const requestId = useRef(0);

  async function loadLevel<T>(level: "city" | "locality" | "neighbourhood", load: () => Promise<T>, apply: (result: T) => void) {
    const id = ++requestId.current;
    setLoadingLevel(level);
    setLocationError(null);
    try {
      const result = await load();
      if (id === requestId.current) apply(result);
    } catch {
      if (id === requestId.current) setLocationError("Couldn't load locations. Check your connection and try again.");
    } finally {
      if (id === requestId.current) setLoadingLevel(null);
    }
  }

  function chooseState(next: string) {
    setStateId(next);
    setValues((prev) => ({ ...prev, cityId: undefined, localityId: undefined, neighbourhoodId: undefined }));
    setCities([]);
    setLocalities([]);
    setNeighbourhoods([]);
    setSaved(false);
    if (next) void loadLevel("city", () => getCitiesForState(next), setCities);
  }

  function chooseCity(next: string) {
    setValues((prev) => ({ ...prev, cityId: next || undefined, localityId: undefined, neighbourhoodId: undefined }));
    setLocalities([]);
    setNeighbourhoods([]);
    setSaved(false);
    if (next) void loadLevel("locality", () => getLocalitiesForCity(next), setLocalities);
  }

  function chooseLocality(next: string) {
    setValues((prev) => ({ ...prev, localityId: next || undefined, neighbourhoodId: undefined }));
    setNeighbourhoods([]);
    setSaved(false);
    if (next) void loadLevel("neighbourhood", () => getNeighbourhoodsForLocality(next), setNeighbourhoods);
  }

  return (
    <div className="flex gap-8">
      <ol className="hidden w-44 shrink-0 space-y-1 text-sm lg:block">
        {STEPS.map((label, index) => (
          <li key={label}>
            <button
              type="button"
              onClick={() => setStep(index)}
              className={
                index === step
                  ? "w-full rounded-sm bg-accent-subtle px-2 py-1.5 text-left font-medium text-accent"
                  : "w-full rounded-sm px-2 py-1.5 text-left text-ink-secondary hover:bg-canvas-alt"
              }
            >
              {index + 1}. {label}
            </button>
          </li>
        ))}
      </ol>

      <div className="max-w-xl flex-1">
        {step === 0 && (
          <section className="space-y-4">
            <div>
              <label className={label}>Title</label>
              <input
                className={input}
                value={values.title ?? ""}
                onChange={(e) => set("title", e.target.value)}
                placeholder="3 BHK Apartment"
              />
            </div>
            <div>
              <label className={label}>Listing type</label>
              <select
                className={input}
                value={values.listingType ?? "SALE"}
                onChange={(e) => set("listingType", e.target.value as PropertyFormValues["listingType"])}
              >
                <option value="SALE">Sale</option>
                <option value="RENT">Rent</option>
              </select>
            </div>
            <div>
              <label className={label}>Category</label>
              <select
                className={input}
                value={values.categoryId ?? ""}
                onChange={(e) => set("categoryId", e.target.value)}
              >
                <option value="">Select a category</option>
                {taxonomy.categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </section>
        )}

        {step === 1 && (
          <section className="space-y-4">
            <div>
              <label className={label} htmlFor="wizard-state">State / Union Territory</label>
              <select
                id="wizard-state"
                className={input}
                value={stateId}
                onChange={(e) => chooseState(e.target.value)}
              >
                <option value="">Select a state or UT</option>
                {taxonomy.states.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={label} htmlFor="wizard-city">City</label>
              <select
                id="wizard-city"
                className={input}
                value={values.cityId ?? ""}
                disabled={!stateId || loadingLevel === "city"}
                onChange={(e) => chooseCity(e.target.value)}
              >
                <option value="">
                  {!stateId ? "Select a state first" : loadingLevel === "city" ? "Loading cities…" : "Select a city"}
                </option>
                {cities.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {stateId && loadingLevel !== "city" && cities.length === 0 && (
                <p className="mt-1 text-xs text-ink-secondary">No cities for this state yet — add one under Locations.</p>
              )}
            </div>
            <div>
              <label className={label} htmlFor="wizard-locality">Locality</label>
              <select
                id="wizard-locality"
                className={input}
                value={values.localityId ?? ""}
                disabled={!values.cityId || loadingLevel === "locality"}
                onChange={(e) => chooseLocality(e.target.value)}
              >
                <option value="">
                  {!values.cityId ? "Select a city first" : loadingLevel === "locality" ? "Loading localities…" : "Select a locality"}
                </option>
                {localities.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
              {values.cityId && loadingLevel !== "locality" && localities.length === 0 && (
                <p className="mt-1 text-xs text-ink-secondary">No localities for this city yet — add one under Locations.</p>
              )}
            </div>
            <div>
              <label className={label} htmlFor="wizard-neighbourhood">Neighbourhood (optional)</label>
              <select
                id="wizard-neighbourhood"
                className={input}
                value={values.neighbourhoodId ?? ""}
                disabled={!values.localityId || loadingLevel === "neighbourhood"}
                onChange={(e) => set("neighbourhoodId", e.target.value)}
              >
                <option value="">None</option>
                {neighbourhoods.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.name}
                  </option>
                ))}
              </select>
            </div>
            {locationError && (
              <p role="alert" className="rounded-sm border border-error/30 bg-error/5 p-3 text-sm text-error">
                {locationError}
              </p>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={label}>Latitude</label>
                <input
                  className={input}
                  type="number"
                  step="any"
                  value={values.latitude ?? ""}
                  onChange={(e) => set("latitude", Number(e.target.value))}
                />
              </div>
              <div>
                <label className={label}>Longitude</label>
                <input
                  className={input}
                  type="number"
                  step="any"
                  value={values.longitude ?? ""}
                  onChange={(e) => set("longitude", Number(e.target.value))}
                />
              </div>
            </div>
          </section>
        )}

        {step === 2 && (
          <section className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={label}>Price amount</label>
                <input
                  className={input}
                  type="number"
                  value={values.priceAmount ?? ""}
                  onChange={(e) => set("priceAmount", Number(e.target.value))}
                />
              </div>
              <div>
                <label className={label}>Currency (ISO 4217)</label>
                <input
                  className={input}
                  value={values.priceCurrency ?? "INR"}
                  onChange={(e) => set("priceCurrency", e.target.value.toUpperCase())}
                  maxLength={3}
                />
              </div>
            </div>
            {values.listingType === "RENT" && (
              <div>
                <label className={label}>Rent period</label>
                <select
                  className={input}
                  value={values.rentPeriod ?? "MONTHLY"}
                  onChange={(e) => set("rentPeriod", e.target.value as PropertyFormValues["rentPeriod"])}
                >
                  <option value="MONTHLY">Monthly</option>
                  <option value="YEARLY">Yearly</option>
                </select>
              </div>
            )}
          </section>
        )}

        {step === 3 && (
          <section className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={label}>Area value</label>
                <input
                  className={input}
                  type="number"
                  value={values.areaValue ?? ""}
                  onChange={(e) => set("areaValue", Number(e.target.value))}
                />
              </div>
              <div>
                <label className={label}>Area unit</label>
                <select
                  className={input}
                  value={values.areaUnit ?? "SQFT"}
                  onChange={(e) => set("areaUnit", e.target.value as PropertyFormValues["areaUnit"])}
                >
                  {["SQFT", "SQM", "ACRE", "HECTARE", "MARLA", "KANAL"].map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={label}>Bedrooms</label>
                <input
                  className={input}
                  type="number"
                  value={values.bedrooms ?? ""}
                  onChange={(e) => set("bedrooms", Number(e.target.value))}
                />
              </div>
              <div>
                <label className={label}>Bathrooms</label>
                <input
                  className={input}
                  type="number"
                  value={values.bathrooms ?? ""}
                  onChange={(e) => set("bathrooms", Number(e.target.value))}
                />
              </div>
              <div>
                <label className={label}>Floor</label>
                <input
                  className={input}
                  type="number"
                  value={values.floor ?? ""}
                  onChange={(e) => set("floor", Number(e.target.value))}
                />
              </div>
              <div>
                <label className={label}>Total floors</label>
                <input
                  className={input}
                  type="number"
                  value={values.totalFloors ?? ""}
                  onChange={(e) => set("totalFloors", Number(e.target.value))}
                />
              </div>
              <div>
                <label className={label}>Facing</label>
                <select
                  className={input}
                  value={values.facing ?? ""}
                  onChange={(e) => set("facing", e.target.value as PropertyFormValues["facing"])}
                >
                  <option value="">Not specified</option>
                  {["NORTH", "SOUTH", "EAST", "WEST", "NORTH_EAST", "NORTH_WEST", "SOUTH_EAST", "SOUTH_WEST"].map(
                    (f) => (
                      <option key={f} value={f}>
                        {f.replace("_", " ")}
                      </option>
                    ),
                  )}
                </select>
              </div>
              <div>
                <label className={label}>Furnishing</label>
                <select
                  className={input}
                  value={values.furnishing ?? ""}
                  onChange={(e) => set("furnishing", e.target.value as PropertyFormValues["furnishing"])}
                >
                  <option value="">Not specified</option>
                  <option value="UNFURNISHED">Unfurnished</option>
                  <option value="SEMI_FURNISHED">Semi-furnished</option>
                  <option value="FULLY_FURNISHED">Fully furnished</option>
                </select>
              </div>
              <div>
                <label className={label}>Property age (years)</label>
                <input
                  className={input}
                  type="number"
                  value={values.propertyAgeYears ?? ""}
                  onChange={(e) => set("propertyAgeYears", Number(e.target.value))}
                />
              </div>
              <div>
                <label className={label}>Construction status</label>
                <select
                  className={input}
                  value={values.constructionStatus ?? ""}
                  onChange={(e) =>
                    set("constructionStatus", e.target.value as PropertyFormValues["constructionStatus"])
                  }
                >
                  <option value="">Not specified</option>
                  <option value="UNDER_CONSTRUCTION">Under construction</option>
                  <option value="READY_TO_MOVE">Ready to move</option>
                </select>
              </div>
              <div>
                <label className={label}>Possession date</label>
                <input
                  className={input}
                  type="date"
                  value={values.possessionDate ?? ""}
                  onChange={(e) => set("possessionDate", e.target.value)}
                />
              </div>
              <div>
                <label className={label}>Parking spaces</label>
                <input
                  className={input}
                  type="number"
                  value={values.parkingSpaces ?? ""}
                  onChange={(e) => set("parkingSpaces", Number(e.target.value))}
                />
              </div>
            </div>
          </section>
        )}

        {step === 4 && (
          <section>
            <div className="grid grid-cols-2 gap-2">
              {taxonomy.amenities.map((amenity) => {
                const checked = (values.amenityIds ?? []).includes(amenity.id);
                return (
                  <label key={amenity.id} className="flex items-center gap-2 text-sm text-ink">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        const current = values.amenityIds ?? [];
                        set(
                          "amenityIds",
                          e.target.checked
                            ? [...current, amenity.id]
                            : current.filter((id) => id !== amenity.id),
                        );
                      }}
                    />
                    {amenity.name}
                  </label>
                );
              })}
            </div>
          </section>
        )}

        {step === 5 && (
          <section>
            {propertyId ? (
              <ImageManager propertyId={propertyId} images={images} />
            ) : (
              <p className="text-sm text-ink-secondary">
                Save the basic info first — images attach to a saved draft.
              </p>
            )}
          </section>
        )}

        {step === 6 && (
          <section>
            <label className={label}>Description</label>
            <textarea
              className={`${input} min-h-48`}
              value={values.description ?? ""}
              onChange={(e) => set("description", e.target.value)}
            />
          </section>
        )}

        {step === 7 && (
          <section className="space-y-4">
            <div>
              <label className={label}>URL slug</label>
              <input
                className={input}
                value={values.slug ?? (values.title ? slugify(values.title) : "")}
                onChange={(e) => set("slug", slugify(e.target.value))}
              />
            </div>
            <div>
              <label className={label}>Meta title</label>
              <input
                className={input}
                value={values.metaTitle ?? ""}
                onChange={(e) => set("metaTitle", e.target.value)}
              />
            </div>
            <div>
              <label className={label}>Meta description</label>
              <textarea
                className={input}
                value={values.metaDescription ?? ""}
                onChange={(e) => set("metaDescription", e.target.value)}
              />
            </div>
          </section>
        )}

        {step === 8 && (
          <section className="space-y-4">
            <div className="rounded-md border border-border bg-surface p-4">
              <p className="font-display text-lg font-medium text-ink">
                {values.title || "Untitled property"}
              </p>
              <p className="mt-1 tabular-nums text-ink">
                {values.priceCurrency} {values.priceAmount?.toLocaleString?.() ?? values.priceAmount}
              </p>
              <p className="mt-1 text-sm text-ink-secondary">
                {values.bedrooms ?? "–"} bd · {values.bathrooms ?? "–"} ba · {values.areaValue ?? "–"}{" "}
                {values.areaUnit}
              </p>
              <p className="mt-3 whitespace-pre-wrap text-sm text-ink-secondary">
                {values.description}
              </p>
            </div>

            {publishErrors.length > 0 && (
              <ul className="rounded-sm border border-error/30 bg-error/5 p-3 text-sm text-error">
                {publishErrors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            )}

            <button
              type="button"
              disabled={isPending || !propertyId}
              onClick={handlePublish}
              className="rounded-sm bg-accent px-6 py-3 text-sm font-medium text-canvas hover:bg-accent-hover disabled:opacity-40"
            >
              Publish
            </button>
          </section>
        )}

        {draftErrors.length > 0 && (
          <ul className="mt-6 rounded-sm border border-error/30 bg-error/5 p-3 text-sm text-error">
            {draftErrors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        )}

        <div className="mt-8 flex items-center gap-3">
          {step > 0 && (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              className="rounded-sm border border-border-strong px-4 py-2 text-sm font-medium text-ink hover:bg-canvas-alt"
            >
              Back
            </button>
          )}
          {step < STEPS.length - 1 && (
            <button
              type="button"
              disabled={isPending}
              onClick={() => saveAndGo(step + 1)}
              className="rounded-sm bg-accent px-4 py-2 text-sm font-medium text-canvas hover:bg-accent-hover disabled:opacity-40"
            >
              {isPending ? "Saving…" : "Save & continue"}
            </button>
          )}
          {saved && <span className="text-xs text-ink-tertiary">Draft saved</span>}
        </div>
      </div>
    </div>
  );
}
