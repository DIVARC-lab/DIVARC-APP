import type { Currency } from "@/lib/database.types";

const FORMATTERS = new Map<string, Intl.NumberFormat>();

const LOCALE_BY_CURRENCY: Record<Currency, string> = {
  EUR: "fr-FR",
  XAF: "fr-CM",
  XOF: "fr-SN",
  MAD: "fr-MA",
  TND: "fr-TN",
  DZD: "fr-DZ",
  CAD: "fr-CA",
  CHF: "fr-CH",
};

const SYMBOLS: Record<Currency, string> = {
  EUR: "€",
  XAF: "FCFA",
  XOF: "FCFA",
  MAD: "DH",
  TND: "DT",
  DZD: "DA",
  CAD: "$",
  CHF: "CHF",
};

export function formatPrice(amount: number, currency: Currency): string {
  const key = `${currency}-${LOCALE_BY_CURRENCY[currency]}`;
  let formatter = FORMATTERS.get(key);
  if (!formatter) {
    try {
      formatter = new Intl.NumberFormat(LOCALE_BY_CURRENCY[currency], {
        style: "currency",
        currency,
        maximumFractionDigits: amount >= 1000 ? 0 : 2,
      });
      FORMATTERS.set(key, formatter);
    } catch {
      const symbol = SYMBOLS[currency];
      return `${amount.toLocaleString("fr-FR")} ${symbol}`;
    }
  }
  return formatter.format(amount);
}

export function getCurrencySymbol(currency: Currency): string {
  return SYMBOLS[currency];
}
