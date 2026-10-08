"use client";

import { useT } from "@/i18n/locale-context";

export default function PublicError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useT();
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="font-display text-2xl font-medium text-ink">{t("errors.somethingWentWrongHeading")}</h1>
      <p className="max-w-sm text-ink-secondary">{t("errors.somethingWentWrongBody")}</p>
      <button
        type="button"
        onClick={reset}
        className="rounded-sm border border-border-strong px-5 py-2.5 text-sm font-medium text-ink hover:bg-canvas-alt"
      >
        {t("errors.tryAgain")}
      </button>
    </div>
  );
}
