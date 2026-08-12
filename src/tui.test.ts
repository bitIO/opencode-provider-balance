import { describe, expect, test } from "bun:test";
import { BalanceFetchError, BalanceKeyMissingError } from "./providers.js";
import { classifyRefreshError } from "./tui.js";

describe("classifyRefreshError", () => {
  test("key-missing flags cached balances stale (with snapshot)", () => {
    expect(classifyRefreshError(new BalanceKeyMissingError("DeepSeek", "DEEPSEEK_API_KEY"), true)).toEqual({
      error: "key-missing",
      stale: true,
    });
  });

  test("key-missing flags stale even without a snapshot", () => {
    expect(classifyRefreshError(new BalanceKeyMissingError("DeepSeek", "DEEPSEEK_API_KEY"), false)).toEqual({
      error: "key-missing",
      stale: true,
    });
  });

  test("fetch error with cached snapshot keeps it shown as stale", () => {
    expect(classifyRefreshError(new BalanceFetchError("network error"), true)).toEqual({
      error: null,
      stale: true,
    });
  });

  test("fetch error without snapshot reports fetch-failed", () => {
    expect(classifyRefreshError(new BalanceFetchError("network error"), false)).toEqual({
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
