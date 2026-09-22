import { prisma } from "@/lib/prisma";
import { addFeatured, removeFeatured, reorderFeatured } from "./actions";

export default async function AdminFeaturedPage() {
  const [featuredEntries, publishedProperties] = await Promise.all([
    prisma.featuredProperty.findMany({
      orderBy: { position: "asc" },
      include: { property: { select: { id: true, title: true, slug: true } } },
    }),
    prisma.property.findMany({
      where: { status: "PUBLISHED", featuredEntries: { none: {} } },
      select: { id: true, title: true },
      orderBy: { title: "asc" },
      take: 100,
    }),
  ]);

  return (
    <div>
      <h1 className="font-display text-2xl font-medium text-ink">Featured properties</h1>
      <p className="mt-2 text-sm text-ink-secondary">
        Controls the homepage &quot;This week&apos;s picks&quot; order.
      </p>

      <ol className="mt-6 divide-y divide-border rounded-md border border-border">
        {featuredEntries.map((entry, index) => (
          <li key={entry.id} className="flex items-center justify-between px-3 py-2 text-sm">
            <span className="text-ink">{entry.property.title}</span>
            <div className="flex items-center gap-3 text-xs">
              <form action={reorderFeatured.bind(null, entry.propertyId, "up")}>
                <button type="submit" disabled={index === 0}>
                  ↑
                </button>
              </form>
              <form action={reorderFeatured.bind(null, entry.propertyId, "down")}>
                <button type="submit" disabled={index === featuredEntries.length - 1}>
                  ↓
                </button>
              </form>
              <form action={removeFeatured.bind(null, entry.propertyId)}>
                <button type="submit" className="text-error hover:underline">
                  Remove
                </button>
              </form>
            </div>
          </li>
        ))}
        {featuredEntries.length === 0 && (
          <li className="px-3 py-6 text-center text-sm text-ink-secondary">
            No featured properties yet.
          </li>
        )}
      </ol>

      {publishedProperties.length > 0 && (
        <div className="mt-8">
          <h2 className="font-medium text-ink">Add a property</h2>
          <ul className="mt-3 divide-y divide-border rounded-md border border-border">
            {publishedProperties.map((property) => (
              <li key={property.id} className="flex items-center justify-between px-3 py-2 text-sm">
                {property.title}
                <form action={addFeatured.bind(null, property.id)}>
                  <button type="submit" className="text-xs text-accent hover:underline">
                    Feature
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
