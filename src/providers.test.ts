import { afterEach, describe, expect, mock, test } from "bun:test";
import {
    BalanceFetchError,
    BalanceKeyMissingError,
    DeepSeekProvider,
    isDeepSeekPeakHour,
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

        await expect(
            new DeepSeekProvider().fetchBalance(),
        ).rejects.toBeInstanceOf(BalanceKeyMissingError);
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
        const fetchMock = mock(
            async (_input: RequestInfo | URL, _init?: RequestInit) =>
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
        globalThis.fetch = mock(() =>
            Promise.reject(new Error("connection refused")),
        );

        const error = await new DeepSeekProvider()
            .fetchBalance()
            .catch((e: unknown) => e);
        expect(error).toBeInstanceOf(BalanceFetchError);
    });

    test("throws BalanceFetchError on HTTP error status without leaking the API key", async () => {
        process.env.DEEPSEEK_API_KEY = API_KEY;
        globalThis.fetch = mock(async () =>
            jsonResponse({ error: "unauthorized" }, 401),
        );

        const error = await new DeepSeekProvider()
            .fetchBalance()
            .catch((e: unknown) => e);
        expect(error).toBeInstanceOf(BalanceFetchError);
        expect((error as Error).message).toContain("401");
        expect((error as Error).message).not.toContain(API_KEY);
    });

    test("throws BalanceFetchError with a timeout message when the request aborts", async () => {
        process.env.DEEPSEEK_API_KEY = API_KEY;
        globalThis.fetch = mock(() =>
            Promise.reject(new DOMException("aborted", "AbortError")),
        );

        const error = await new DeepSeekProvider()
            .fetchBalance()
            .catch((e: unknown) => e);
        expect(error).toBeInstanceOf(BalanceFetchError);
        expect((error as Error).message).toContain("timed out");
        expect((error as Error).message).not.toContain(API_KEY);
    });

    test("drops currency entries whose balance numbers are non-finite", async () => {
        process.env.DEEPSEEK_API_KEY = API_KEY;
        globalThis.fetch = mock(async () =>
            jsonResponse({
                is_available: true,
                balance_infos: [
                    {
                        currency: "CNY",
                        total_balance: "abc",
                        granted_balance: "10.00",
                        topped_up_balance: "100.00",
                    },
                    {
                        currency: "USD",
                        total_balance: "1.00",
                        granted_balance: "1.00",
                        topped_up_balance: "1.00",
                    },
                ],
            }),
        );

        const snapshot = await new DeepSeekProvider().fetchBalance();

        expect(snapshot.balances).toHaveLength(1);
        expect(snapshot.balances[0]).toEqual({
            currency: "USD",
            totalBalance: 1,
            grantedBalance: 1,
            toppedUpBalance: 1,
        });
    });

    test("returns an empty balances array when balance_infos is absent", async () => {
        process.env.DEEPSEEK_API_KEY = API_KEY;
        globalThis.fetch = mock(async () =>
            jsonResponse({ is_available: true }),
        );

        const snapshot = await new DeepSeekProvider().fetchBalance();

        expect(snapshot.isAvailable).toBe(true);
        expect(snapshot.balances).toEqual([]);
    });
});

describe("isDeepSeekPeakHour", () => {
    // 2026-01-05 is a Monday, 2026-01-03 a Saturday, 2026-01-04 a Sunday.
    const utc = (date: string, hour: number, minute = 0) =>
        new Date(
            `${date}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00Z`,
        );

    test("true inside the 01:00–04:00 weekday window", () => {
        expect(isDeepSeekPeakHour(utc("2026-01-05", 1))).toBe(true);
        expect(isDeepSeekPeakHour(utc("2026-01-05", 3, 59))).toBe(true);
    });

    test("false at 04:00 (window end is exclusive)", () => {
        expect(isDeepSeekPeakHour(utc("2026-01-05", 4))).toBe(false);
    });

    test("true inside the 06:00–10:00 weekday window", () => {
        expect(isDeepSeekPeakHour(utc("2026-01-05", 6))).toBe(true);
        expect(isDeepSeekPeakHour(utc("2026-01-05", 9, 59))).toBe(true);
    });

    test("false at 10:00 (window end is exclusive)", () => {
        expect(isDeepSeekPeakHour(utc("2026-01-05", 10))).toBe(false);
    });

    test("false for all other weekday hours", () => {
        expect(isDeepSeekPeakHour(utc("2026-01-06", 0))).toBe(false);
        expect(isDeepSeekPeakHour(utc("2026-01-06", 12))).toBe(false);
        expect(isDeepSeekPeakHour(utc("2026-01-06", 23, 59))).toBe(false);
    });

    test("false all weekend, even inside peak-hour ranges", () => {
        expect(isDeepSeekPeakHour(utc("2026-01-03", 2))).toBe(false);
        expect(isDeepSeekPeakHour(utc("2026-01-04", 6))).toBe(false);
        expect(isDeepSeekPeakHour(utc("2026-01-04", 9, 59))).toBe(false);
    });
});
