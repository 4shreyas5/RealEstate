import type { Metadata } from "next";
import { requireAdminUser } from "@/lib/admin-auth";
import { AdminSidebar } from "@/components/admin/admin-sidebar";

// Defense in depth alongside robots.txt's /admin disallow — a disallowed
// page can still end up indexed if something external links to it.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const adminUser = await requireAdminUser();

  return (
    <div className="flex min-h-screen bg-canvas">
      <AdminSidebar />
      <div className="flex-1">
        <header className="flex h-14 items-center justify-end border-b border-border px-6 text-sm text-ink-secondary">
          Signed in as {adminUser.name} · {adminUser.role.toLowerCase()}
        </header>
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
