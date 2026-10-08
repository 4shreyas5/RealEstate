import Link from "next/link";
import { getT } from "@/i18n/server";

export default async function PublicNotFound() {
  const { t } = await getT();
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="font-display text-2xl font-medium text-ink">{t("errors.pageNotFoundHeading")}</h1>
      <p className="max-w-sm text-ink-secondary">{t("errors.pageNotFoundBody")}</p>
      <Link
        href="/search"
        className="rounded-sm bg-accent px-5 py-2.5 text-sm font-medium text-canvas hover:bg-accent-hover"
      >
        {t("errors.browseProperties")}
      </Link>
    </div>
  );
}
