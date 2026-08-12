import { afterEach, describe, expect, mock, test } from "bun:test";
import {
  BalanceFetchError,
  BalanceKeyMissingError,
  DeepSeekProvider,
} from "./providers.js";

const API_KEY = "test-key-123";
const ORIGINAL_KEY = process.env.DEEPSEEK_API_KEY;
const ORIGINAL_FETCH = globalThis.fetch;

afterEach(() => {
  if (ORIGINAL_KEY === undefined) {
    delete process.env.DEEPSEEK_API_KEY;
  } else {
    process.env.DEEPSEEK_API_KEY = ORIGINAL_KEY;
  }
  globalThis.fetch = ORIGINAL_FETCH;
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("DeepSeekProvider.fetchBalance", () => {
  test("throws BalanceKeyMissingError when DEEPSEEK_API_KEY is unset", async () => {
    delete process.env.DEEPSEEK_API_KEY;

    await expect(new DeepSeekProvider().fetchBalance()).rejects.toBeInstanceOf(
      BalanceKeyMissingError,
    );
  });

  test("mentions the env var in the missing-key error", async () => {
    delete process.env.DEEPSEEK_API_KEY;

    const error = await new DeepSeekProvider()
      .fetchBalance()
      .catch((e: unknown) => e);
    expect((error as Error).message).toContain("DEEPSEEK_API_KEY");
  });

  test("parses balance strings into numbers and sends the Bearer auth header", async () => {
    process.env.DEEPSEEK_API_KEY = API_KEY;
    const fetchMock = mock(async (_input: RequestInfo | URL, _init?: RequestInit) =>
      jsonResponse({
        is_available: true,
        balance_infos: [
          {
            currency: "CNY",
            total_balance: "110.00",
            granted_balance: "10.00",
            topped_up_balance: "100.00",
          },
        ],
      }),
    );
    globalThis.fetch = fetchMock;

    const snapshot = await new DeepSeekProvider().fetchBalance();

    expect(snapshot.provider).toBe("deepseek");
    expect(snapshot.isAvailable).toBe(true);
    expect(snapshot.balances).toHaveLength(1);
    expect(snapshot.balances[0]).toEqual({
      currency: "CNY",
      totalBalance: 110,
      grantedBalance: 10,
      toppedUpBalance: 100,
    });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.deepseek.com/user/balance");
    expect(init.headers).toEqual({
      Authorization: `Bearer ${API_KEY}`,
      Accept: "application/json",
    });
  });

  test("throws BalanceFetchError when the network request fails", async () => {
    process.env.DEEPSEEK_API_KEY = API_KEY;
    globalThis.fetch = mock(() => Promise.reject(new Error("connection refused")));

    const error = await new DeepSeekProvider()
      .fetchBalance()
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(BalanceFetchError);
  });

  test("throws BalanceFetchError on HTTP error status without leaking the API key", async () => {
    process.env.DEEPSEEK_API_KEY = API_KEY;
    globalThis.fetch = mock(async () => jsonResponse({ error: "unauthorized" }, 401));

    const error = await new DeepSeekProvider()
      .fetchBalance()
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(BalanceFetchError);
    expect((error as Error).message).toContain("401");
    expect((error as Error).message).not.toContain(API_KEY);
  });

  test("returns an empty balances array when balance_infos is absent", async () => {
    process.env.DEEPSEEK_API_KEY = API_KEY;
    globalThis.fetch = mock(async () => jsonResponse({ is_available: true }));

    const snapshot = await new DeepSeekProvider().fetchBalance();

    expect(snapshot.isAvailable).toBe(true);
    expect(snapshot.balances).toEqual([]);
  });
});
