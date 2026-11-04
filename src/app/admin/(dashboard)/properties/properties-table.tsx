"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { isSupabaseStorageUrl } from "@/lib/storage";
import { useState, useTransition } from "react";
import type { ListingType, PropertyStatus } from "@prisma/client";
import { cn } from "@/lib/utils";
import {
  bulkChangeStatus,
  changePropertyStatus,
  deleteProperty,
  duplicateProperty,
  toggleFeatured,
} from "./actions";

export interface PropertyRow {
  id: string;
  title: string;
  slug: string;
  categoryName: string;
  listingType: ListingType;
  cityName: string;
  localityName: string | null;
  priceAmount: string;
  priceCurrency: string;
  areaValue: string;
  areaUnit: string;
  status: PropertyStatus;
  featured: boolean;
  updatedAt: string;
  coverImageUrl: string | null;
}

const STATUS_TONE: Record<PropertyStatus, string> = {
  DRAFT: "text-ink-tertiary",
  PUBLISHED: "text-success",
  UNDER_OFFER: "text-warning",
  UNAVAILABLE: "text-ink-tertiary",
  SOLD: "text-unavailable",
  RENTED: "text-unavailable",
  ARCHIVED: "text-ink-tertiary",
};

const STATUSES: PropertyStatus[] = [
  "DRAFT",
  "PUBLISHED",
  "UNDER_OFFER",
  "UNAVAILABLE",
  "SOLD",
  "RENTED",
  "ARCHIVED",
];

/** `page.tsx` passes a `key` derived from the current filters/page so this
 * remounts (and its local `rows` state resets) whenever the server sends a
 * genuinely different result set, while in-page actions (delete, status
 * change) can still mutate `rows` locally without a server round trip. */
export function PropertiesTable({ rows: initialRows }: { rows: PropertyRow[] }) {
  const router = useRouter();
  const [rows, setRows] = useState(initialRows);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState<{ tone: "info" | "error"; message: string } | null>(null);

  const allSelected = rows.length > 0 && selected.size === rows.length;

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.id)));
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function runBulkStatus(status: PropertyStatus, confirmMessage: string) {
    if (!window.confirm(confirmMessage)) return;
    startTransition(async () => {
      const result = await bulkChangeStatus(Array.from(selected), status);
      setSelected(new Set());
      if (result.blocked.length > 0) {
        setBanner({
          tone: "error",
          message: `Published ${result.updatedCount} of ${result.updatedCount + result.blocked.length}. Blocked: ${result.blocked
            .map((b) => `"${b.title}" (${b.errors.join(" ")})`)
            .join("; ")}`,
        });
      } else {
        setBanner({ tone: "info", message: `Updated ${result.updatedCount} propert${result.updatedCount === 1 ? "y" : "ies"}.` });
      }
      router.refresh();
    });
  }

  function changeStatus(row: PropertyRow, status: PropertyStatus) {
    const previous = row.status;
    setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, status } : r)));
    setRowErrors((prev) => ({ ...prev, [row.id]: "" }));
    startTransition(async () => {
      const result = await changePropertyStatus(row.id, status);
      if (!result.ok) {
        setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, status: previous } : r)));
        setRowErrors((prev) => ({ ...prev, [row.id]: result.errors.join(" ") }));
      } else {
        router.refresh();
      }
    });
  }

  function handleDelete(row: PropertyRow) {
    if (!window.confirm(`Delete "${row.title}"? This removes its photos and amenities too. This can't be undone.`)) return;
    startTransition(async () => {
      const result = await deleteProperty(row.id);
      if (result.ok) {
        setRows((prev) => prev.filter((r) => r.id !== row.id));
        router.refresh();
      } else {
        setBanner({ tone: "error", message: result.errors.join(" ") });
      }
    });
  }

  return (
    <div className="overflow-x-auto rounded-md border border-border">
      {banner && (
        <div
          className={cn(
            "flex items-start justify-between gap-3 border-b border-border px-4 py-2 text-sm",
            banner.tone === "error" ? "bg-error/5 text-error" : "bg-canvas-alt text-ink",
          )}
        >
          <p>{banner.message}</p>
          <button type="button" onClick={() => setBanner(null)} aria-label="Dismiss" className="shrink-0">
            ×
          </button>
        </div>
      )}

      {selected.size > 0 && (
        <div className="flex items-center gap-3 border-b border-border bg-canvas-alt px-4 py-2 text-sm">
          <span className="font-medium text-ink">{selected.size} selected</span>
          <button
            type="button"
            disabled={isPending}
            onClick={() => runBulkStatus("PUBLISHED", `Publish ${selected.size} selected propert${selected.size === 1 ? "y" : "ies"}? Any missing photos/alt text will be skipped.`)}
            className="rounded-sm border border-border-strong px-3 py-1.5 hover:bg-surface"
          >
            Publish
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() => runBulkStatus("UNAVAILABLE", `Mark ${selected.size} selected propert${selected.size === 1 ? "y" : "ies"} unavailable?`)}
            className="rounded-sm border border-border-strong px-3 py-1.5 hover:bg-surface"
          >
            Unpublish
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() => runBulkStatus("ARCHIVED", `Archive ${selected.size} selected propert${selected.size === 1 ? "y" : "ies"}?`)}
            className="rounded-sm border border-border-strong px-3 py-1.5 hover:bg-surface"
          >
            Archive
          </button>
        </div>
      )}

      <table className="w-full text-left text-sm">
        <thead className="bg-canvas-alt text-xs text-ink-secondary">
          <tr>
            <th scope="col" className="w-10 px-4 py-2">
              <input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="Select all properties" />
            </th>
            <th scope="col" className="px-2 py-2">Property</th>
            <th scope="col" className="px-2 py-2">Type</th>
            <th scope="col" className="px-2 py-2">Location</th>
            <th scope="col" className="px-2 py-2">Price</th>
            <th scope="col" className="px-2 py-2">Area</th>
            <th scope="col" className="px-2 py-2">Status</th>
            <th scope="col" className="px-2 py-2">Updated</th>
            <th scope="col" className="px-2 py-2">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-t border-border hover:bg-canvas-alt/40">
              <td className="px-4 py-2">
                <input type="checkbox" checked={selected.has(row.id)} onChange={() => toggleOne(row.id)} aria-label={`Select ${row.title}`} />
              </td>
              <td className="px-2 py-2">
                <div className="flex items-center gap-3">
                  <div className="relative h-10 w-14 shrink-0 overflow-hidden rounded-sm bg-canvas-alt">
                    {row.coverImageUrl && (
                      <Image
                        src={row.coverImageUrl}
                        alt=""
                        fill
                        sizes="56px"
                        unoptimized={!isSupabaseStorageUrl(row.coverImageUrl)}
                        className="object-cover"
                      />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-ink">{row.title}</p>
                    {row.featured && <span className="text-xs text-accent">Featured</span>}
                  </div>
                </div>
              </td>
              <td className="px-2 py-2 text-ink-secondary">
                <p>{row.categoryName}</p>
                <p className="text-xs">{row.listingType === "SALE" ? "Buy" : "Rent"}</p>
              </td>
              <td className="px-2 py-2 text-ink-secondary">
                {row.localityName ? `${row.localityName}, ${row.cityName}` : row.cityName}
              </td>
              <td className="px-2 py-2 tabular-nums text-ink">
                {row.priceCurrency} {Number(row.priceAmount).toLocaleString("en-IN")}
              </td>
              <td className="px-2 py-2 tabular-nums text-ink-secondary">
                {Number(row.areaValue).toLocaleString("en-IN")} {row.areaUnit}
              </td>
              <td className="px-2 py-2">
                <select
                  value={row.status}
                  disabled={isPending}
                  aria-label={`Status for ${row.title}`}
                  onChange={(e) => changeStatus(row, e.target.value as PropertyStatus)}
                  className={cn("rounded-sm border-none bg-transparent text-xs font-medium", STATUS_TONE[row.status])}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                {rowErrors[row.id] && <p className="mt-1 max-w-48 text-[11px] text-error">{rowErrors[row.id]}</p>}
              </td>
              <td className="px-2 py-2 text-ink-secondary">
                {new Date(row.updatedAt).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })}
              </td>
              <td className="px-2 py-2">
                <div className="flex items-center justify-end gap-3 text-xs">
                  <Link href={`/admin/properties/${row.id}`} className="text-accent hover:underline">
                    Edit
                  </Link>
                  {row.status === "DRAFT" ? (
                    <span className="text-ink-tertiary" title="Publish this property first to preview it">
                      Preview
                    </span>
                  ) : (
                    <Link href={`/properties/${row.slug}`} target="_blank" className="text-ink-secondary hover:underline">
                      View
                    </Link>
                  )}
                  <button
                    type="button"
                    onClick={() => startTransition(() => toggleFeatured(row.id, !row.featured))}
                    className="text-ink-secondary hover:underline"
                  >
                    {row.featured ? "Unfeature" : "Feature"}
                  </button>
                  <button
                    type="button"
                    onClick={() => startTransition(() => duplicateProperty(row.id))}
                    className="text-ink-secondary hover:underline"
                  >
                    Duplicate
                  </button>
                  <button type="button" onClick={() => handleDelete(row)} className="text-error hover:underline">
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={9} className="px-4 py-10 text-center text-ink-secondary">
                No properties match these filters.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
