"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LOCALE_COOKIE, locales, nativeLanguageName, type Locale } from "@/i18n/config";
import { useT } from "@/i18n/locale-context";

const ONE_YEAR = 60 * 60 * 24 * 365;

/** Persists the choice as a cookie (readable on the server, unlike
 * localStorage) and refreshes — the URL never changes, so whatever page,
 * filters or query params the visitor is on survive automatically. */
function useSwitchLocale() {
  const router = useRouter();
  return (locale: Locale) => {
    document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=${ONE_YEAR}; samesite=lax`;
    router.refresh();
  };
}

/** Desktop: a compact "EN ▾" trigger next to Contact us, opening a small
 * native-language-name menu. No flags, no large buttons. */
export function LanguageSwitcherDesktop() {
  const { locale, t } = useT();
  const switchLocale = useSwitchLocale();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative hidden lg:block">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={t("language.switcherLabel")}
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 rounded-sm px-2.5 py-2 text-sm font-medium text-ink hover:bg-canvas-alt"
      >
        {locale.toUpperCase()}
        <svg width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <path d="M3.5 5.25L7 8.75l3.5-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-36 overflow-hidden rounded-md border border-border bg-surface py-1 shadow-md">
          {locales.map((code) => (
            <button
              key={code}
              type="button"
              onClick={() => {
                setOpen(false);
                if (code !== locale) switchLocale(code);
              }}
              aria-current={code === locale ? "true" : undefined}
              className={
                code === locale
                  ? "block w-full px-3 py-2 text-left text-sm font-semibold text-ink"
                  : "block w-full px-3 py-2 text-left text-sm text-ink-secondary hover:bg-canvas-alt hover:text-ink"
              }
            >
              {nativeLanguageName(code)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Mobile: a plain two-option row inside the existing mobile nav sheet — no
 * separate language bar, same list styling as the nav links around it. */
export function LanguageSwitcherMobile({ onSelect }: { onSelect?: () => void }) {
  const { locale, t } = useT();
  const switchLocale = useSwitchLocale();

  return (
    <div className="mt-2 border-t border-border pt-4">
      <p className="px-3 text-xs font-medium tracking-wide text-ink-tertiary uppercase">
        {t("language.label")}
      </p>
      <div className="mt-1 flex flex-col gap-1">
        {locales.map((code) => (
          <button
            key={code}
            type="button"
            onClick={() => {
              onSelect?.();
              if (code !== locale) switchLocale(code);
            }}
            aria-current={code === locale ? "true" : undefined}
            className={
              code === locale
                ? "rounded-sm bg-canvas-alt px-3 py-3 text-left text-base font-semibold text-ink"
                : "rounded-sm px-3 py-3 text-left text-base font-medium text-ink hover:bg-canvas-alt"
            }
          >
            {nativeLanguageName(code)}
          </button>
        ))}
      </div>
    </div>
  );
}
