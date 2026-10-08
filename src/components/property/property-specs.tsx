import { formatArea } from "@/lib/format";
import type { Translator } from "@/i18n/translate";
import type { Locale } from "@/i18n/config";

export interface PropertySpecs {
  bedrooms: number | null;
  bathrooms: number | null;
  areaValue: number;
  areaUnit: string;
  categoryName: string;
  floor: number | null;
  totalFloors: number | null;
  facing: string | null;
  furnishing: string | null;
  propertyAgeYears: number | null;
  constructionStatus: string | null;
  possessionDate: Date | null;
  parkingSpaces: number | null;
}

export function PrimarySpecs({ specs, t, locale = "en" }: { specs: PropertySpecs; t: Translator; locale?: Locale }) {
  const items = [
    specs.bedrooms !== null && { label: t("propertyDetail.specBedrooms"), value: String(specs.bedrooms) },
    specs.bathrooms !== null && { label: t("propertyDetail.specBathrooms"), value: String(specs.bathrooms) },
    { label: t("propertyDetail.specArea"), value: formatArea(specs.areaValue, specs.areaUnit, locale) },
    { label: t("propertyDetail.specType"), value: specs.categoryName },
  ].filter((x): x is { label: string; value: string } => Boolean(x));

  return (
    <dl className="grid grid-cols-2 gap-4 border-y border-border py-5 sm:grid-cols-4">
      {items.map((item) => (
        <div key={item.label}>
          <dt className="text-xs text-ink-secondary">{item.label}</dt>
          <dd className="mt-0.5 text-base font-medium text-ink">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Finite, enum-backed vocabulary (facing/furnishing/construction status) —
 * translated via the dictionary; the DB column itself stays an untouched
 * enum code (e.g. "NORTH_EAST"), only its display label changes by locale. */
function enumLabel(t: Translator, group: "facing" | "furnishing" | "constructionStatus", value: string | null) {
  if (!value) return null;
  return t(`property.${group}.${value}`);
}

export function SecondarySpecs({ specs, t }: { specs: PropertySpecs; t: Translator }) {
  const allRows: [string, string | null][] = [
    [t("propertyDetail.specFloor"), specs.floor !== null ? String(specs.floor) : null],
    [t("propertyDetail.specTotalFloors"), specs.totalFloors !== null ? String(specs.totalFloors) : null],
    [t("propertyDetail.specFacing"), enumLabel(t, "facing", specs.facing)],
    [t("propertyDetail.specFurnishing"), enumLabel(t, "furnishing", specs.furnishing)],
    [
      t("propertyDetail.specPropertyAge"),
      specs.propertyAgeYears !== null ? t("propertyDetail.specPropertyAgeYears", { count: specs.propertyAgeYears }) : null,
    ],
    [t("propertyDetail.specConstructionStatus"), enumLabel(t, "constructionStatus", specs.constructionStatus)],
    [
      t("propertyDetail.specPossession"),
      specs.possessionDate ? new Date(specs.possessionDate).toLocaleDateString() : null,
    ],
    [t("propertyDetail.specParking"), specs.parkingSpaces !== null ? String(specs.parkingSpaces) : null],
  ];
  const rows = allRows.filter(
    (row): row is [string, string] => row[1] !== null,
  );

  if (rows.length === 0) return null;

  return (
    <details className="border-b border-border py-5">
      <summary className="cursor-pointer text-sm font-medium text-ink">{t("propertyDetail.moreDetails")}</summary>
      <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
        {rows.map(([key, value]) => (
          <div key={key}>
            <dt className="text-ink-secondary">{key}</dt>
            <dd className="text-ink">{value}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}
