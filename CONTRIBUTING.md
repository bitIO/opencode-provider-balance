# Contributing

Thanks for your interest in contributing to opencode-provider-balance. Please
read our [Code of Conduct](CODE_OF_CONDUCT.md) — by participating you agree to
abide by it.

## Development setup

Prerequisites:

- [Bun](https://bun.sh) >= 1.x
- [opencode](https://opencode.ai) >= 1.17 to test the plugin locally (TUI
  plugin support)

Clone the repo and install dependencies:

```
bun install
```

### Development loop

```
bun run typecheck
bun run lint
bun run test
bun run build
```

`bun run build` emits `dist/`, the npm-published artifact. The pre-commit hooks
run lint, typecheck, and tests automatically, so fix any failures before
committing.

### Testing the plugin locally

Install the local package and register it with opencode's plugin flow as
described in the [Install](README.md#install) section of the README — e.g.
`opencode plugin opencode-provider-balance` after publishing, or by adding the
package to the `plugin` array of `tui.json`. Set `DEEPSEEK_API_KEY` to see a
live panel.

## Code style

- [Biome](https://biomejs.dev) lints and formats the code (4-space indent).
- Formatting is enforced — run `bun run format` before submitting, and
  `bun run lint` to check.
- The pre-commit hook runs `bun run lint`, `bun run typecheck`, and
  `bun run test` for you.

## Commit conventions

This repo uses [Conventional Commits](https://www.conventionalcommits.org),
enforced by commitlint. Commit messages follow this format:

```
type: description
```

Valid types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`,
`build`, `ci`, `chore`, `revert`.

Examples:

```
feat: add opt-in providers configuration
fix: keybind overrides and fetch timestamp
docs: clarify threshold option behavior
```

Breaking changes use a `BREAKING CHANGE:` footer or a `!` after the type:

```
feat!: drop support for opencode < 1.17

BREAKING CHANGE: requires opencode 1.17 or later
```

Why it matters: semantic-release derives the next version and the changelog
from these messages, so `feat` bumps the minor version, `fix` bumps the patch,
and breaking changes bump the major version.

## Pull requests

- Branch from `main` using a descriptive name, e.g.
  `fix/toggle-keybind-collision` or `feat/oauth-provider`.
- Keep PRs small and atomic — one logical change per PR. If a PR mixes
  unrelated changes, reviewers will ask you to split it.
- Use a separate git worktree for the change so the main checkout stays clean.
- Make sure all checks pass: `bun run lint`, `bun run typecheck`,
  `bun run test`, and `bun run build` (these run in CI too).
- Reviewers look for: correct behavior with a test where behavior changes,
  no unrelated edits, conventional commit history, and docs updated when
  user-facing behavior changes.

## Reporting issues

Open an issue on GitHub. For a bug report, include: the opencode version, how
to reproduce (config used, provider, expected vs. actual output), and any
relevant log output. For a feature request, describe the problem you're
solving and a sketch of the behavior you'd expect.
