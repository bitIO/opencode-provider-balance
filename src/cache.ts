import type { TuiKV } from "@opencode-ai/plugin/tui";
import type { BalanceSnapshot } from "./providers.js";

const KEY_PREFIX = "balance:";

function snapshotKey(providerId: string): string {
  return `${KEY_PREFIX}snapshot:${providerId}`;
}

/**
 * Read the last-known snapshot for a provider from the KV store. Values may
 * come back as an object or a JSON string (opencode persists kv to
 * state/kv.json); both are accepted. Malformed or missing values return
 * undefined.
 */
export function readSnapshot(kv: TuiKV, providerId: string): BalanceSnapshot | undefined {
  const raw = kv.get(snapshotKey(providerId));
  if (typeof raw === "string") {
    try {
      return parseSnapshot(JSON.parse(raw));
    } catch {
      return undefined;
    }
  }
  return parseSnapshot(raw);
}

export function writeSnapshot(kv: TuiKV, snapshot: BalanceSnapshot): void {
  kv.set(snapshotKey(snapshot.provider), snapshot);
}

function parseSnapshot(value: unknown): BalanceSnapshot | undefined {
  if (typeof value !== "object" || value === null) {
    return undefined;
  }
  const candidate = value as Partial<BalanceSnapshot>;
  if (typeof candidate.provider !== "string" || !Array.isArray(candidate.balances)) {
    return undefined;
  }
  return candidate as BalanceSnapshot;
}
