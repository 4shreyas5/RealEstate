import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { LeadsTable } from "./leads-table";

const PAGE_SIZE = 50;

export default async function AdminLeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const { status, page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const where = status ? { status: status as "NEW" | "CONTACTED" | "CLOSED" } : {};

  const [leads, totalCount] = await Promise.all([
    prisma.lead.findMany({
      where,
      include: { property: { select: { title: true } } },
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.lead.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  function pageHref(target: number) {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (target > 1) params.set("page", String(target));
    const qs = params.toString();
    return qs ? `?${qs}` : "";
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-medium text-ink">Leads</h1>

      <form className="mt-6 flex gap-3" method="get">
        <select
          name="status"
          defaultValue={status ?? ""}
          className="rounded-sm border border-border bg-surface px-3 py-2 text-sm"
        >
          <option value="">All statuses</option>
          <option value="NEW">New</option>
          <option value="CONTACTED">Contacted</option>
          <option value="CLOSED">Closed</option>
        </select>
        <button
          type="submit"
          className="rounded-sm border border-border-strong px-4 py-2 text-sm font-medium text-ink hover:bg-canvas-alt"
        >
          Filter
        </button>
      </form>

      <div className="mt-6 overflow-x-auto rounded-md border border-border">
        <LeadsTable
          rows={leads.map((lead) => ({
            id: lead.id,
            name: lead.name,
            phone: lead.phone,
            email: lead.email,
            propertyTitle: lead.property?.title ?? null,
            source: lead.source,
            actionType: lead.actionType,
            status: lead.status,
            createdAt: lead.createdAt.toISOString(),
          }))}
        />
      </div>

      {totalPages > 1 && (
        <nav
          aria-label="Leads pagination"
          className="mt-4 flex items-center justify-between text-sm text-ink-secondary"
        >
          <p>
            Page {page} of {totalPages} · {totalCount} leads
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
