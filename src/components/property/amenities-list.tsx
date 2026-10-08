import type { Translator } from "@/i18n/translate";

export function AmenitiesList({
  amenities,
  t,
}: {
  amenities: { id: string; name: string }[];
  t: Translator;
}) {
  if (amenities.length === 0) return null;

  return (
    <div className="border-b border-border py-6">
      <h2 className="font-display text-xl font-medium text-ink">{t("propertyDetail.amenities")}</h2>
      <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {amenities.map((amenity) => (
          <li key={amenity.id} className="flex items-center gap-2 text-sm text-ink-secondary">
            <span aria-hidden="true" className="h-1 w-1 rounded-full bg-ink-tertiary" />
            {amenity.name}
          </li>
        ))}
      </ul>
    </div>
  );
}
