# Releasing

This repo publishes to npm (`@bitio/opencode-provider-balance`) with
[semantic-release](https://semantic-release.gitbook.io). Versions and the
changelog are derived from Conventional Commits on `main`; there are no manual
version bumps.

## Version rules

| Commit on main | Version bump |
| --- | --- |
| `fix:` | patch (1.0.0 -> 1.0.1) |
| `feat:` | minor (1.0.0 -> 1.1.0) |
| `BREAKING CHANGE:` footer or `!` (e.g. `feat!:`) | major (1.0.0 -> 2.0.0) |

Other commit types (`chore:`, `docs:`, `ci:`, non-breaking `refactor:`) do not
trigger a release. Commit messages are enforced locally by the
[commitlint](https://commitlint.js.org) hook in `.husky/commit-msg`.

## How a release happens

1. A PR is squash-merged into `main` with a conventional title.
2. CI ([ci.yml](../.github/workflows/ci.yml)) runs on that push.
3. The Release action ([release.yml](../.github/workflows/release.yml)) also
   runs on the push and executes `npx semantic-release`.
4. If the commits since the last tag contain release-worthy types,
   semantic-release bumps the version, writes `CHANGELOG.md`, publishes the
   package to npm, and creates a GitHub release with the changelog (plugins in
   [.releaserc.json](../.releaserc.json)).

If there are no release-worthy commits, the action is a no-op: no version, no
npm publish, no GitHub release.

## CI is the gate

Release does not run CI itself. Both workflows trigger on push to `main` and
run on the same commit, so a release is only trustworthy if the CI run for
that SHA is green. Check CI before merging.

## First release

There are no existing tags, so the first release-worthy commit on `main`
produces `1.0.0`. The `version` field in `package.json` is not the source of
truth; semantic-release computes the version from tags and commits.

## Local dry-run

Preview what the next release would do without publishing:

```sh
bun run release:dry
```

## Forcing or avoiding a release

- **Force** — squash-merge a PR whose title is `fix: ...` or `feat: ...`.
  Breaking changes need a `BREAKING CHANGE:` footer in the commit body or a
  `!` in the title (e.g. `feat!: drop node 18`).
- **Avoid** — merge only commits with non-release-worthy types
  (`chore:`, `docs:`, `ci:`, `refactor:`).

Squash-merging matters: it makes the PR title the single commit message that
semantic-release reads. With a merge commit, the individual commits are
analyzed instead.
