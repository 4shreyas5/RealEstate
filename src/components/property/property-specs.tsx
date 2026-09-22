import { formatArea } from "@/lib/format";

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

export function PrimarySpecs({ specs }: { specs: PropertySpecs }) {
  const items = [
    specs.bedrooms !== null && { label: "Bedrooms", value: String(specs.bedrooms) },
    specs.bathrooms !== null && { label: "Bathrooms", value: String(specs.bathrooms) },
    { label: "Area", value: formatArea(specs.areaValue, specs.areaUnit) },
    { label: "Type", value: specs.categoryName },
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

function label(value: string | null) {
  return value ? value.replace(/_/g, " ").toLowerCase() : null;
}

export function SecondarySpecs({ specs }: { specs: PropertySpecs }) {
  const allRows: [string, string | null][] = [
    ["Floor", specs.floor !== null ? String(specs.floor) : null],
    ["Total floors", specs.totalFloors !== null ? String(specs.totalFloors) : null],
    ["Facing", label(specs.facing)],
    ["Furnishing", label(specs.furnishing)],
    ["Property age", specs.propertyAgeYears !== null ? `${specs.propertyAgeYears} yrs` : null],
    ["Construction status", label(specs.constructionStatus)],
    [
      "Possession",
      specs.possessionDate ? new Date(specs.possessionDate).toLocaleDateString() : null,
    ],
    ["Parking", specs.parkingSpaces !== null ? String(specs.parkingSpaces) : null],
  ];
  const rows = allRows.filter(
    (row): row is [string, string] => row[1] !== null,
  );

  if (rows.length === 0) return null;

  return (
    <details className="border-b border-border py-5">
      <summary className="cursor-pointer text-sm font-medium text-ink">More details</summary>
      <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
        {rows.map(([key, value]) => (
          <div key={key}>
            <dt className="text-ink-secondary">{key}</dt>
            <dd className="capitalize text-ink">{value}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}
