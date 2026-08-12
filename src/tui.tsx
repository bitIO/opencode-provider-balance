import type { TuiPluginModule } from "@opencode-ai/plugin/tui";
import { createSignal } from "solid-js";
import { readSnapshot, writeSnapshot } from "./cache.js";
import { parseOptions } from "./config.js";
import { BalancePanel } from "./panel.jsx";
import {
  BalanceFetchError,
  BalanceKeyMissingError,
  getProviders,
  type BalanceSnapshot,
} from "./providers.js";

const TOGGLE_COMMAND = "balance.toggle";
const REFRESH_COMMAND = "balance.refresh";
const SNAPSHOT_PROVIDER_ID = "deepseek";

export type RefreshErrorState = "key-missing" | "fetch-failed" | null;

/**
 * Pure decision for how a refresh failure should surface in the panel.
 * key-missing still shows cached balances, so they are flagged stale.
 */
export function classifyRefreshError(
  error: unknown,
  hasSnapshot: boolean,
): { error: RefreshErrorState; stale: boolean } {
  if (error instanceof BalanceKeyMissingError) {
    return { error: "key-missing", stale: true };
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
    const opts = parseOptions(options as Record<string, unknown> | undefined);
    const provider = getProviders()[0];

    const [visible, setVisible] = createSignal(true);
    const [snapshot, setSnapshot] = createSignal<BalanceSnapshot | undefined>(
      readSnapshot(api.kv, SNAPSHOT_PROVIDER_ID),
    );
    const [stale, setStale] = createSignal(false);
    const [error, setError] = createSignal<RefreshErrorState>(null);

    let refreshing = false;
    const refresh = async () => {
      if (refreshing) {
        return;
      }
      refreshing = true;
      try {
        if (!provider) {
          return;
        }
        const fresh = await provider.fetchBalance();
        setSnapshot(fresh);
        writeSnapshot(api.kv, fresh);
        setError(null);
        setStale(false);
      } catch (err) {
        const { error: nextError, stale: nextStale } = classifyRefreshError(
          err,
          snapshot() !== undefined,
        );
        setError(nextError);
        setStale(nextStale);
      } finally {
        refreshing = false;
      }
    };

    // Initial fetch on session start, then keep polling.
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
      bindings: api.tuiConfig.keybinds.has(TOGGLE_COMMAND)
        ? []
        : [
            {
              key: "<leader>B",
              cmd: TOGGLE_COMMAND,
              desc: "Toggle balance panel",
              mode: "base",
            },
          ],
    });
    // The host also auto-tracks keymap disposers; belt-and-suspenders.
    api.lifecycle.onDispose(disposeKeymap);

    // Account-level panel: render for any session.
    api.slots.register({
      slots: {
        sidebar_content: (_ctx, _props) => (
          <BalancePanel
            snapshot={snapshot()}
            options={opts}
            stale={stale()}
            error={error()}
            visible={visible()}
            providerName={provider?.name ?? "Unknown"}
            providerIcon={provider?.icon ?? ""}
          />
        ),
      },
    });
  },
};

export default plugin;
