# opencode-provider-balance

![opencode-provider-balance banner](https://raw.githubusercontent.com/bitIO/opencode-provider-balance/main/assets/banner.webp)

[![npm version](https://img.shields.io/npm/v/@bitio/opencode-provider-balance?style=flat-square)](https://www.npmjs.com/package/@bitio/opencode-provider-balance)
[![npm downloads](https://img.shields.io/npm/dm/@bitio/opencode-provider-balance?style=flat-square)](https://www.npmjs.com/package/@bitio/opencode-provider-balance)
[![GitHub stars](https://img.shields.io/github/stars/bitIO/opencode-provider-balance?style=flat-square)](https://github.com/bitIO/opencode-provider-balance)
[![license](https://img.shields.io/github/license/bitIO/opencode-provider-balance?style=flat-square)](LICENSE)

Documentation: [docs/00-index.md](docs/00-index.md) · [Troubleshooting](docs/troubleshooting.md) · [Releasing](docs/releasing.md)

An opencode TUI plugin that shows your API-provider balance in the sidebar. It
fetches balances on session start and re-fetches them on an interval, rendering
a provider header (icon + name, e.g. 🐋 DeepSeek) with one line per currency
showing the total balance, plus emoji indicators (💰 for the panel, 🕓 when
stale, ⚠️ for low-balance warnings). The last-known balance is cached in
opencode's KV store (`state/kv.json`), so it survives restarts and is marked
`🕓` when the API is unreachable. A `⚠️` prefix warns when a currency's
total is below the configured threshold. Optionally, each line can also show the
granted and topped-up split.

First provider: DeepSeek, fetched with `DEEPSEEK_API_KEY` using Bearer auth (no
OAuth). The provider list is extensible for future providers.

## Install

Requires opencode with TUI plugin support (opencode >= 1.17).

Install from npm and register it with opencode's plugin flow:

```
opencode plugin @bitio/opencode-provider-balance
```

or add the package to the `plugin` array of `tui.json` (the TUI config file):

```json
{
  "plugin": ["@bitio/opencode-provider-balance"]
}
```

Set the API key:

```
export DEEPSEEK_API_KEY=sk-...
```

If the key is missing, the panel shows `API key not configured` and `Set
DEEPSEEK_API_KEY`.

## Configuration

Options go in the second element of a `[spec, options]` tuple in the `plugin`
array:

```json
{
  "plugin": [
    [
      "@bitio/opencode-provider-balance",
      { "threshold": 20, "currency": "USD", "refreshIntervalMinutes": 15, "fields": "total", "providers": ["deepseek"] }
    ]
  ]
}
```

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `threshold` | number, optional | `null` (off) | Prefix `!` when a currency's total balance is strictly below this value. |
| `currency` | string, optional | none | Restrict threshold evaluation to this currency. Display is unaffected. |
| `refreshIntervalMinutes` | number, optional | `15` (min 1) | How often to re-fetch balances. |
| `fields` | `"total"` \| `"split"`, optional | `"total"` | Show only totals, or also granted/topped-up breakdown. |
| `providers` | string[] or string, optional | `[]` | List of provider ids to enable (e.g. `["deepseek"]`); empty = panel hidden, but the commands stay in the palette. |
| `keybind` | string, optional | `<leader>shift+b` | Keybind that toggles the panel; `"none"` disables it. |
| `refreshKeybind` | string, optional | none | Keybind that refreshes balances; `"none"` disables it. |

All options are optional; invalid values fall back to defaults. Threshold
comparison is strict (`<`); omit `threshold` or set it to `null` to disable
warnings.

Only configured providers are fetched and shown; unconfigured providers
produce no messages.

## Toggle and commands

- `balance.toggle` — show/hide the panel. Default binding `<leader>shift+b`
  (leader, then shift+b; the leader key defaults to `ctrl+x`). Plain
  `<leader>b` is opencode's built-in sidebar toggle, so the panel toggle uses
  shift+b and doesn't collide with it.
- `balance.refresh` — fetch balances now. No default binding; run it from the
  command palette.

Both commands appear in the command palette (`command_list`, default `ctrl+p`)
**regardless of provider configuration** — even with an empty `providers`
array (panel hidden), `balance.toggle` and `balance.refresh` are registered
and runnable; refresh is a no-op and toggle toggles a hidden panel.

Custom keybinds are set via PLUGIN OPTIONS, not `tui.json` keybinds. The host's
`keybinds` accepts only built-in keybind names and silently ignores plugin
commands, so overrides live in the plugin tuple:

```json
{
  "plugin": [
    [
      "@bitio/opencode-provider-balance",
      { "keybind": "ctrl+b", "refreshKeybind": "f5" }
    ]
  ]
}
```

Pass `"none"` to disable a binding (e.g. `"keybind": "none"`).

> Warning: avoid keys already used by opencode's built-in keybinds — built-in
> bindings take precedence over plugin bindings, so the plugin never fires. For
> example, `ctrl+r` is bound to rename session, `<leader>b` toggles the sidebar,
> and `<leader>r` redoes. Check the built-in list in opencode's keybinds docs
> before picking a binding (e.g. `f5` is unbound and works well for refresh).

## Logs

Refresh outcomes are logged through opencode's app log under `service:
balance-panel` (info on success, warn/error on failures). Enable the debug
console with a built-in keybind in `tui.json`, e.g.
`{ "keybinds": { "app_console": "f9" } }`, then press `f9` to view.

## Disable

Disable the plugin without removing it. `plugin_enabled` is keyed by the plugin
id (`balance.panel`), not the package name:

```json
{
  "plugin_enabled": { "balance.panel": false }
}
```

## Troubleshooting

#### The balance panel doesn't show up

Check that `plugin_enabled` isn't `false` for the `balance.panel` plugin id and
that the package is listed in the `plugin` array of `tui.json`. An empty
`providers` option (`[]`) also hides the panel. If the config looks right, check
opencode's logs — see [Logs](#logs) — or run `opencode --log-level debug`.

#### I installed a new version but opencode still behaves like the old one

opencode caches installed plugin packages. Clear its plugin cache and restart
opencode to pick up the new version.

#### The panel shows `API key not configured`

The `DEEPSEEK_API_KEY` environment variable is missing or wasn't exported in the
shell opencode was started from. Set it and restart opencode.

#### The balance is stale (🕓)

The API is unreachable, so the last-known cached balance is shown. Check your
network connection and that `DEEPSEEK_API_KEY` is still valid, then run
`balance.refresh` to fetch again.

## Development

```
bun install
bun run typecheck
bun run test
bun run build
```

`bun run build` emits `dist/`, the npm-published artifact (`exports["./tui"]`).

Contributions are welcome — see [CONTRIBUTING.md](CONTRIBUTING.md) and our
[Code of Conduct](CODE_OF_CONDUCT.md).
