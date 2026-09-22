import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/lib/admin-auth";
import { ConfirmSubmitButton } from "@/components/admin/confirm-submit-button";
import { addAdminUser, removeAdminUser } from "./actions";

export default async function AdminUsersPage() {
  const [me, users] = await Promise.all([
    requireAdminUser(),
    prisma.adminUser.findMany({ orderBy: { createdAt: "asc" } }),
  ]);

  return (
    <div>
      <h1 className="font-display text-2xl font-medium text-ink">Admin users</h1>

      <ul className="mt-6 divide-y divide-border rounded-md border border-border">
        {users.map((user) => (
          <li key={user.id} className="flex items-center justify-between px-3 py-2 text-sm">
            <span className="text-ink">
              {user.name} <span className="text-ink-secondary">— {user.email} · {user.role}</span>
            </span>
            {me.role === "ADMIN" && me.id !== user.id && (
              <form action={removeAdminUser.bind(null, user.id)}>
                <ConfirmSubmitButton
                  confirmMessage={`Remove admin access for ${user.name}?`}
                  className="text-xs text-error hover:underline"
                >
                  Remove
                </ConfirmSubmitButton>
              </form>
            )}
          </li>
        ))}
      </ul>

      {me.role === "ADMIN" && (
        <div className="mt-8">
          <h2 className="font-medium text-ink">Add an admin user</h2>
          <p className="mt-1 text-xs text-ink-secondary">
            Create the person in Supabase Auth first, then paste their user ID here.
          </p>
          <form action={addAdminUser} className="mt-3 flex flex-wrap gap-2">
            <input name="userId" placeholder="Supabase user ID" required className="rounded-sm border border-border px-3 py-2 text-sm" />
            <input name="name" placeholder="Name" required className="rounded-sm border border-border px-3 py-2 text-sm" />
            <input name="email" type="email" placeholder="Email" required className="rounded-sm border border-border px-3 py-2 text-sm" />
            <select name="role" className="rounded-sm border border-border px-3 py-2 text-sm">
              <option value="EDITOR">Editor</option>
              <option value="ADMIN">Admin</option>
            </select>
            <button type="submit" className="rounded-sm bg-accent px-4 py-2 text-sm font-medium text-canvas">
              Add
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
