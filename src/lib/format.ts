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

export function formatArea(value: number, unit: string) {
  return `${new Intl.NumberFormat("en").format(value)} ${AREA_UNIT_LABEL[unit] ?? unit.toLowerCase()}`;
}

export function formatListingType(listingType: "SALE" | "RENT", rentPeriod?: string | null) {
  if (listingType === "SALE") return "For sale";
  return rentPeriod === "YEARLY" ? "For rent · yearly" : "For rent · monthly";
}
