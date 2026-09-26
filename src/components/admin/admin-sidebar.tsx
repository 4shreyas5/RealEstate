"use client";

import Link from "next/link";
import { DreamITLogo } from "@/components/brand/dreamit-logo";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const sections = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/properties", label: "Properties" },
  { href: "/admin/properties/new", label: "Add property" },
  { href: "/admin/locations", label: "Locations" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/amenities", label: "Amenities" },
  { href: "/admin/leads", label: "Leads" },
  { href: "/admin/featured", label: "Featured properties" },
  { href: "/admin/settings", label: "Settings" },
  { href: "/admin/users", label: "Admin users" },
  { href: "/admin/audit", label: "Audit" },
] as const;

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Admin"
      className="hidden w-56 shrink-0 flex-col gap-1 border-r border-border bg-canvas-alt p-4 lg:flex"
    >
      <Link href="/admin" aria-label="DreamIT admin" className="mb-4 px-2">
        <DreamITLogo className="[&>span]:text-xl" />
      </Link>
      {sections.map((section) => {
        const active =
          section.href === "/admin"
            ? pathname === "/admin"
            : pathname.startsWith(section.href);
        return (
          <Link
            key={section.href}
            href={section.href}
            className={cn(
              "rounded-sm px-2 py-2 text-sm",
              active
                ? "bg-accent-subtle font-medium text-accent"
                : "text-ink-secondary hover:bg-surface hover:text-ink",
            )}
          >
            {section.label}
          </Link>
        );
      })}
    </nav>
  );
}
