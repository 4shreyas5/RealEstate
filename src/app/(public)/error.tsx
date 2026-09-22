"use client";

export default function PublicError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="font-display text-2xl font-medium text-ink">Something went wrong</h1>
      <p className="max-w-sm text-ink-secondary">
        Please try again — if this keeps happening, get in touch with our team.
      </p>
      <button
        type="button"
        onClick={reset}
        className="rounded-sm border border-border-strong px-5 py-2.5 text-sm font-medium text-ink hover:bg-canvas-alt"
      >
        Try again
      </button>
    </div>
  );
}
