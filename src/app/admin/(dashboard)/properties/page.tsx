import Link from "next/link";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { PropertiesTable, type PropertyRow } from "./properties-table";

const STATUSES = [
  "DRAFT",
  "PUBLISHED",
  "UNDER_OFFER",
  "UNAVAILABLE",
  "SOLD",
  "RENTED",
  "ARCHIVED",
] as const;

const LISTING_TYPES = ["SALE", "RENT"] as const;

const SORTS = {
  updated: { label: "Recently updated", orderBy: [{ updatedAt: "desc" }, { id: "asc" }] },
  newest: { label: "Newest first", orderBy: [{ createdAt: "desc" }, { id: "asc" }] },
  oldest: { label: "Oldest first", orderBy: [{ createdAt: "asc" }, { id: "asc" }] },
  price_asc: { label: "Price: low to high", orderBy: [{ priceAmount: "asc" }, { id: "asc" }] },
  price_desc: { label: "Price: high to low", orderBy: [{ priceAmount: "desc" }, { id: "asc" }] },
} satisfies Record<string, { label: string; orderBy: Prisma.PropertyOrderByWithRelationInput[] }>;
type SortKey = keyof typeof SORTS;

const PAGE_SIZE = 50;

export default async function AdminPropertiesPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    city?: string;
    state?: string;
    type?: string;
    category?: string;
    q?: string;
    sort?: string;
    page?: string;
  }>;
}) {
  const { status, city, state, type, category, q, sort: sortParam, page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const sort: SortKey = sortParam && sortParam in SORTS ? (sortParam as SortKey) : "updated";
  const query = q?.trim();

  const where: Prisma.PropertyWhereInput = {
    ...(status && STATUSES.includes(status as (typeof STATUSES)[number]) && { status: status as (typeof STATUSES)[number] }),
    ...(type && LISTING_TYPES.includes(type as (typeof LISTING_TYPES)[number]) && { listingType: type as (typeof LISTING_TYPES)[number] }),
    ...(category ? { categoryId: category } : {}),
    ...(city ? { cityId: city } : {}),
    ...(state ? { city: { stateId: state } } : {}),
    ...(query && {
      OR: [
        { title: { contains: query, mode: "insensitive" } },
        { city: { name: { contains: query, mode: "insensitive" } } },
        { locality: { name: { contains: query, mode: "insensitive" } } },
        { id: query },
      ],
    }),
  };

  const [properties, totalCount, cities, states, categories] = await Promise.all([
    prisma.property.findMany({
      where,
      include: {
        city: true,
        locality: true,
        category: { select: { name: true } },
        images: { where: { isCover: true }, take: 1 },
      },
      orderBy: SORTS[sort].orderBy,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.property.count({ where }),
    prisma.city.findMany({ orderBy: { name: "asc" } }),
    prisma.stateProvince.findMany({ orderBy: { name: "asc" } }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const rows: PropertyRow[] = properties.map((property) => ({
    id: property.id,
    title: property.title,
    slug: property.slug,
    categoryName: property.category.name,
    listingType: property.listingType,
    cityName: property.city.name,
    localityName: property.locality?.name ?? null,
    priceAmount: property.priceAmount.toString(),
    priceCurrency: property.priceCurrency,
    areaValue: property.areaValue.toString(),
    areaUnit: property.areaUnit,
    status: property.status,
    featured: property.featured,
    updatedAt: property.updatedAt.toISOString(),
    coverImageUrl: property.images[0]?.url ?? null,
  }));

  function pageHref(target: number) {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (status) params.set("status", status);
    if (type) params.set("type", type);
    if (category) params.set("category", category);
    if (city) params.set("city", city);
    if (state) params.set("state", state);
    if (sort !== "updated") params.set("sort", sort);
    if (target > 1) params.set("page", String(target));
    const qs = params.toString();
    return qs ? `?${qs}` : "";
  }

  const hasFilters = Boolean(query || status || type || category || city || state || (sortParam && sortParam !== "updated"));

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-medium text-ink">Properties</h1>
        <Link
          href="/admin/properties/new"
          className="rounded-sm bg-accent px-4 py-2 text-sm font-medium text-canvas hover:bg-accent-hover"
        >
          Add property
        </Link>
      </div>

      <form className="mt-6 flex flex-wrap items-end gap-3" method="get">
        <div>
          <label htmlFor="admin-properties-q" className="block text-xs font-medium text-ink-secondary">
            Search
          </label>
          <input
            id="admin-properties-q"
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Title, city, locality or ID"
            className="mt-1 rounded-sm border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
          />
        </div>
        <div>
          <label htmlFor="admin-properties-type" className="block text-xs font-medium text-ink-secondary">
            Buy / Rent
          </label>
          <select id="admin-properties-type" name="type" defaultValue={type ?? ""} className="mt-1 rounded-sm border border-border bg-surface px-3 py-2 text-sm">
            <option value="">All</option>
            <option value="SALE">Buy</option>
            <option value="RENT">Rent</option>
          </select>
        </div>
        <div>
          <label htmlFor="admin-properties-category" className="block text-xs font-medium text-ink-secondary">
            Property type
          </label>
          <select id="admin-properties-category" name="category" defaultValue={category ?? ""} className="mt-1 rounded-sm border border-border bg-surface px-3 py-2 text-sm">
            <option value="">All types</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="admin-properties-status" className="block text-xs font-medium text-ink-secondary">
            Status
          </label>
          <select id="admin-properties-status" name="status" defaultValue={status ?? ""} className="mt-1 rounded-sm border border-border bg-surface px-3 py-2 text-sm">
            <option value="">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="admin-properties-state" className="block text-xs font-medium text-ink-secondary">
            State
          </label>
          <select id="admin-properties-state" name="state" defaultValue={state ?? ""} className="mt-1 rounded-sm border border-border bg-surface px-3 py-2 text-sm">
            <option value="">All states</option>
            {states.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="admin-properties-city" className="block text-xs font-medium text-ink-secondary">
            City
          </label>
          <select id="admin-properties-city" name="city" defaultValue={city ?? ""} className="mt-1 rounded-sm border border-border bg-surface px-3 py-2 text-sm">
            <option value="">All cities</option>
            {cities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="admin-properties-sort" className="block text-xs font-medium text-ink-secondary">
            Sort
          </label>
          <select id="admin-properties-sort" name="sort" defaultValue={sort} className="mt-1 rounded-sm border border-border bg-surface px-3 py-2 text-sm">
            {Object.entries(SORTS).map(([key, { label }]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="rounded-sm border border-border-strong px-4 py-2 text-sm font-medium text-ink hover:bg-canvas-alt">
          Apply
        </button>
        {hasFilters && (
          <Link href="/admin/properties" className="px-2 py-2 text-sm text-ink-secondary hover:underline">
            Clear filters
          </Link>
        )}
      </form>

      <div className="mt-6">
        <PropertiesTable key={`${query ?? ""}|${status ?? ""}|${type ?? ""}|${category ?? ""}|${city ?? ""}|${state ?? ""}|${sort}|${page}`} rows={rows} />
      </div>

      {totalPages > 1 && (
        <nav
          aria-label="Properties pagination"
          className="mt-4 flex items-center justify-between text-sm text-ink-secondary"
        >
          <p>
            Page {page} of {totalPages} · {totalCount} properties
          </p>
          <div className="flex gap-3">
            {page > 1 && (
              <Link href={pageHref(page - 1)} className="text-accent hover:underline">
                Previous
              </Link>
            )}
            {page < totalPages && (
              <Link href={pageHref(page + 1)} className="text-accent hover:underline">
                Next
              </Link>
            )}
          </div>
        </nav>
      )}
    </div>
  );
}
