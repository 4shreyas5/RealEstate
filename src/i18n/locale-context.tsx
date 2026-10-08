"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { Locale } from "./config";
import type { Dictionary } from "./dictionaries";
import { createTranslator, type Translator } from "./translate";

const LocaleContext = createContext<{ locale: Locale; t: Translator } | null>(null);

/** Hydrates client components with the locale+dictionary the server already
 * resolved — no client-side fetch, no flash of the wrong language. */
export function LocaleProvider({
  locale,
  dict,
  children,
}: {
  locale: Locale;
  dict: Dictionary;
  children: ReactNode;
}) {
  const value = useMemo(() => ({ locale, t: createTranslator(dict) }), [locale, dict]);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useT() {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error("useT() must be used within a <LocaleProvider> (src/app/(public)/layout.tsx)");
  }
  return ctx;
}
