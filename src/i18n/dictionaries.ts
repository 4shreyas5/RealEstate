import en from "./messages/en.json";
import hi from "./messages/hi.json";
import type { Locale } from "./config";

export const dictionaries = { en, hi } satisfies Record<Locale, unknown>;

export type Dictionary = typeof en;

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] as Dictionary;
}
