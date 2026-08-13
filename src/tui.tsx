import type { TuiPluginModule } from "@opencode-ai/plugin/tui";
import { createSignal } from "solid-js";
import { readSnapshot, writeSnapshot } from "./cache.js";
import { type NormalizedOptions, parseOptions } from "./config.js";
import { BalancePanel } from "./panel.jsx";
import {
    BalanceFetchError,
    BalanceKeyMissingError,
    type BalanceSnapshot,
    getProviders,
} from "./providers.js";

const TOGGLE_COMMAND = "balance.toggle";
const REFRESH_COMMAND = "balance.refresh";

export type RefreshErrorState = "key-missing" | "fetch-failed" | null;

export type ProviderStatus = {
    snapshot?: BalanceSnapshot;
    stale: boolean;
    error: RefreshErrorState;
};

export type CommandBinding = {
    key: string;
    cmd: string;
    desc: string;
    mode: "base";
};

/**
 * Build the keymap bindings for the plugin's commands from normalized options.
 * null = plugin default; the literal "none" disables the binding. tui.json's
 * host `keybinds` only accepts built-in keybind names and silently drops
 * plugin commands, so overrides live in plugin options instead.
 */
export function buildCommandBindings(
    opts: NormalizedOptions,
): CommandBinding[] {
    const bindings: CommandBinding[] = [];
    const toggleKey = opts.keybind === null ? "<leader>shift+b" : opts.keybind;
    if (toggleKey !== "none") {
        bindings.push({
            key: toggleKey,
            cmd: TOGGLE_COMMAND,
            desc: "Toggle balance panel",
            mode: "base",
        });
    }
    if (opts.refreshKeybind !== null && opts.refreshKeybind !== "none") {
        bindings.push({
            key: opts.refreshKeybind,
            cmd: REFRESH_COMMAND,
            desc: "Refresh balance",
            mode: "base",
        });
    }
    return bindings;
}

/**
 * Pure decision for how a refresh failure should surface in the panel.
 * key-missing hides all balance display, so nothing is flagged stale.
 */
export function classifyRefreshError(
    error: unknown,
    hasSnapshot: boolean,
): { error: RefreshErrorState; stale: boolean } {
    if (error instanceof BalanceKeyMissingError) {
        return { error: "key-missing", stale: false };
    }
    if (error instanceof BalanceFetchError) {
        return hasSnapshot
            ? { error: null, stale: true }
            : { error: "fetch-failed", stale: false };
    }
    // Unexpected errors must never crash the refresh loop; log and stay put.
    console.error("[balance-panel] unexpected refresh error", error);
    return { error: null, stale: false };
}

const plugin: TuiPluginModule = {
    id: "balance.panel",
    tui: async (api, options) => {
        const opts = parseOptions(
            options as Record<string, unknown> | undefined,
        );
        const providers = getProviders().filter((p) =>
            opts.providers.includes(p.id),
        );

        // No providers configured: the plugin loads but is inert — no fetch loop,
        // no commands, no panel slot, nothing rendered.
        if (providers.length === 0) {
            return;
        }

        const [visible, setVisible] = createSignal(true);
        const initialStatuses: Record<string, ProviderStatus> = {};
        for (const provider of providers) {
            initialStatuses[provider.id] = {
                snapshot: readSnapshot(api.kv, provider.id),
                stale: false,
                error: null,
            };
        }
        const [statuses, setStatuses] =
            createSignal<Record<string, ProviderStatus>>(initialStatuses);

        const log = async (
            level: "debug" | "info" | "warn" | "error",
            message: string,
            extra: Record<string, unknown>,
        ) => {
            // The OpenTUI console overlay (app_console) captures console.* calls, so
            // that is the channel the user actually sees in the debug console.
            // app.log is a best-effort server-side side channel and must never break
            // the refresh loop.
            if (level === "warn" || level === "error") {
                console.error("[balance-panel]", level, message, extra);
            } else {
                console.log("[balance-panel]", level, message, extra);
            }
            try {
                await api.client?.app?.log?.({
                    service: "balance-panel",
                    level,
                    message,
                    extra,
                });
            } catch {
                // logging must never break the refresh loop
            }
        };

        let refreshing = false;
        const refresh = async () => {
            if (refreshing) {
                return;
            }
            refreshing = true;
            try {
                await Promise.all(
                    providers.map(async (provider) => {
                        try {
                            const fresh = await provider.fetchBalance();
                            setStatuses((prev) => ({
                                ...prev,
                                [provider.id]: {
                                    snapshot: fresh,
                                    stale: false,
                                    error: null,
                                },
                            }));
                            writeSnapshot(api.kv, fresh);
                            await log("info", "balance refreshed", {
                                provider: provider.id,
                                balances: fresh.balances.map(
                                    (b) =>
                                        `${b.currency}:${b.totalBalance.toFixed(2)}`,
                                ),
                                fetchedAt: fresh.fetchedAt,
                            });
                        } catch (err) {
                            const prevStatus = statuses()[provider.id];
                            const { error, stale } = classifyRefreshError(
                                err,
                                prevStatus?.snapshot !== undefined,
                            );
                            setStatuses((prev) => ({
                                ...prev,
                                [provider.id]: {
                                    snapshot: prevStatus?.snapshot,
                                    stale,
                                    error,
                                },
                            }));
                            const errorDetail =
                                err instanceof Error
                                    ? err.message
                                    : String(err);
                            if (error === "key-missing") {
                                await log("warn", "API key not configured", {
                                    provider: provider.id,
                                });
                            } else if (error === "fetch-failed") {
                                await log("error", "balance unavailable", {
                                    provider: provider.id,
                                    error: errorDetail,
                                });
                            } else if (stale) {
                                await log(
                                    "warn",
                                    "balance refresh failed, showing cached",
                                    {
                                        provider: provider.id,
                                        error: errorDetail,
                                    },
                                );
                            } else {
                                await log("error", "unexpected refresh error", {
                                    provider: provider.id,
                                    error: errorDetail,
                                });
                            }
                        }
                    }),
                );
            } finally {
                refreshing = false;
            }
        };

        // Initial fetch on session start, then keep polling.
        await log("info", "balance panel initialized", {
            providers: providers.map((p) => p.id),
        });
        void refresh();
        const timer = setInterval(() => void refresh(), opts.refreshIntervalMs);
        api.lifecycle.onDispose(() => clearInterval(timer));

        const disposeKeymap = api.keymap.registerLayer({
            mode: "base",
            commands: [
                {
                    name: TOGGLE_COMMAND,
                    title: "Toggle balance panel",
                    category: "Plugin",
                    namespace: "palette",
                    run: () => setVisible((v) => !v),
                },
                {
                    name: REFRESH_COMMAND,
                    title: "Refresh balance",
                    category: "Plugin",
                    namespace: "palette",
                    run: () => void refresh(),
                },
            ],
            bindings: buildCommandBindings(opts),
        });
        // The host also auto-tracks keymap disposers; belt-and-suspenders.
        api.lifecycle.onDispose(disposeKeymap);

        // Account-level panel: render for any session.
        api.slots.register({
            slots: {
                sidebar_content: (_ctx, _props) => (
                    <BalancePanel
                        providers={providers.map((p) => ({
                            id: p.id,
                            name: p.name,
                            icon: p.icon,
                        }))}
                        statuses={statuses()}
                        options={opts}
                        visible={visible()}
                    />
                ),
            },
        });
    },
};

export default plugin;
