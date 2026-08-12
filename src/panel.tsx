import type { JSX } from "@opentui/solid";
import { For, Show, createMemo } from "solid-js";
import { isLowBalance, type NormalizedOptions } from "./config.js";
import type { BalanceSnapshot } from "./providers.js";

export type BalancePanelProps = {
  snapshot: BalanceSnapshot | undefined;
  options: NormalizedOptions;
  stale: boolean;
  error: "key-missing" | "fetch-failed" | null;
  visible: boolean;
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

  return (
    <Show when={props.visible}>
      <box flexDirection="column">
        <box flexDirection="row">
          <text>Balance</text>
          <Show when={props.stale}>
            <text opacity={0.7}> (stale)</text>
          </Show>
        </box>

        <Show when={props.error === "key-missing"}>
          <text>API key not configured</text>
          <text opacity={0.7}>Set DEEPSEEK_API_KEY</text>
        </Show>

        <Show when={props.error !== "key-missing" && !props.snapshot}>
          <text opacity={0.7}>
            {props.error === "fetch-failed" ? "Balance unavailable" : "Loading…"}
          </text>
        </Show>

        <Show when={props.snapshot}>
          {(snapshot) => (
            <>
              <Show when={snapshot().balances.length === 0}>
                <text opacity={0.7}>No balance data</text>
              </Show>
              <For each={snapshot().balances}>
                {(balance) => {
                  const isWarning = () => low().some((b) => b.currency === balance.currency);
                  return (
                    <box flexDirection="column">
                      <box flexDirection="row">
                        <Show when={isWarning()}>
                          <text>! </text>
                        </Show>
                        <text>
                          {balance.currency} {balance.totalBalance.toFixed(2)}
                        </text>
                      </box>
                      <Show when={props.options.fields === "split"}>
                        <box flexDirection="column" paddingLeft={2}>
                          <text opacity={0.7}>granted {balance.grantedBalance.toFixed(2)}</text>
                          <text opacity={0.7}>topped-up {balance.toppedUpBalance.toFixed(2)}</text>
                        </box>
                      </Show>
                    </box>
                  );
                }}
              </For>
            </>
          )}
        </Show>
      </box>
    </Show>
  );
}
