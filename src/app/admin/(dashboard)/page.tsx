import { prisma } from "@/lib/prisma";

async function getDashboardStats() {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const [newLeads, publishedCount, needsAttention] = await Promise.all([
    prisma.lead.count({ where: { createdAt: { gte: weekAgo } } }),
    prisma.property.count({ where: { status: "PUBLISHED" } }),
    prisma.property.count({
      where: {
        status: { in: ["DRAFT", "PUBLISHED"] },
        images: { none: { isCover: true } },
      },
    }),
  ]);

  return { newLeads, publishedCount, needsAttention };
}

export default async function AdminDashboardPage() {
  const stats = await getDashboardStats();

  const cards = [
    { label: "New leads this week", value: stats.newLeads },
    { label: "Properties published", value: stats.publishedCount },
    { label: "Missing a cover image", value: stats.needsAttention },
  ];

  return (
    <div>
      <h1 className="font-display text-2xl font-medium text-ink">Dashboard</h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-md border border-border bg-surface p-4"
          >
            <p className="text-sm text-ink-secondary">{card.label}</p>
            <p className="mt-2 font-sans text-2xl font-semibold tabular-nums text-ink">
              {card.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
