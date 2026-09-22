import Link from "next/link";

export default function PublicNotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="font-display text-2xl font-medium text-ink">We couldn&apos;t find that page</h1>
      <p className="max-w-sm text-ink-secondary">
        It may have moved, or the home you&apos;re looking for is no longer listed.
      </p>
      <Link
        href="/search"
        className="rounded-sm bg-accent px-5 py-2.5 text-sm font-medium text-canvas hover:bg-accent-hover"
      >
        Browse properties
      </Link>
    </div>
  );
}
