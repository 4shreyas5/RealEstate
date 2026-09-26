"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LinkButton } from "@/components/ui/button";
import { DreamITLogo } from "@/components/brand/dreamit-logo";
import { CityMenu, type NavCity } from "./city-menu";

const primaryLinks = [
  { href: "/buy", label: "Buy" },
  { href: "/rent", label: "Rent" },
  { href: "/search", label: "Search" },
  { href: "/locations", label: "Locations" },
  { href: "/categories", label: "Categories" },
];

/**
 * Single-row nav: logo, city selector, primary links, contact action.
 * No mega-menu. Mobile collapses links into a slide-in sheet; the city
 * selector and contact action stay visible in the bar at every breakpoint.
 * Buy/Rent are the two primary discovery journeys, so they lead the nav and
 * get an explicit active-state indicator — not a generic filter link.
 */
export function SiteHeader({ cities }: { cities: NavCity[] }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-canvas">
      <div className="mx-auto flex h-16 max-w-(--breakpoint-xl) items-center gap-3 px-4 sm:gap-6 sm:px-6 lg:px-10">
        <button
          type="button"
          className="-ml-2 flex items-center justify-center rounded-sm p-2 text-ink lg:hidden"
          aria-expanded={menuOpen}
          aria-controls="mobile-nav"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <MenuIcon open={menuOpen} />
        </button>

        <Link
          href="/"
          aria-label="DreamIT home"
          className="rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
        >
          <DreamITLogo />
        </Link>

        <CityMenu cities={cities} />

        <nav className="ml-auto hidden items-center gap-6 lg:flex" aria-label="Primary">
          {primaryLinks.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={
                  active
                    ? "text-sm font-semibold text-ink underline decoration-2 underline-offset-8"
                    : "text-sm font-medium text-ink-secondary hover:text-ink"
                }
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <LinkButton href="/contact" variant="ghost" className="ml-auto px-4 py-2 lg:ml-6">
          Contact us
        </LinkButton>
      </div>

      {menuOpen && (
        <div
          id="mobile-nav"
          className="fixed inset-0 top-16 z-30 bg-canvas lg:hidden"
        >
          <nav className="flex flex-col gap-1 p-6" aria-label="Primary">
            {primaryLinks.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={
                    active
                      ? "rounded-sm bg-canvas-alt px-3 py-3 text-base font-semibold text-ink"
                      : "rounded-sm px-3 py-3 text-base font-medium text-ink hover:bg-canvas-alt"
                  }
                  onClick={() => setMenuOpen(false)}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </header>
  );
}

function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      {open ? (
        <path
          d="M5 5l10 10M15 5L5 15"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      ) : (
        <path
          d="M3 6h14M3 10h14M3 14h14"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}
