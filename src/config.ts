import type { BalanceCurrency } from "./providers.js";

export type BalancePluginOptions = {
  threshold?: number;
  currency?: string;
  refreshIntervalMinutes?: number;
  fields?: "total" | "split";
  providers?: string[] | string;
  keybind?: string;
  refreshKeybind?: string;
};

export type NormalizedOptions = {
  threshold: number | null;
  currency: string | null;
  refreshIntervalMs: number;
  fields: "total" | "split";
  providers: string[];
  keybind: string | null;
  refreshKeybind: string | null;
};

const DEFAULT_REFRESH_INTERVAL_MINUTES = 15;

/**
 * Parse a keybind option: undefined/non-string → null; string → trimmed;
 * trimmed-empty → null. `"none"` passes through as the literal string (the
 * caller treats it as "binding disabled").
 */
function parseKeybindOption(raw: unknown): string | null {
  return typeof raw === "string" && raw.trim() !== "" ? raw.trim() : null;
}

/**
 * Parse raw plugin options (the second tuple element in tui.json's plugin
 * entry) into a fully-normalized shape. Invalid values fall back to defaults;
 * every field is optional, so `undefined` yields all defaults.
 */
export function parseOptions(raw: Record<string, unknown> | undefined): NormalizedOptions {
  const rawInterval = raw?.refreshIntervalMinutes;
  const intervalMinutes =
    typeof rawInterval === "number" && Number.isFinite(rawInterval) && rawInterval >= 1
      ? Math.min(1440, Math.round(rawInterval))
      : DEFAULT_REFRESH_INTERVAL_MINUTES;

  const rawThreshold = raw?.threshold;
  const threshold =
    typeof rawThreshold === "number" && Number.isFinite(rawThreshold) ? rawThreshold : null;

  const rawCurrency = raw?.currency;
  const currency =
    typeof rawCurrency === "string" && rawCurrency.trim() !== "" ? rawCurrency : null;

  const rawFields = raw?.fields;
  const fields = rawFields === "split" ? "split" : "total";

  // undefined/empty string → []; string → [trimmed] if non-empty else [];
  // array → keep string items, trim, drop empties, dedupe; anything else → [].
  const rawProviders = raw?.providers;
  let providers: string[];
  if (typeof rawProviders === "string") {
    providers = rawProviders.trim() === "" ? [] : [rawProviders.trim()];
  } else if (Array.isArray(rawProviders)) {
    providers = [
      ...new Set(
        rawProviders
          .filter((p): p is string => typeof p === "string")
          .map((p) => p.trim())
          .filter((p) => p !== ""),
      ),
    ];
  } else {
    providers = [];
  }

  return {
    threshold,
    currency,
    refreshIntervalMs: Math.round(intervalMinutes * 60_000),
    fields,
    providers,
    keybind: parseKeybindOption(raw?.keybind),
    refreshKeybind: parseKeybindOption(raw?.refreshKeybind),
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
