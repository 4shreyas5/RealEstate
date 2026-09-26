"use client";

import Link from "next/link";
import Image from "next/image";
import { isSupabaseStorageUrl } from "@/lib/storage";
import { useState, useTransition } from "react";
import type { PropertyStatus } from "@prisma/client";
import { cn } from "@/lib/utils";
import {
  bulkChangeStatus,
  changePropertyStatus,
  duplicateProperty,
  toggleFeatured,
} from "./actions";

export interface PropertyRow {
  id: string;
  title: string;
  slug: string;
  cityName: string;
  localityName: string;
  priceAmount: string;
  priceCurrency: string;
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

export function PropertiesTable({ rows }: { rows: PropertyRow[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();

  const allSelected = rows.length > 0 && selected.size === rows.length;

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.id)));
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function runBulkStatus(status: PropertyStatus) {
    startTransition(async () => {
      await bulkChangeStatus(Array.from(selected), status);
      setSelected(new Set());
    });
  }

  return (
    <div className="overflow-x-auto rounded-md border border-border">
      {selected.size > 0 && (
        <div className="flex items-center gap-3 border-b border-border bg-canvas-alt px-4 py-2 text-sm">
          <span className="font-medium text-ink">{selected.size} selected</span>
          <button
            type="button"
            disabled={isPending}
            onClick={() => runBulkStatus("PUBLISHED")}
            className="rounded-sm border border-border-strong px-3 py-1.5 hover:bg-surface"
          >
            Publish
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() => runBulkStatus("UNAVAILABLE")}
            className="rounded-sm border border-border-strong px-3 py-1.5 hover:bg-surface"
          >
            Unpublish
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() => runBulkStatus("ARCHIVED")}
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
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleAll}
                aria-label="Select all properties"
              />
            </th>
            <th scope="col" className="px-2 py-2">
              Property
            </th>
            <th scope="col" className="px-2 py-2">
              Location
            </th>
            <th scope="col" className="px-2 py-2">
              Price
            </th>
            <th scope="col" className="px-2 py-2">
              Status
            </th>
            <th scope="col" className="px-2 py-2">
              Updated
            </th>
            <th scope="col" className="px-2 py-2">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-t border-border hover:bg-canvas-alt/40">
              <td className="px-4 py-2">
                <input
                  type="checkbox"
                  checked={selected.has(row.id)}
                  onChange={() => toggleOne(row.id)}
                  aria-label={`Select ${row.title}`}
                />
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
                        // Placeholder (non-Storage) covers can't use the optimizer in production.
                        unoptimized={!isSupabaseStorageUrl(row.coverImageUrl)}
                        className="object-cover"
                      />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-ink">{row.title}</p>
                    {row.featured && (
                      <span className="text-xs text-accent">Featured</span>
                    )}
                  </div>
                </div>
              </td>
              <td className="px-2 py-2 text-ink-secondary">
                {row.localityName}, {row.cityName}
              </td>
              <td className="px-2 py-2 tabular-nums text-ink">
                {row.priceCurrency} {Number(row.priceAmount).toLocaleString("en-IN")}
              </td>
              <td className="px-2 py-2">
                <select
                  defaultValue={row.status}
                  disabled={isPending}
                  aria-label={`Status for ${row.title}`}
                  onChange={(e) =>
                    startTransition(() =>
                      changePropertyStatus(row.id, e.target.value as PropertyStatus),
                    )
                  }
                  className={cn(
                    "rounded-sm border-none bg-transparent text-xs font-medium",
                    STATUS_TONE[row.status],
                  )}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </td>
              <td className="px-2 py-2 text-ink-secondary">
                {new Date(row.updatedAt).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })}
              </td>
              <td className="px-2 py-2">
                <div className="flex items-center justify-end gap-3 text-xs">
                  <Link href={`/admin/properties/${row.id}`} className="text-accent hover:underline">
                    Edit
                  </Link>
                  <Link
                    href={`/properties/${row.slug}`}
                    target="_blank"
                    className="text-ink-secondary hover:underline"
                  >
                    View
                  </Link>
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
                </div>
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={7} className="px-4 py-10 text-center text-ink-secondary">
                No properties match these filters.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
