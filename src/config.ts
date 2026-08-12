import type { BalanceCurrency } from "./providers.js";

export type BalancePluginOptions = {
  threshold?: number;
  currency?: string;
  refreshIntervalMinutes?: number;
  fields?: "total" | "split";
};

export type NormalizedOptions = {
  threshold: number | null;
  currency: string | null;
  refreshIntervalMs: number;
  fields: "total" | "split";
};

const DEFAULT_REFRESH_INTERVAL_MINUTES = 15;

/**
 * Parse raw plugin options (the second tuple element in tui.json's plugin
 * entry) into a fully-normalized shape. Invalid values fall back to defaults;
 * every field is optional, so `undefined` yields all defaults.
 */
export function parseOptions(raw: Record<string, unknown> | undefined): NormalizedOptions {
  const rawInterval = raw?.refreshIntervalMinutes;
  const intervalMinutes =
    typeof rawInterval === "number" && Number.isFinite(rawInterval) && rawInterval >= 1
      ? rawInterval
      : DEFAULT_REFRESH_INTERVAL_MINUTES;

  const rawThreshold = raw?.threshold;
  const threshold =
    typeof rawThreshold === "number" && Number.isFinite(rawThreshold) ? rawThreshold : null;

  const rawCurrency = raw?.currency;
  const currency =
    typeof rawCurrency === "string" && rawCurrency.trim() !== "" ? rawCurrency : null;

  const rawFields = raw?.fields;
  const fields = rawFields === "split" ? "split" : "total";

  return {
    threshold,
    currency,
    refreshIntervalMs: Math.round(intervalMinutes * 60_000),
    fields,
  };
}

/**
 * Currencies whose `totalBalance` is strictly below `options.threshold`.
 * Returns [] when threshold is null. When `options.currency` is set, only that
 * currency is considered (if present in the snapshot).
 */
export function isLowBalance(
  balances: BalanceCurrency[],
  options: NormalizedOptions,
): BalanceCurrency[] {
  const threshold = options.threshold;
  if (threshold === null) {
    return [];
  }
  const candidates = options.currency
    ? balances.filter((b) => b.currency === options.currency)
    : balances;
  return candidates.filter((b) => b.totalBalance < threshold);
}
