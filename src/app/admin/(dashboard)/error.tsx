"use client";

export default function AdminError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
      <h1 className="font-display text-xl font-medium text-ink">Something went wrong</h1>
      <p className="max-w-sm text-sm text-ink-secondary">
        The action didn&apos;t complete. Try again, or refresh the page.
      </p>
      <button
        type="button"
        onClick={reset}
        className="rounded-sm border border-border-strong px-4 py-2 text-sm font-medium text-ink hover:bg-canvas-alt"
      >
        Try again
      </button>
    </div>
  );
}
