import Link from "next/link";
import { DreamITLogo } from "@/components/brand/dreamit-logo";
import { getT } from "@/i18n/server";

export async function SiteFooter({ cities }: { cities: { id: string; name: string; slug: string }[] }) {
  const { t } = await getT();
  const cityLinks = cities.slice(0, 8).map((c) => ({ href: `/${c.slug}`, label: c.name }));

  return (
    <footer className="mt-auto border-t border-border bg-canvas-alt">
      <div className="mx-auto grid max-w-(--breakpoint-xl) gap-10 px-4 py-16 text-sm sm:px-6 sm:grid-cols-3 lg:px-10">
        <div>
          <Link href="/" aria-label="DreamIT home" className="inline-block">
            <DreamITLogo />
          </Link>
          <p className="mt-3 max-w-xs text-ink-secondary">{t("footer.tagline")}</p>
        </div>

        <div>
          <p className="font-medium text-ink">{t("footer.cities")}</p>
          <ul className="mt-3 space-y-2">
            {cityLinks.length === 0 && (
              <li>
                <Link href="/locations" className="text-ink-secondary hover:text-ink">
                  {t("nav.allLocations")}
                </Link>
              </li>
            )}
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
          <p className="font-medium text-ink">{t("footer.company")}</p>
          <ul className="mt-3 space-y-2">
            <li>
              <Link href="/about" className="text-ink-secondary hover:text-ink">
                {t("footer.about")}
              </Link>
            </li>
            <li>
              <Link href="/contact" className="text-ink-secondary hover:text-ink">
                {t("footer.contact")}
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-border px-4 py-6 text-xs text-ink-tertiary sm:px-6 lg:px-10">
        {t("footer.copyright", { year: new Date().getFullYear() })}
      </div>
    </footer>
  );
}
