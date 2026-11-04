"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { savePropertyDraft, publishProperty } from "@/app/admin/(dashboard)/properties/actions";
import {
  addPropertyImage,
  setCoverImage,
  updateImageAltText,
  updateImageRoomLabel,
} from "@/app/admin/(dashboard)/properties/image-actions";
import { createClient } from "@/lib/supabase/client";
import { PROPERTY_IMAGE_BUCKET, buildPropertyImagePath } from "@/lib/storage";
import { propertyInputSchema, slugify, specProfileForCategory, type PropertyFormValues } from "@/lib/validations/property";
import {
  getCitiesForState,
  getLocalitiesForCity,
  getNeighbourhoodsForLocality,
  type LocationOption,
} from "@/app/admin/(dashboard)/properties/location-actions";
import { ImageManager, type PropertyImageRow } from "./image-manager";
import { StagedImagePicker, type StagedImage } from "./staged-image-picker";

export interface FormTaxonomy {
  categories: { id: string; name: string }[];
  states: { id: string; name: string; countryCode: string }[];
  amenities: { id: string; name: string }[];
}

export interface FormLocationChain {
  stateId: string;
  cities: LocationOption[];
  localities: LocationOption[];
  neighbourhoods: LocationOption[];
}

const input =
  "mt-1 w-full rounded-sm border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/30";
const label = "text-xs font-medium text-ink";
const optionalHint = <span className="ml-1 text-ink-tertiary">(optional)</span>;
const errorText = "mt-1 text-xs text-error";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className={errorText}>
      {message}
    </p>
  );
}

type Values = Partial<PropertyFormValues> & { localityName?: string };

export function PropertyForm({
  propertyId: initialPropertyId,
  initialValues,
  images,
  taxonomy,
  initialLocation,
}: {
  propertyId: string | null;
  initialValues: Values;
  images: PropertyImageRow[];
  taxonomy: FormTaxonomy;
  initialLocation?: FormLocationChain;
}) {
  const router = useRouter();
  const [propertyId, setPropertyId] = useState(initialPropertyId);
  // The form pre-selects "Buy"/"sq ft" in the UI (via the `??` fallbacks on
  // each <select>'s `value`) before the admin ever touches those fields —
  // so the real state has to start with the same values, or what's visibly
  // selected and what actually gets submitted silently diverge. This is
  // exactly what caused submission to fail with "Invalid option: expected
  // one of "SALE"|"RENT"" for every Buy/Rent choice the admin never
  // explicitly re-clicked: listingType stayed `undefined` in state while
  // the <select> displayed "Buy (for sale)".
  const [values, setValues] = useState<Values>({ listingType: "SALE", areaUnit: "SQFT", ...initialValues });
  const [isPending, startTransition] = useTransition();
  const [publishErrors, setPublishErrors] = useState<string[]>([]);
  const [saveErrors, setSaveErrors] = useState<string[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);

  // Photos picked before the property exists (no id yet for the Storage
  // path) — uploaded only once `savePropertyDraft` returns an id. `imageRows`
  // mirrors what ImageManager shows and grows as each staged upload succeeds,
  // so the Photos section updates live without a server round trip.
  const [stagedImages, setStagedImages] = useState<StagedImage[]>([]);
  const [imageRows, setImageRows] = useState<PropertyImageRow[]>(images);
  const [uploadStatus, setUploadStatus] = useState<Record<string, { stage: "uploading" | "done" | "failed"; error?: string }>>({});

  function set<K extends keyof Values>(key: K, value: Values[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
    if (fieldErrors[key as string]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[key as string];
        return next;
      });
    }
  }

  /** Uploads one staged photo to the existing Storage bucket via the existing
   * upload mechanism, creates its PropertyImage record, then applies the
   * alt text/room label/cover choice the admin made while it was staged.
   * Safe to call again for just this one file if it previously failed —
   * nothing about it depends on any other staged photo's outcome. */
  async function uploadStagedImage(targetPropertyId: string, staged: StagedImage) {
    setUploadStatus((prev) => ({ ...prev, [staged.key]: { stage: "uploading" } }));
    try {
      const supabase = createClient();
      const path = buildPropertyImagePath(targetPropertyId, staged.file);
      const { error: uploadError } = await supabase.storage
        .from(PROPERTY_IMAGE_BUCKET)
        .upload(path, staged.file, { contentType: staged.file.type, cacheControl: "31536000" });
      if (uploadError) throw new Error(uploadError.message);

      const {
        data: { publicUrl },
      } = supabase.storage.from(PROPERTY_IMAGE_BUCKET).getPublicUrl(path);

      const image = await addPropertyImage(targetPropertyId, publicUrl);
      if (staged.altText) await updateImageAltText(targetPropertyId, image.id, staged.altText);
      if (staged.roomLabel) await updateImageRoomLabel(targetPropertyId, image.id, staged.roomLabel);
      if (staged.isCover) await setCoverImage(targetPropertyId, image.id);

      setImageRows((prev) => [
        ...prev,
        { ...image, altText: staged.altText, roomLabel: staged.roomLabel || null, isCover: staged.isCover },
      ]);
      setUploadStatus((prev) => ({ ...prev, [staged.key]: { stage: "done" } }));
      return true;
    } catch (error) {
      setUploadStatus((prev) => ({
        ...prev,
        [staged.key]: { stage: "failed", error: error instanceof Error ? error.message : "Upload failed." },
      }));
      return false;
    }
  }

  /** Uploaded one at a time (not in parallel) so Storage paths/positions stay
   * in the order the admin staged them. Property creation has already
   * succeeded by the time this runs, so a failure here never loses the
   * property — only that one photo stays retryable. */
  async function uploadAllStaged(targetPropertyId: string, staged: StagedImage[]) {
    let allOk = true;
    for (const image of staged) {
      const ok = await uploadStagedImage(targetPropertyId, image);
      allOk = allOk && ok;
    }
    return allOk;
  }

  function retryStagedUpload(key: string) {
    if (!propertyId) return;
    const staged = stagedImages.find((i) => i.key === key);
    if (staged) void uploadStagedImage(propertyId, staged);
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (isPending) return; // guards against a double-click submitting twice

    const parsed = propertyInputSchema.safeParse(values);
    if (!parsed.success) {
      const nextFieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "");
        if (key && !nextFieldErrors[key]) nextFieldErrors[key] = issue.message;
      }
      setFieldErrors(nextFieldErrors);
      setSaveErrors(["Fix the highlighted fields before saving."]);
      return; // nothing is sent to the server until the form itself is valid
    }
    setFieldErrors({});

    startTransition(async () => {
      const result = await savePropertyDraft(propertyId, values);
      if (!result.ok) {
        setSaveErrors(result.errors);
        return;
      }
      setSaveErrors([]);
      setSaved(true);

      const isFirstSave = !propertyId;
      const effectiveId = propertyId ?? result.id;
      if (isFirstSave) setPropertyId(result.id);

      let uploadsOk = true;
      if (isFirstSave && stagedImages.length > 0) {
        uploadsOk = await uploadAllStaged(effectiveId, stagedImages);
      }

      if (isFirstSave) {
        // Only move on to the canonical edit URL once there's nothing left
        // to retry here — a failed upload keeps the admin on this exact
        // page, with the already-created property and a Retry control,
        // instead of navigating away from the one place that can retry it.
        if (uploadsOk) router.replace(`/admin/properties/${effectiveId}`);
      } else {
        router.refresh();
      }
    });
  }

  function handlePublish() {
    if (!propertyId || isPending) return;
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
    setValues((prev) => ({ ...prev, cityId: undefined, localityId: undefined, localityName: undefined, neighbourhoodId: undefined }));
    setCities([]);
    setLocalities([]);
    setNeighbourhoods([]);
    setSaved(false);
    if (next) void loadLevel("city", () => getCitiesForState(next), setCities);
  }

  function chooseCity(next: string) {
    setValues((prev) => ({ ...prev, cityId: next || undefined, localityId: undefined, localityName: undefined, neighbourhoodId: undefined }));
    setLocalities([]);
    setNeighbourhoods([]);
    setSaved(false);
    if (next && fieldErrors.cityId) setFieldErrors((prev) => ({ ...prev, cityId: "" }));
    if (next) void loadLevel("locality", () => getLocalitiesForCity(next), setLocalities);
  }

  function chooseLocality(next: string) {
    setValues((prev) => ({ ...prev, localityId: next || undefined, localityName: undefined, neighbourhoodId: undefined }));
    setNeighbourhoods([]);
    setSaved(false);
    if (next) void loadLevel("neighbourhood", () => getNeighbourhoodsForLocality(next), setNeighbourhoods);
  }

  const selectedCategoryName = taxonomy.categories.find((c) => c.id === values.categoryId)?.name;
  const specProfile = specProfileForCategory(selectedCategoryName);

  return (
    <form onSubmit={handleSave} className="max-w-2xl space-y-10">
      {saveErrors.length > 0 && (
        <ul role="alert" className="rounded-sm border border-error/30 bg-error/5 p-3 text-sm text-error">
          {saveErrors.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      )}

      {/* Section A: Basic information */}
      <section className="space-y-4">
        <h2 className="font-display text-lg font-medium text-ink">Basic information</h2>
        <div>
          <label className={label}>Title</label>
          <input
            className={input}
            value={values.title ?? ""}
            onChange={(e) => set("title", e.target.value)}
            placeholder="3 BHK Apartment"
          />
          <FieldError message={fieldErrors.title} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label}>Listing purpose</label>
            <select
              className={input}
              value={values.listingType ?? "SALE"}
              onChange={(e) => set("listingType", e.target.value as PropertyFormValues["listingType"])}
            >
              <option value="SALE">Buy (for sale)</option>
              <option value="RENT">Rent</option>
            </select>
          </div>
          <div>
            <label className={label}>Property type</label>
            <select
              className={input}
              value={values.categoryId ?? ""}
              aria-invalid={Boolean(fieldErrors.categoryId)}
              onChange={(e) => set("categoryId", e.target.value)}
            >
              <option value="">Select a type</option>
              {taxonomy.categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {taxonomy.categories.length === 0 && (
              <p className="mt-1 text-xs text-error">
                No property types are set up yet — add one under Categories before creating a property.
              </p>
            )}
            <FieldError message={fieldErrors.categoryId} />
          </div>
        </div>
        <div>
          <label className={label} htmlFor="wizard-description">Description</label>
          <textarea
            id="wizard-description"
            className={`${input} min-h-32`}
            value={values.description ?? ""}
            onChange={(e) => set("description", e.target.value)}
          />
          <FieldError message={fieldErrors.description} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label} htmlFor="wizard-price">Price</label>
            <input
              id="wizard-price"
              className={input}
              type="number"
              value={values.priceAmount ?? ""}
              onChange={(e) => set("priceAmount", e.target.value === "" ? undefined : Number(e.target.value))}
            />
            <FieldError message={fieldErrors.priceAmount} />
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
        </div>
      </section>

      {/* Section B: Location */}
      <section className="space-y-4">
        <h2 className="font-display text-lg font-medium text-ink">Location</h2>
        <p className="text-xs text-ink-tertiary">Country: India</p>
        <div>
          <label className={label} htmlFor="wizard-state">State / Union Territory</label>
          <select id="wizard-state" className={input} value={stateId} onChange={(e) => chooseState(e.target.value)}>
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
          <FieldError message={fieldErrors.cityId} />
        </div>
        <div>
          <label className={label} htmlFor="wizard-locality">Locality {optionalHint}</label>
          <select
            id="wizard-locality"
            className={input}
            value={values.localityId ?? ""}
            disabled={!values.cityId || loadingLevel === "locality"}
            onChange={(e) => chooseLocality(e.target.value)}
          >
            <option value="">
              {!values.cityId ? "Select a city first" : loadingLevel === "locality" ? "Loading localities…" : "No locality"}
            </option>
            {localities.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
          <label className="mt-2 block text-xs text-ink-secondary" htmlFor="wizard-locality-new">
            Not listed? Type a new locality name instead
          </label>
          <input
            id="wizard-locality-new"
            className={input}
            disabled={!values.cityId}
            value={values.localityName ?? ""}
            onChange={(e) => {
              const name = e.target.value;
              setValues((prev) => ({ ...prev, localityName: name || undefined, localityId: name ? undefined : prev.localityId }));
              setSaved(false);
            }}
            placeholder="e.g. Sector 62"
          />
        </div>
        <div>
          <label className={label} htmlFor="wizard-neighbourhood">Neighbourhood {optionalHint}</label>
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
        <div>
          <label className={label}>Full address {optionalHint}</label>
          <input
            className={input}
            value={values.address ?? ""}
            onChange={(e) => set("address", e.target.value)}
            placeholder="Flat/House no., street, landmark"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label}>Latitude {optionalHint}</label>
            <input
              className={input}
              type="number"
              step="any"
              value={values.latitude ?? ""}
              onChange={(e) => set("latitude", e.target.value === "" ? undefined : Number(e.target.value))}
            />
          </div>
          <div>
            <label className={label}>Longitude {optionalHint}</label>
            <input
              className={input}
              type="number"
              step="any"
              value={values.longitude ?? ""}
              onChange={(e) => set("longitude", e.target.value === "" ? undefined : Number(e.target.value))}
            />
          </div>
        </div>
      </section>

      {/* Section C: Specifications — adapts to the selected property type */}
      <section className="space-y-4">
        <h2 className="font-display text-lg font-medium text-ink">Specifications</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label} htmlFor="wizard-area-value">{specProfile === "land" ? "Plot / land area" : "Area"}</label>
            <input
              id="wizard-area-value"
              className={input}
              type="number"
              value={values.areaValue ?? ""}
              onChange={(e) => set("areaValue", e.target.value === "" ? undefined : Number(e.target.value))}
            />
            <FieldError message={fieldErrors.areaValue} />
          </div>
          <div>
            <label className={label}>Area unit</label>
            <select className={input} value={values.areaUnit ?? "SQFT"} onChange={(e) => set("areaUnit", e.target.value as PropertyFormValues["areaUnit"])}>
              {["SQFT", "SQM", "ACRE", "HECTARE", "MARLA", "KANAL"].map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>
        </div>

        {specProfile === "residential" && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>Bedrooms {optionalHint}</label>
              <input className={input} type="number" value={values.bedrooms ?? ""} onChange={(e) => set("bedrooms", e.target.value === "" ? undefined : Number(e.target.value))} />
            </div>
            <div>
              <label className={label}>Bathrooms {optionalHint}</label>
              <input className={input} type="number" value={values.bathrooms ?? ""} onChange={(e) => set("bathrooms", e.target.value === "" ? undefined : Number(e.target.value))} />
            </div>
            <div>
              <label className={label}>Floor {optionalHint}</label>
              <input className={input} type="number" value={values.floor ?? ""} onChange={(e) => set("floor", e.target.value === "" ? undefined : Number(e.target.value))} />
            </div>
            <div>
              <label className={label}>Total floors {optionalHint}</label>
              <input className={input} type="number" value={values.totalFloors ?? ""} onChange={(e) => set("totalFloors", e.target.value === "" ? undefined : Number(e.target.value))} />
            </div>
            <div>
              <label className={label}>Furnishing {optionalHint}</label>
              <select className={input} value={values.furnishing ?? ""} onChange={(e) => set("furnishing", e.target.value as PropertyFormValues["furnishing"])}>
                <option value="">Not specified</option>
                <option value="UNFURNISHED">Unfurnished</option>
                <option value="SEMI_FURNISHED">Semi-furnished</option>
                <option value="FULLY_FURNISHED">Fully furnished</option>
              </select>
            </div>
            <div>
              <label className={label}>Parking spaces {optionalHint}</label>
              <input className={input} type="number" value={values.parkingSpaces ?? ""} onChange={(e) => set("parkingSpaces", e.target.value === "" ? undefined : Number(e.target.value))} />
            </div>
            <div>
              <label className={label}>Construction status {optionalHint}</label>
              <select className={input} value={values.constructionStatus ?? ""} onChange={(e) => set("constructionStatus", e.target.value as PropertyFormValues["constructionStatus"])}>
                <option value="">Not specified</option>
                <option value="UNDER_CONSTRUCTION">Under construction</option>
                <option value="READY_TO_MOVE">Ready to move</option>
              </select>
            </div>
            <div>
              <label className={label}>Property age (years) {optionalHint}</label>
              <input className={input} type="number" value={values.propertyAgeYears ?? ""} onChange={(e) => set("propertyAgeYears", e.target.value === "" ? undefined : Number(e.target.value))} />
            </div>
          </div>
        )}

        {specProfile === "commercial" && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>Bathrooms {optionalHint}</label>
              <input className={input} type="number" value={values.bathrooms ?? ""} onChange={(e) => set("bathrooms", e.target.value === "" ? undefined : Number(e.target.value))} />
            </div>
            <div>
              <label className={label}>Parking spaces {optionalHint}</label>
              <input className={input} type="number" value={values.parkingSpaces ?? ""} onChange={(e) => set("parkingSpaces", e.target.value === "" ? undefined : Number(e.target.value))} />
            </div>
            <div>
              <label className={label}>Furnishing {optionalHint}</label>
              <select className={input} value={values.furnishing ?? ""} onChange={(e) => set("furnishing", e.target.value as PropertyFormValues["furnishing"])}>
                <option value="">Not specified</option>
                <option value="UNFURNISHED">Unfurnished</option>
                <option value="SEMI_FURNISHED">Semi-furnished</option>
                <option value="FULLY_FURNISHED">Fully furnished</option>
              </select>
            </div>
          </div>
        )}

        {specProfile === "land" && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>Facing {optionalHint}</label>
              <select className={input} value={values.facing ?? ""} onChange={(e) => set("facing", e.target.value as PropertyFormValues["facing"])}>
                <option value="">Not specified</option>
                {["NORTH", "SOUTH", "EAST", "WEST", "NORTH_EAST", "NORTH_WEST", "SOUTH_EAST", "SOUTH_WEST"].map((f) => (
                  <option key={f} value={f}>
                    {f.replace("_", " ")}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </section>

      {/* Section D: Amenities */}
      <section className="space-y-3">
        <h2 className="font-display text-lg font-medium text-ink">
          Amenities {optionalHint}
        </h2>
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
                    set("amenityIds", e.target.checked ? [...current, amenity.id] : current.filter((id) => id !== amenity.id));
                  }}
                />
                {amenity.name}
              </label>
            );
          })}
        </div>
      </section>

      {/* Section E: Images */}
      <section className="space-y-3">
        <h2 className="font-display text-lg font-medium text-ink">Photos {optionalHint}</h2>
        <p className="text-sm text-ink-secondary">
          Photos are optional. You can publish a property without photographs and add them later. If you do add
          photos, pick a cover image and give each one alt text before publishing (see Publish, below).
        </p>

        {propertyId ? (
          <ImageManager propertyId={propertyId} images={imageRows} />
        ) : (
          <StagedImagePicker images={stagedImages} onChange={setStagedImages} />
        )}

        {Object.entries(uploadStatus).some(([, s]) => s.stage === "failed") && (
          <div className="rounded-sm border border-error/30 bg-error/5 p-3 text-sm">
            <p className="font-medium text-error">Some photos didn&apos;t upload — the property itself was saved.</p>
            <ul className="mt-2 space-y-2">
              {stagedImages
                .filter((image) => uploadStatus[image.key]?.stage === "failed")
                .map((image) => (
                  <li key={image.key} className="flex items-center justify-between gap-3 text-ink-secondary">
                    <span>
                      {image.file.name} — {uploadStatus[image.key]?.error}
                    </span>
                    <button
                      type="button"
                      onClick={() => retryStagedUpload(image.key)}
                      disabled={uploadStatus[image.key]?.stage === "uploading"}
                      className="shrink-0 rounded-sm border border-border-strong px-3 py-1 text-xs font-medium text-ink hover:bg-canvas-alt disabled:opacity-40"
                    >
                      Retry
                    </button>
                  </li>
                ))}
            </ul>
          </div>
        )}
      </section>

      {/* Section F: SEO */}
      <section className="space-y-4">
        <h2 className="font-display text-lg font-medium text-ink">SEO {optionalHint}</h2>
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
          <input className={input} value={values.metaTitle ?? ""} onChange={(e) => set("metaTitle", e.target.value)} />
        </div>
        <div>
          <label className={label}>Meta description</label>
          <textarea className={input} value={values.metaDescription ?? ""} onChange={(e) => set("metaDescription", e.target.value)} />
        </div>
      </section>

      <div className="flex items-center gap-3 border-t border-border pt-6">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-sm bg-accent px-6 py-3 text-sm font-medium text-canvas hover:bg-accent-hover disabled:opacity-40"
        >
          {isPending ? "Saving…" : propertyId ? "Save changes" : "Create property"}
        </button>
        {saved && <span className="text-xs text-ink-tertiary">Saved</span>}
      </div>

      {propertyId && (
        <section className="space-y-3 border-t border-border pt-6">
          <h2 className="font-display text-lg font-medium text-ink">Publish</h2>
          <p className="text-sm text-ink-secondary">
            Publishing makes this property visible on the public site. It requires a description. Photos are
            optional — you can publish a property without photographs and add them later; if you do add any, pick a
            cover image and give each one alt text first.
          </p>
          {publishErrors.length > 0 && (
            <ul role="alert" className="rounded-sm border border-error/30 bg-error/5 p-3 text-sm text-error">
              {publishErrors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          )}
          <button
            type="button"
            disabled={isPending}
            onClick={handlePublish}
            className="rounded-sm border border-border-strong px-6 py-3 text-sm font-medium text-ink hover:bg-canvas-alt disabled:opacity-40"
          >
            Publish
          </button>
        </section>
      )}
    </form>
  );
}
