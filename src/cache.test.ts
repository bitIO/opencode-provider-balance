import { describe, expect, test } from "bun:test";
import { readSnapshot, writeSnapshot } from "./cache.js";
import type { BalanceSnapshot } from "./providers.js";

// Minimal in-memory TuiKV: get/set backed by a Map, ready as a boolean
// (matches the real TuiKV type; the tasks's Promise-typed sketch predates it).
function makeKv() {
    const store = new Map<string, unknown>();
    return {
        store,
        ready: true,
        get<Value = unknown>(key: string, fallback?: Value): Value {
            return store.has(key)
                ? (store.get(key) as Value)
                : (fallback as Value);
        },
        set(key: string, value: unknown): void {
            store.set(key, value);
        },
    };
}

describe("cache snapshot persistence", () => {
    const snapshot: BalanceSnapshot = {
        provider: "deepseek",
        fetchedAt: "2026-08-12T00:00:00.000Z",
        isAvailable: true,
        balances: [
            {
                currency: "CNY",
                totalBalance: 110,
                grantedBalance: 10,
                toppedUpBalance: 100,
            },
        ],
    };

    test("round-trips a snapshot through writeSnapshot and readSnapshot", () => {
        const kv = makeKv();

        writeSnapshot(kv, snapshot);

        expect(readSnapshot(kv, "deepseek")).toEqual(snapshot);
    });

    test("returns undefined when nothing is stored", () => {
        const kv = makeKv();

        expect(readSnapshot(kv, "deepseek")).toBeUndefined();
    });

    test("parses a snapshot stored as a JSON string", () => {
        const kv = makeKv();
        kv.store.set("balance:snapshot:deepseek", JSON.stringify(snapshot));

        expect(readSnapshot(kv, "deepseek")).toEqual(snapshot);
    });

    test("returns undefined for malformed stored values", () => {
        const kv = makeKv();
        const malformed: unknown[] = [
            42,
            "not json",
            "{broken",
            JSON.stringify({ provider: "deepseek" }),
            { provider: "deepseek" },
            { balances: [] },
            "42",
        ];

        for (const value of malformed) {
            kv.store.clear();
            kv.store.set("balance:snapshot:deepseek", value);
            expect(readSnapshot(kv, "deepseek")).toBeUndefined();
        }
    });

    test("uses exactly the balance:snapshot:<providerId> key", () => {
        const kv = makeKv();

        writeSnapshot(kv, snapshot);

        expect([...kv.store.keys()]).toEqual(["balance:snapshot:deepseek"]);
    });
});
