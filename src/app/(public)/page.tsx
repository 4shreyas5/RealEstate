import Link from "next/link";
import { DiscoverySearch } from "@/components/home/discovery-search";
import { HeroCarousel } from "@/components/home/hero-carousel";
import { EditorialImageCard } from "@/components/shared/editorial-image-card";
import { ContactActionsRow } from "@/components/shared/contact-actions";
import { PropertyGrid } from "@/components/property/property-grid";
import { getFeaturedProperties, getRecentProperties } from "@/lib/properties";
import {
  getAllCategories,
  getAllCities,
  getCitiesWithListings,
  getExploreCategories,
  getExploreLocations,
  getPrimaryCity,
} from "@/lib/taxonomy";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [featured, listedCities, categories, exploreLocations, exploreCategories] = await Promise.all([
    getFeaturedProperties(6),
    getCitiesWithListings(),
    getAllCategories(),
    getExploreLocations(4),
    getExploreCategories(4),
  ]);

  const recent = await getRecentProperties(6, featured.map((p) => p.id));
  const primaryCity = await getPrimaryCity(listedCities);
  // Search offers the cities that actually have listings; if none do yet, every city.
  const searchCities = listedCities.length > 0 ? listedCities : await getAllCities();

  return (
    <div>
      {/* Discovery hero — brand, slogan, Buy/Rent choice, then search */}
      <section className="relative flex min-h-[480px] items-end overflow-hidden bg-gradient-to-br from-ink to-accent/40 text-canvas sm:min-h-[600px]">
        <HeroCarousel>
          <div className="relative mx-auto w-full max-w-(--breakpoint-xl) px-4 pb-16 sm:px-6 lg:px-10">
            <h1 className="font-display max-w-xl text-4xl font-light [text-shadow:0_2px_20px_rgba(28,27,25,0.5)] sm:text-6xl">
              Your perfect home is our goal.
            </h1>
            <p className="mt-4 max-w-md text-canvas/80 [text-shadow:0_1px_12px_rgba(28,27,25,0.5)]">
              Considered homes in {primaryCity?.name ?? "your city"} — seen,
              shortlisted, and photographed by our own team.
            </p>

            <div className="mt-8 grid max-w-md grid-cols-2 gap-4">
              <Link
                href="/buy"
                className="rounded-md border border-canvas/40 bg-ink/40 p-5 transition-colors hover:bg-ink/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-canvas"
              >
                <span className="font-display block text-2xl font-medium text-canvas">Buy</span>
                <span className="mt-1 block text-sm text-canvas/75">
                  Find a property to purchase
                </span>
              </Link>
              <Link
                href="/rent"
                className="rounded-md border border-canvas/40 bg-ink/40 p-5 transition-colors hover:bg-ink/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-canvas"
              >
                <span className="font-display block text-2xl font-medium text-canvas">Rent</span>
                <span className="mt-1 block text-sm text-canvas/75">
                  Find a property to rent
                </span>
              </Link>
            </div>

            <div className="mt-8">
              <DiscoverySearch
                cities={searchCities}
                categories={categories}
                defaultCityId={primaryCity?.id}
              />
            </div>
          </div>
        </HeroCarousel>
      </section>

      {/* Featured/curated properties */}
      {featured.length > 0 && (
        <section className="mx-auto max-w-(--breakpoint-xl) px-4 py-24 sm:px-6 lg:px-10">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="font-display text-3xl font-medium text-ink">This week&apos;s picks</h2>
              <p className="mt-2 text-ink-secondary">Hand-picked by our team.</p>
            </div>
            <Link href="/search" className="hidden text-sm font-medium text-accent sm:block">
              View all
            </Link>
          </div>
          <div className="mt-10">
            <PropertyGrid properties={featured} priorityCount={3} />
          </div>
        </section>
      )}

      {/* Explore locations */}
      {exploreLocations.length > 0 && (
        <section className="bg-canvas-alt py-24">
          <div className="mx-auto max-w-(--breakpoint-xl) px-4 sm:px-6 lg:px-10">
            <h2 className="font-display text-3xl font-medium text-ink">Explore locations</h2>
            <div className="mt-10 flex gap-4 overflow-x-auto pb-2 lg:grid lg:grid-cols-4 lg:overflow-visible">
              {exploreLocations.map((locality) => (
                <EditorialImageCard
                  key={locality.id}
                  href={`/${locality.citySlug}/${locality.slug}`}
                  label={locality.name}
                  imageUrl={locality.imageUrl}
                  imageAlt={`${locality.name}, ${locality.cityName}`}
                  className="w-48 lg:w-auto"
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Property categories */}
      {exploreCategories.length > 0 && (
        <section className="mx-auto max-w-(--breakpoint-xl) px-4 py-24 sm:px-6 lg:px-10">
          <h2 className="font-display text-3xl font-medium text-ink">Explore by category</h2>
          <div className="mt-10 flex gap-4 overflow-x-auto pb-2 lg:grid lg:grid-cols-4 lg:overflow-visible">
            {exploreCategories.map((category) => (
              <EditorialImageCard
                key={category.id}
                href={`/${primaryCity?.slug ?? ""}/${category.slug}`}
                label={category.name}
                imageUrl={category.imageUrl}
                imageAlt={category.name}
                className="w-48 lg:w-auto"
              />
            ))}
          </div>
        </section>
      )}

      {/* Map-based discovery teaser */}
      <section className="bg-canvas-alt py-24">
        <div className="mx-auto flex max-w-(--breakpoint-xl) flex-col items-center gap-6 px-4 text-center sm:px-6 lg:px-10">
          <div
            aria-hidden="true"
            className="h-40 w-full max-w-md rounded-md border border-border-strong bg-[radial-gradient(var(--color-border-strong)_1px,transparent_1px)] [background-size:16px_16px]"
          />
          <h2 className="font-display text-2xl font-medium text-ink">
            See where every home sits
          </h2>
          <p className="max-w-md text-ink-secondary">
            Browse the map to understand a neighbourhood before you visit —
            every pin is a home our team has actually seen.
          </p>
          <Link
            href="/search"
            className="rounded-sm border border-border-strong px-5 py-2.5 text-sm font-medium text-ink hover:bg-surface"
          >
            Explore on map
          </Link>
        </div>
      </section>

      {/* Additional / recently added properties */}
      {recent.length > 0 && (
        <section className="mx-auto max-w-(--breakpoint-xl) px-4 py-24 sm:px-6 lg:px-10">
          <h2 className="font-display text-3xl font-medium text-ink">More homes to consider</h2>
          <div className="mt-10">
            <PropertyGrid properties={recent} />
          </div>
          <div className="mt-10 text-center">
            <Link
              href="/search"
              className="rounded-sm border border-border-strong px-6 py-2.5 text-sm font-medium text-ink hover:bg-canvas-alt"
            >
              Show more
            </Link>
          </div>
        </section>
      )}

      {/* Trust / company context */}
      <section className="border-t border-border py-20">
        <div className="mx-auto max-w-(--breakpoint-xl) px-4 sm:px-6 lg:px-10">
          <p className="font-display max-w-2xl text-xl text-ink">
            We don&apos;t list every property in {primaryCity?.name ?? "the city"} — only
            the ones our own team has visited, photographed, and would
            recommend to a friend.
          </p>
          <p className="mt-4 max-w-xl text-sm text-ink-secondary">
            No open listings, no agent submissions. Every home on this site
            was added by our team, kept current, and taken down the day it&apos;s
            no longer available.
          </p>
        </div>
      </section>

      {/* Contact */}
      <section className="bg-canvas-alt py-20">
        <div className="mx-auto max-w-(--breakpoint-xl) px-4 text-center sm:px-6 lg:px-10">
          <h2 className="font-display text-2xl font-medium text-ink">
            Haven&apos;t found the right home yet?
          </h2>
          <p className="mt-2 text-ink-secondary">Tell us what you&apos;re looking for.</p>
          <div className="mt-6 flex justify-center">
            <ContactActionsRow context={{ source: "homepage_contact_section" }} />
          </div>
        </div>
      </section>
    </div>
  );
}
