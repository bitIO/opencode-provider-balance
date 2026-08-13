import { describe, expect, test } from "bun:test";
import { isLowBalance, parseOptions } from "./config.js";
import type { BalanceCurrency } from "./providers.js";

const cny: BalanceCurrency = {
    currency: "CNY",
    totalBalance: 10,
    grantedBalance: 0,
    toppedUpBalance: 10,
};
const usd: BalanceCurrency = {
    currency: "USD",
    totalBalance: 100,
    grantedBalance: 0,
    toppedUpBalance: 100,
};
const balances = [cny, usd];

const DEFAULTS = {
    threshold: null,
    currency: null,
    refreshIntervalMs: 900_000,
    fields: "total" as const,
    providers: [] as string[],
    keybind: null,
    refreshKeybind: null,
};

describe("parseOptions", () => {
    test("returns defaults for undefined input", () => {
        expect(parseOptions(undefined)).toEqual(DEFAULTS);
    });

    test("returns defaults for an empty options object", () => {
        expect(parseOptions({})).toEqual(DEFAULTS);
    });

    test("falls back to the default interval for invalid values", () => {
        const invalid = [
            { refreshIntervalMinutes: 0 },
            { refreshIntervalMinutes: -5 },
            { refreshIntervalMinutes: "abc" },
        ];
        for (const raw of invalid) {
            expect(parseOptions(raw).refreshIntervalMs).toBe(900_000);
        }
    });

    test("converts a valid interval to milliseconds", () => {
        expect(
            parseOptions({ refreshIntervalMinutes: 30 }).refreshIntervalMs,
        ).toBe(1_800_000);
    });

    test("clamps oversized intervals to 24 hours (1440 minutes)", () => {
        expect(
            parseOptions({ refreshIntervalMinutes: 1_000_000 })
                .refreshIntervalMs,
        ).toBe(86_400_000);
    });

    test("rounds fractional intervals to whole minutes", () => {
        expect(
            parseOptions({ refreshIntervalMinutes: 1.6 }).refreshIntervalMs,
        ).toBe(120_000);
    });

    test("treats sub-minute intervals as invalid and falls back to the default", () => {
        expect(
            parseOptions({ refreshIntervalMinutes: 0.5 }).refreshIntervalMs,
        ).toBe(900_000);
    });

    test("keeps a numeric threshold and rejects non-numeric or NaN thresholds", () => {
        expect(parseOptions({ threshold: 50 }).threshold).toBe(50);
        expect(parseOptions({ threshold: "x" }).threshold).toBeNull();
        expect(parseOptions({ threshold: NaN }).threshold).toBeNull();
    });

    test("accepts only the split field value and falls back to total", () => {
        expect(parseOptions({ fields: "split" }).fields).toBe("split");
        expect(parseOptions({ fields: "total" }).fields).toBe("total");
        expect(parseOptions({ fields: "bogus" }).fields).toBe("total");
    });

    test("defaults providers to []", () => {
        expect(parseOptions({}).providers).toEqual([]);
    });

    test("accepts a single provider id as a string", () => {
        expect(parseOptions({ providers: "deepseek" }).providers).toEqual([
            "deepseek",
        ]);
    });

    test("treats an empty or whitespace-only provider string as []", () => {
        expect(parseOptions({ providers: "" }).providers).toEqual([]);
        expect(parseOptions({ providers: "   " }).providers).toEqual([]);
    });

    test("normalizes an array of provider ids: trims, drops empties, dedupes", () => {
        expect(
            parseOptions({
                providers: [" deepseek ", "openai", "", "deepseek"],
            }).providers,
        ).toEqual(["deepseek", "openai"]);
    });

    test("drops non-string array items and rejects other provider types", () => {
        expect(parseOptions({ providers: [42, "deepseek"] }).providers).toEqual(
            ["deepseek"],
        );
        expect(parseOptions({ providers: 42 }).providers).toEqual([]);
    });

    test("defaults keybind and refreshKeybind to null", () => {
        expect(parseOptions({}).keybind).toBeNull();
        expect(parseOptions({}).refreshKeybind).toBeNull();
    });

    test("passes keybind strings through trimmed", () => {
        expect(parseOptions({ keybind: "ctrl+b" }).keybind).toBe("ctrl+b");
        expect(parseOptions({ keybind: "  <leader>shift+b  " }).keybind).toBe(
            "<leader>shift+b",
        );
    });

    test("treats empty or non-string keybinds as null", () => {
        expect(parseOptions({ keybind: "" }).keybind).toBeNull();
        expect(parseOptions({ keybind: "   " }).keybind).toBeNull();
        expect(parseOptions({ keybind: 42 }).keybind).toBeNull();
        expect(parseOptions({ refreshKeybind: 42 }).refreshKeybind).toBeNull();
    });

    test('preserves the literal "none" sentinel for keybinds', () => {
        expect(parseOptions({ keybind: "none" }).keybind).toBe("none");
        expect(parseOptions({ refreshKeybind: "none" }).refreshKeybind).toBe(
            "none",
        );
    });
});

describe("isLowBalance", () => {
    test("returns currencies strictly below the threshold", () => {
        expect(isLowBalance(balances, parseOptions({ threshold: 50 }))).toEqual(
            [cny],
        );
    });

    test("returns [] when the threshold is null", () => {
        expect(isLowBalance(balances, parseOptions({}))).toEqual([]);
    });

    test("considers only the configured currency", () => {
        expect(
            isLowBalance(
                balances,
                parseOptions({ threshold: 50, currency: "USD" }),
            ),
        ).toEqual([]);
        expect(
            isLowBalance(
                balances,
                parseOptions({ threshold: 50, currency: "CNY" }),
            ),
        ).toEqual([cny]);
    });

    test("returns [] when the configured currency is absent from the snapshot", () => {
        expect(
            isLowBalance(
                balances,
                parseOptions({ threshold: 50, currency: "EUR" }),
            ),
        ).toEqual([]);
    });

    test("does not flag a balance exactly equal to the threshold", () => {
        expect(isLowBalance([cny], parseOptions({ threshold: 10 }))).toEqual(
            [],
        );
    });
});
