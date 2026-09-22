import { prisma } from "@/lib/prisma";
import { ConfirmSubmitButton } from "@/components/admin/confirm-submit-button";
import { createCategory, deleteCategory } from "./actions";

export default async function AdminCategoriesPage() {
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { properties: true } } },
  });

  return (
    <div>
      <h1 className="font-display text-2xl font-medium text-ink">Categories</h1>

      <form action={createCategory} className="mt-6 flex flex-wrap gap-2">
        <input
          name="name"
          placeholder="Category name"
          required
          className="rounded-sm border border-border bg-surface px-3 py-2 text-sm"
        />
        <input
          name="imageUrl"
          placeholder="Image URL (optional)"
          className="flex-1 rounded-sm border border-border bg-surface px-3 py-2 text-sm"
        />
        <button type="submit" className="rounded-sm bg-accent px-4 py-2 text-sm font-medium text-canvas">
          Add category
        </button>
      </form>

      <ul className="mt-6 divide-y divide-border rounded-md border border-border">
        {categories.length === 0 && (
          <li className="px-3 py-6 text-center text-sm text-ink-secondary">No categories yet.</li>
        )}
        {categories.map((category) => (
          <li key={category.id} className="flex items-center justify-between px-3 py-2 text-sm">
            <span className="text-ink">
              {category.name}{" "}
              <span className="text-ink-secondary">— {category._count.properties} properties</span>
            </span>
            <form action={deleteCategory.bind(null, category.id)}>
              <ConfirmSubmitButton
                confirmMessage={`Delete "${category.name}"? This can't be undone.`}
                className="text-xs text-error hover:underline"
              >
                Delete
              </ConfirmSubmitButton>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}
