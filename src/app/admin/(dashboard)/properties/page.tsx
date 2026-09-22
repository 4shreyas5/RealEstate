import Link from "next/link";
import { prisma } from "@/lib/prisma";
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

const PAGE_SIZE = 50;

export default async function AdminPropertiesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; city?: string; q?: string; page?: string }>;
}) {
  const { status, city, q, page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const where = {
    ...(status ? { status: status as (typeof STATUSES)[number] } : {}),
    ...(city ? { cityId: city } : {}),
    ...(q ? { title: { contains: q, mode: "insensitive" as const } } : {}),
  };

  const [properties, totalCount, cities] = await Promise.all([
    prisma.property.findMany({
      where,
      include: {
        city: true,
        locality: true,
        images: { where: { isCover: true }, take: 1 },
      },
      orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.property.count({ where }),
    prisma.city.findMany({ orderBy: { name: "asc" } }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const rows: PropertyRow[] = properties.map((property) => ({
    id: property.id,
    title: property.title,
    slug: property.slug,
    cityName: property.city.name,
    localityName: property.locality.name,
    priceAmount: property.priceAmount.toString(),
    priceCurrency: property.priceCurrency,
    status: property.status,
    featured: property.featured,
    updatedAt: property.updatedAt.toISOString(),
    coverImageUrl: property.images[0]?.url ?? null,
  }));

  function pageHref(target: number) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (status) params.set("status", status);
    if (city) params.set("city", city);
    if (target > 1) params.set("page", String(target));
    const qs = params.toString();
    return qs ? `?${qs}` : "";
  }

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

      <form className="mt-6 flex flex-wrap items-center gap-3" method="get">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search by title"
          className="rounded-sm border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
        />
        <select
          name="status"
          defaultValue={status ?? ""}
          className="rounded-sm border border-border bg-surface px-3 py-2 text-sm"
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          name="city"
          defaultValue={city ?? ""}
          className="rounded-sm border border-border bg-surface px-3 py-2 text-sm"
        >
          <option value="">All cities</option>
          {cities.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-sm border border-border-strong px-4 py-2 text-sm font-medium text-ink hover:bg-canvas-alt"
        >
          Filter
        </button>
      </form>

      <div className="mt-6">
        <PropertiesTable rows={rows} />
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
