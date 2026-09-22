import Link from "next/link";

const cityLinks = [{ href: "/lucknow", label: "Lucknow" }];

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border bg-canvas-alt">
      <div className="mx-auto grid max-w-(--breakpoint-xl) gap-10 px-4 py-16 text-sm sm:px-6 sm:grid-cols-3 lg:px-10">
        <div>
          <p className="font-display text-base font-medium text-ink">
            Curated Properties
          </p>
          <p className="mt-3 max-w-xs text-ink-secondary">
            Homes we&apos;ve seen, shortlisted, and are ready to talk you through.
          </p>
        </div>

        <div>
          <p className="font-medium text-ink">Cities</p>
          <ul className="mt-3 space-y-2">
            {cityLinks.map((city) => (
              <li key={city.href}>
                <Link href={city.href} className="text-ink-secondary hover:text-ink">
                  {city.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="font-medium text-ink">Company</p>
          <ul className="mt-3 space-y-2">
            <li>
              <Link href="/about" className="text-ink-secondary hover:text-ink">
                About
              </Link>
            </li>
            <li>
              <Link href="/contact" className="text-ink-secondary hover:text-ink">
                Contact
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-border px-4 py-6 text-xs text-ink-tertiary sm:px-6 lg:px-10">
        © {new Date().getFullYear()} Curated Properties. All rights reserved.
      </div>
    </footer>
  );
}
