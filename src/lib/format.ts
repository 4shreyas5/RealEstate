import type { Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";

const AREA_UNIT_LABEL: Record<string, string> = {
  SQFT: "sq ft",
  SQM: "sq m",
  ACRE: "acre",
  HECTARE: "ha",
  MARLA: "marla",
  KANAL: "kanal",
};

export function formatPrice(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString()}`;
  }
}

/** Numbers are never localized to Hindi digits (standard practice on Indian
 * real-estate sites — only the unit word changes); `locale` only picks the
 * unit label, defaulting to English so admin callers are unaffected. */
export function formatArea(value: number, unit: string, locale: Locale = "en") {
  const localizedUnits: Record<string, string> = getDictionary(locale).property.areaUnit;
  const label = localizedUnits[unit] ?? AREA_UNIT_LABEL[unit] ?? unit.toLowerCase();
  return `${new Intl.NumberFormat("en").format(value)} ${label}`;
}

export function formatListingType(
  listingType: "SALE" | "RENT",
  rentPeriod?: string | null,
  locale: Locale = "en",
) {
  const dict = getDictionary(locale);
  if (listingType === "SALE") return dict.property.forSaleLabel;
  return rentPeriod === "YEARLY" ? dict.property.forRentYearly : dict.property.forRentMonthly;
}
