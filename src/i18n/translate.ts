import { defaultLocale } from "./config";
import { dictionaries, type Dictionary } from "./dictionaries";

type Vars = Record<string, string | number>;

function lookup(dict: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((node, segment) => {
    if (node && typeof node === "object" && segment in node) {
      return (node as Record<string, unknown>)[segment];
    }
    return undefined;
  }, dict);
}

function interpolate(template: string, vars?: Vars): string {
  if (!vars) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  );
}

/**
 * Dot-path translator with {{var}} interpolation and a simple two-form
 * plural convention (`key_one` / `key_other`, selected by `vars.count`).
 * Falls back to the English string, then to the raw key, and warns in dev
 * only — so a missing key is visible to developers without ever showing a
 * broken key to a visitor.
 */
export function createTranslator(dict: Dictionary) {
  return function t(key: string, vars?: Vars): string {
    const pluralKey =
      vars && typeof vars.count === "number" ? `${key}_${vars.count === 1 ? "one" : "other"}` : null;

    let value = pluralKey ? lookup(dict, pluralKey) : lookup(dict, key);
    if (typeof value !== "string" && pluralKey) value = lookup(dict, key);

    if (typeof value !== "string") {
      const fallback = dictionaries[defaultLocale];
      value = (pluralKey && lookup(fallback, pluralKey)) || lookup(fallback, key);
    }

    if (typeof value !== "string") {
      if (process.env.NODE_ENV !== "production") {
        console.warn(`[i18n] Missing translation key: "${key}"`);
      }
      return key;
    }

    return interpolate(value, vars);
  };
}

export type Translator = ReturnType<typeof createTranslator>;
