import { describe, expect, test } from "bun:test";
import { parseOptions } from "./config.js";
import { BalanceFetchError, BalanceKeyMissingError } from "./providers.js";
import { buildCommandBindings, classifyRefreshError } from "./tui.js";

describe("classifyRefreshError", () => {
    test("key-missing hides cached balances (with snapshot)", () => {
        expect(
            classifyRefreshError(
                new BalanceKeyMissingError("DeepSeek", "DEEPSEEK_API_KEY"),
                true,
            ),
        ).toEqual({
            error: "key-missing",
            stale: false,
        });
    });

    test("key-missing hides balances even without a snapshot", () => {
        expect(
            classifyRefreshError(
                new BalanceKeyMissingError("DeepSeek", "DEEPSEEK_API_KEY"),
                false,
            ),
        ).toEqual({
            error: "key-missing",
            stale: false,
        });
    });

    test("fetch error with cached snapshot keeps it shown as stale", () => {
        expect(
            classifyRefreshError(new BalanceFetchError("network error"), true),
        ).toEqual({
            error: null,
            stale: true,
        });
    });

    test("fetch error without snapshot reports fetch-failed", () => {
        expect(
            classifyRefreshError(new BalanceFetchError("network error"), false),
        ).toEqual({
            error: "fetch-failed",
            stale: false,
        });
    });

    test("unexpected errors stay neutral and do not mark stale", () => {
        expect(classifyRefreshError(new Error("boom"), true)).toEqual({
            error: null,
            stale: false,
        });
    });
});

describe("buildCommandBindings", () => {
    const DEFAULT_TOGGLE = {
        key: "<leader>shift+b",
        cmd: "balance.toggle",
        desc: "Toggle balance panel",
        mode: "base" as const,
    };
    const REFRESH = {
        key: "ctrl+r",
        cmd: "balance.refresh",
        desc: "Refresh balance",
        mode: "base" as const,
    };

    test("defaults bind only the toggle to leader+shift+b", () => {
        expect(buildCommandBindings(parseOptions({}))).toEqual([
            DEFAULT_TOGGLE,
        ]);
    });

    test("keybind override binds the toggle to the given key", () => {
        expect(
            buildCommandBindings(parseOptions({ keybind: "ctrl+b" })),
        ).toEqual([{ ...DEFAULT_TOGGLE, key: "ctrl+b" }]);
    });

    test('keybind "none" disables the toggle binding', () => {
        expect(buildCommandBindings(parseOptions({ keybind: "none" }))).toEqual(
            [],
        );
    });

    test("refreshKeybind adds a refresh binding alongside the default toggle", () => {
        expect(
            buildCommandBindings(parseOptions({ refreshKeybind: "ctrl+r" })),
        ).toEqual([DEFAULT_TOGGLE, REFRESH]);
    });

    test('refreshKeybind "none" keeps only the default toggle', () => {
        expect(
            buildCommandBindings(parseOptions({ refreshKeybind: "none" })),
        ).toEqual([DEFAULT_TOGGLE]);
    });

    test("both overrides produce both bindings", () => {
        expect(
            buildCommandBindings(
                parseOptions({ keybind: "ctrl+b", refreshKeybind: "ctrl+r" }),
            ),
        ).toEqual([{ ...DEFAULT_TOGGLE, key: "ctrl+b" }, REFRESH]);
    });
});
