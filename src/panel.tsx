import type { JSX } from "@opentui/solid";
import { Show, createMemo } from "solid-js";
import { isLowBalance, type NormalizedOptions } from "./config.js";
import type { BalanceSnapshot } from "./providers.js";

export type BalancePanelProps = {
  snapshot: BalanceSnapshot | undefined;
  options: NormalizedOptions;
  stale: boolean;
  error: "key-missing" | "fetch-failed" | null;
  visible: boolean;
  providerName: string;
  providerIcon: string;
};

/**
 * Provider-balance section for opencode's sidebar. Pure presentation: all
 * state arrives via props, nothing is fetched or stored here.
 *
 * Solid renders a component body once, so every state branch below is wrapped
 * in reactive control flow (Show/For/createMemo) instead of body-level
 * conditionals — otherwise prop updates would not re-render. `visible === false`
 * renders nothing via `<Show when={props.visible}>`.
 */
export function BalancePanel(props: BalancePanelProps): JSX.Element {
  // isLowBalance already returns [] when options.threshold is null.
  const low = createMemo(() => isLowBalance(props.snapshot?.balances ?? [], props.options));

  // One-line provider row: `🐋 DeepSeek ⚠️ USD 6.12 · CNY 88.00`. In split
  // fields mode each segment gets a compact inline breakdown `(g 1.00 · t 5.12)`.
  const row = createMemo(() => {
    const balances = props.snapshot?.balances ?? [];
    const parts = balances.map((balance) => {
      const warning = low().some((b) => b.currency === balance.currency);
      const total = `${warning ? "⚠️ " : ""}${balance.currency} ${balance.totalBalance.toFixed(2)}`;
      return props.options.fields === "split"
        ? `${total} (g ${balance.grantedBalance.toFixed(2)} · t ${balance.toppedUpBalance.toFixed(2)})`
        : total;
    });
    return parts.join(" · ");
  });

  return (
    <Show when={props.visible}>
      <box flexDirection="column">
        <box flexDirection="row">
          <text>💰 Balance</text>
          <Show when={props.stale}>
            <text opacity={0.7}> 🕓</text>
          </Show>
        </box>

        <Show when={props.error !== "key-missing"}>
          <box flexDirection="row">
            <text>
              {props.providerIcon} {props.providerName}
            </text>
            <Show when={props.snapshot}>
              {(snapshot) => (
                <>
                  <Show when={snapshot().balances.length > 0}>
                    <text> {row()}</text>
                  </Show>
                  <Show when={snapshot().balances.length === 0}>
                    <text opacity={0.7}> no balance data</text>
                  </Show>
                </>
              )}
            </Show>
          </box>
        </Show>

        <Show when={props.error === "key-missing"}>
          <text>🔑 API key not configured</text>
          <text opacity={0.7}>Set DEEPSEEK_API_KEY</text>
        </Show>

        <Show when={props.error !== "key-missing" && !props.snapshot}>
          <text opacity={0.7}>
            {props.error === "fetch-failed" ? "⛔ Balance unavailable" : "Loading…"}
          </text>
        </Show>
      </box>
    </Show>
  );
}
