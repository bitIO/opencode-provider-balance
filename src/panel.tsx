import type { JSX } from "@opentui/solid";
import { createMemo, For, Show } from "solid-js";
import { isLowBalance, type NormalizedOptions } from "./config.js";
import type { BalanceSnapshot } from "./providers.js";

export type ProviderInfo = { id: string; name: string; icon: string };

export type ProviderStatus = {
    snapshot?: BalanceSnapshot;
    stale: boolean;
    error: "key-missing" | "fetch-failed" | null;
};

export type BalancePanelProps = {
    providers: ProviderInfo[];
    statuses: Record<string, ProviderStatus>;
    options: NormalizedOptions;
    visible: boolean;
};

/** Formats an ISO timestamp as local 24h `HH:MM`; "" when unparseable. */
function formatTime(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/**
 * Provider-balance section for opencode's sidebar. Pure presentation: all
 * state arrives via props, nothing is fetched or stored here.
 *
 * Solid renders a component body once, so every state branch below is wrapped
 * in reactive control flow (Show/For/createMemo) instead of body-level
 * conditionals — otherwise prop updates would not re-render. `visible === false`
 * renders nothing via `<Show when={props.visible}>`. Each provider row keeps
 * its own low-balance/row memos, reading the reactive per-provider status.
 */
export function BalancePanel(props: BalancePanelProps): JSX.Element {
    return (
        <Show when={props.visible}>
            <box flexDirection="column">
                <text>💰 Balance</text>

                <For each={props.providers}>
                    {(provider) => {
                        const status = () => props.statuses[provider.id];
                        // isLowBalance already returns [] when options.threshold is null.
                        const low = createMemo(() =>
                            isLowBalance(
                                status()?.snapshot?.balances ?? [],
                                props.options,
                            ),
                        );

                        // One-line provider row: `🐋 DeepSeek ⚠️ USD 6.12 · CNY 88.00`. In split
                        // fields mode each segment gets a compact inline breakdown `(g 1.00 · t 5.12)`.
                        const row = createMemo(() => {
                            const balances = status()?.snapshot?.balances ?? [];
                            const parts = balances.map((balance) => {
                                const warning = low().some(
                                    (b) => b.currency === balance.currency,
                                );
                                const total = `${warning ? "⚠️ " : ""}${balance.currency} ${balance.totalBalance.toFixed(2)}`;
                                return props.options.fields === "split"
                                    ? `${total} (g ${balance.grantedBalance.toFixed(2)} · t ${balance.toppedUpBalance.toFixed(2)})`
                                    : total;
                            });
                            return parts.join(" · ");
                        });

                        return (
                            <Show
                                when={status()}
                                fallback={
                                    <text opacity={0.7}>
                                        {provider.icon} {provider.name} …
                                    </text>
                                }
                            >
                                {(st) => (
                                    <box flexDirection="row">
                                        <text>
                                            {provider.icon} {provider.name}
                                        </text>
                                        <Show
                                            when={st().error !== "key-missing"}
                                        >
                                            <Show when={st().snapshot}>
                                                {(snapshot) => (
                                                    <>
                                                        <Show
                                                            when={
                                                                snapshot()
                                                                    .balances
                                                                    .length > 0
                                                            }
                                                        >
                                                            <text>
                                                                {st().stale
                                                                    ? " 🕓"
                                                                    : ""}{" "}
                                                                {row()}
                                                            </text>
                                                        </Show>
                                                        <Show
                                                            when={
                                                                snapshot()
                                                                    .balances
                                                                    .length ===
                                                                0
                                                            }
                                                        >
                                                            <text opacity={0.7}>
                                                                {" "}
                                                                no balance data
                                                            </text>
                                                        </Show>
                                                        <text opacity={0.7}>
                                                            {formatTime(
                                                                snapshot()
                                                                    .fetchedAt,
                                                            )
                                                                ? ` (${formatTime(snapshot().fetchedAt)})`
                                                                : ""}
                                                        </text>
                                                    </>
                                                )}
                                            </Show>
                                            <Show when={!st().snapshot}>
                                                <text opacity={0.7}>
                                                    {st().error ===
                                                    "fetch-failed"
                                                        ? " ⛔ Balance unavailable"
                                                        : " …"}
                                                </text>
                                            </Show>
                                        </Show>
                                        <Show
                                            when={st().error === "key-missing"}
                                        >
                                            <text>
                                                {" "}
                                                🔑 API key not configured
                                            </text>
                                        </Show>
                                    </box>
                                )}
                            </Show>
                        );
                    }}
                </For>
            </box>
        </Show>
    );
}
