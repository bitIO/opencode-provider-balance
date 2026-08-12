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

const plugin: TuiPluginModule = {
  id: "balance.panel",
  tui: async (api, options) => {
    const opts = parseOptions(options as Record<string, unknown> | undefined);

    // Defensive: kv may be unavailable on some hosts; the panel falls back to
    // fetching and keeps state in memory either way.
    try {
      await api.kv.ready;
    } catch {
      // proceed without kv
    }

    const [visible, setVisible] = createSignal(true);
    const [snapshot, setSnapshot] = createSignal<BalanceSnapshot | undefined>(
      readSnapshot(api.kv, SNAPSHOT_PROVIDER_ID),
    );
    const [stale, setStale] = createSignal(false);
    const [error, setError] = createSignal<"key-missing" | "fetch-failed" | null>(null);

    let refreshing = false;
    const refresh = async () => {
      if (refreshing) {
        return;
      }
      refreshing = true;
      const provider = getProviders()[0];
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
        if (err instanceof BalanceKeyMissingError) {
          setError("key-missing");
          setStale(false);
        } else if (err instanceof BalanceFetchError) {
          if (snapshot()) {
            // Keep showing the cached snapshot; flag it as stale.
            setStale(true);
          } else {
            setError("fetch-failed");
          }
        }
        // Unexpected errors are swallowed on purpose: a refresh failure must
        // never take the TUI plugin down with it.
      } finally {
        refreshing = false;
      }
    };

    // Initial fetch on session start, then keep polling.
    void refresh();
    const timer = setInterval(() => void refresh(), opts.refreshIntervalMs);
    api.lifecycle.onDispose(() => clearInterval(timer));

    api.keymap.registerLayer({
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
          />
        ),
      },
    });
  },
};

export default plugin;
