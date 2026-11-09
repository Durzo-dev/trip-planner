# Versions and releases

*[Version française](../fr/versioning.md)*

Format `major.minor.patch`, shown at the bottom of the settings dialog.

## The three levels

| Level | When | How |
|---|---|---|
| **major** | On explicit request | `npm run bump major` |
| **minor** | When a feature is validated after testing it | `npm run bump minor` |
| **patch** | On every commit | Automatic (`pre-commit` hook) |

A minor bump resets the patch to 0; a major bump resets both.

## Where the version lives

`package.json` is the reference. The page reads it at build time: `vite.config.ts` defines
`__APP_VERSION__` from it, so no generated file is needed. `tools/bump-version.mjs` rewrites it along
with the three files that repeat it:
- the two root `version` fields of `package-lock.json`;
- the `**Version x.y.z**` line of `README.md` and `README.fr.md`.

`tools/version.test.mjs` forbids them from diverging.

## What happens on every commit

```
git commit
   │
   ├─ merge / rebase / cherry-pick?  →  nothing is touched
   ├─ type check, then the test suite
   │     └─ failure  →  commit refused, no file changed
   ├─ patch bump, all the files together
   │     ├─ version already changed by hand  →  no second bump
   │     └─ a file without its version  →  no write at all
   ├─ those files join the commit
   └─ post-commit: minor or major changed?  →  tag vX.Y.Z + reminder of git push --follow-tags
```

Three orderings matter:
- **checks before the bump**: a failure leaves no bumped version without a commit;
- **in the script, every check before any write**: a README without its version line does not leave
  `package.json` bumped on its own;
- **the tag in `post-commit`**: at `pre-commit`, the commit carrying the version does not exist yet.

The decisions (bump or not, which tag) are functions of `tools/bump-version.mjs` the hooks call, so they
are tested; the hooks' bodies are written by `tools/setup-hooks.mjs`.

## Releasing a version

1. Write its section in `CHANGELOG.md` and `CHANGELOG.fr.md`, titled exactly `## vX.Y.Z`: "what
   changes for you", then "under the hood".
2. `npm run bump minor` (or `major`), then commit: the hook does not bump again, and `post-commit`
   tags the commit.
3. `git push --follow-tags`.

On a `v*` tag, `.github/workflows/release.yml` publishes the GitHub release. Its note
(`tools/release-notes.mjs`, tested) is the `CHANGELOG.md` section of the tag, with the commit subjects
folded under it; without a section, the subjects since the previous tag. Both end with a compare link.
Commit bodies are never published.

The site itself does not wait for a release: `deploy.yml` publishes it on every push to `main`.

## Commands

```bash
npm run setup-hooks      # after a clone: git does not version .git/hooks
npm run bump minor       # or major; never patch, the hook does it
npm run bump sync        # rewrites the other files from package.json
git push --follow-tags   # a plain git push does not send tags
```

`git commit --no-verify` skips the checks and the bump, for a work-in-progress commit. `post-commit`
still runs: a tag is set if the version changed.

## Pitfalls

- **`git commit --amend` bumps again**: a `pre-commit` hook cannot reliably tell an amend apart. Amend
  with `git commit --amend --no-verify`.
- **Tags do not leave on their own**: `git push --follow-tags`, which `post-commit` reminds whenever it
  sets one.
- **`fetch-depth: 0` in `release.yml`**: without it, `git describe` sees no earlier tag and every
  release calls itself the first (a test guards it).
- **No "Unreleased" section in the changelog**: only `## vX.Y.Z` is picked up; a section with another
  title would never be published.
