import Link from "next/link";
import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 50;

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const [entries, totalCount] = await Promise.all([
    prisma.auditLogEntry.findMany({
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { adminUser: { select: { name: true } }, property: { select: { title: true } } },
    }),
    prisma.auditLogEntry.count(),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <div>
      <h1 className="font-display text-2xl font-medium text-ink">Audit</h1>
      <p className="mt-2 text-sm text-ink-secondary">
        A read-only log of who changed what, and when.
      </p>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-canvas-alt text-xs text-ink-secondary">
            <tr>
              <th scope="col" className="px-3 py-2">
                When
              </th>
              <th scope="col" className="px-3 py-2">
                Who
              </th>
              <th scope="col" className="px-3 py-2">
                Action
              </th>
              <th scope="col" className="px-3 py-2">
                Property
              </th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id} className="border-t border-border">
                <td className="px-3 py-2 text-ink-secondary">
                  {entry.createdAt.toLocaleString()}
                </td>
                <td className="px-3 py-2 text-ink">{entry.adminUser.name}</td>
                <td className="px-3 py-2 text-ink-secondary">{entry.action.replace(/_/g, " ")}</td>
                <td className="px-3 py-2 text-ink-secondary">{entry.property?.title ?? "—"}</td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-10 text-center text-ink-secondary">
                  No activity yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <nav
          aria-label="Audit log pagination"
          className="mt-4 flex items-center justify-between text-sm text-ink-secondary"
        >
          <p>
            Page {page} of {totalPages} · {totalCount} entries
          </p>
          <div className="flex gap-3">
            {page > 1 && (
              <Link href={`?page=${page - 1}`} className="text-accent hover:underline">
                Previous
              </Link>
            )}
            {page < totalPages && (
              <Link href={`?page=${page + 1}`} className="text-accent hover:underline">
                Next
              </Link>
            )}
          </div>
        </nav>
      )}
    </div>
  );
}
