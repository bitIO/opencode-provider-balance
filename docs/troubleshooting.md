# Troubleshooting

Known issues and fixes. Config, commands, and log details live in the
[README](../README.md); this page is for "it doesn't work" questions. Each
section links to the relevant README part.

## Panel not showing

The panel renders on session start; if it's missing, check these in order:

1. **Not disabled.** `plugin_enabled` is keyed by the plugin id
   (`balance.panel`), not the package name. If `tui.json` has
   `{ "plugin_enabled": { "balance.panel": false } }`, remove the entry or set
   it to `true`. See [Disable](../README.md#disable).
2. **Registered.** The plugin must be in the `plugin` array of `tui.json`
    (`"plugin": ["@bitio/opencode-provider-balance"]`) or installed via
    `opencode plugin @bitio/opencode-provider-balance`. See
   [Install](../README.md#install).
3. **A provider enabled.** The default `providers` value is `[]`, which hides
   the panel. Set `"providers": ["deepseek"]` in the plugin options.
4. **Logs.** Refresh outcomes are logged under `service: balance-panel` in
   opencode's app log. Enable the debug console with an `app_console` keybind
   in `tui.json` (e.g. `f9`) and open it to see errors.
   See [Logs](../README.md#logs).

## Stale cache after update

Plugin versions are cached under `~/.cache/opencode/packages/`. If a new
version doesn't take effect, clear the cache and restart opencode:

```sh
rm -rf ~/.cache/opencode/packages/
```

## API key not configured

The panel shows `API key not configured` and `Set DEEPSEEK_API_KEY` when
`DEEPSEEK_API_KEY` is missing or not exported. Export it in the shell that
launches opencode, then restart:

```sh
export DEEPSEEK_API_KEY=sk-...
```

The key is read from the environment at session start; opencode must be
restarted after setting it. See [Install](../README.md#install).

## Stale balance (🕓)

`🕓` means the last fetch failed (API unreachable) and the shown value is the
last-known balance from opencode's KV cache (`state/kv.json`). Check that the
API is reachable, then trigger a fetch now with `balance.refresh` from the
command palette. The indicator clears once a fetch succeeds.
See [Toggle and commands](../README.md#toggle-and-commands).

## Low-balance warning (⚠️)

`⚠️` prefixes a currency's line when its total is **strictly below** the
`threshold` option — an equal balance is not warned. `currency` restricts
evaluation to one currency (display is unaffected). Warnings are off by
default (`threshold` is `null`); set it to a number to enable them.
See [Configuration](../README.md#configuration).

## Command palette missing commands

`balance.toggle` and `balance.refresh` appear in the command palette
(`command_list`, default `ctrl+p`) when the plugin is loaded. If they're
missing, check "Panel not showing" above first.

Keybinds are set via **plugin options**, not `tui.json` keybinds — the host's
`keybinds` only accepts built-in names and silently ignores plugin commands:

- `balance.toggle` — default `<leader>shift+b` (leader defaults to `ctrl+x`).
- `balance.refresh` — no default binding; run it from the palette or bind it
  with `refreshKeybind` (e.g. `"refreshKeybind": "f5"`).

See [Toggle and commands](../README.md#toggle-and-commands) for examples and
the warning about keys already used by opencode's built-in keybinds.
