import { prisma } from "@/lib/prisma";
import { ConfirmSubmitButton } from "@/components/admin/confirm-submit-button";
import { createAmenity, deleteAmenity } from "./actions";

export default async function AdminAmenitiesPage() {
  const amenities = await prisma.amenity.findMany({ orderBy: { name: "asc" } });

  return (
    <div>
      <h1 className="font-display text-2xl font-medium text-ink">Amenities</h1>

      <form action={createAmenity} className="mt-6 flex gap-2">
        <input
          name="name"
          placeholder="Amenity name"
          required
          className="flex-1 rounded-sm border border-border bg-surface px-3 py-2 text-sm"
        />
        <button type="submit" className="rounded-sm bg-accent px-4 py-2 text-sm font-medium text-canvas">
          Add
        </button>
      </form>

      {amenities.length === 0 ? (
        <p className="mt-6 text-sm text-ink-secondary">No amenities yet.</p>
      ) : (
        <ul className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {amenities.map((amenity) => (
            <li
              key={amenity.id}
              className="flex items-center justify-between rounded-sm border border-border px-3 py-2 text-sm"
            >
              {amenity.name}
              <form action={deleteAmenity.bind(null, amenity.id)}>
                <ConfirmSubmitButton
                  confirmMessage={`Remove "${amenity.name}"?`}
                  className="text-xs text-error hover:underline"
                >
                  Remove
                </ConfirmSubmitButton>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
