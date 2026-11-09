// tools/bump-version.mjs — application version (major.minor.patch).
//
// Policy:
//   • patch — every commit, docs and tests included. Automatic, through the pre-commit hook.
//   • minor — once a feature is validated after functional testing. Never automatic: asked for
//             explicitly (npm run bump minor) when all of a feature's commits are in.
//   • major — on explicit request only.
// A minor bump resets the patch; a major bump resets both.
//
// package.json is the source of truth. The page reads it at build time (vite.config.ts defines
// __APP_VERSION__), so no generated file is needed. Three other files carry it and are rewritten
// with it: package-lock.json (its two root fields) and the "**Version x.y.z**" line of both READMEs.
// tools/version.test.mjs forbids them from drifting apart.
//
// Usage: node tools/bump-version.mjs [patch|minor|major|sync] [--dry-run]
//        node tools/bump-version.mjs should-auto-bump <HEAD version> <working version>   (hooks)
//        node tools/bump-version.mjs tag-for <previous version> <new version>             (hooks)

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
export const PACKAGE_JSON = join(ROOT, "package.json");
export const PACKAGE_LOCK = join(ROOT, "package-lock.json");
export const READMES = [join(ROOT, "README.md"), join(ROOT, "README.fr.md")];

/** The README line, strict and alone on its line so nothing else can be touched. */
export const README_VERSION_RE = /^\*\*Version \d+\.\d+\.\d+\*\*$/m;
export const renderReadmeVersion = (version) => `**Version ${version}**`;
export function readReadmeVersion(file) {
  const m = /^\*\*Version (\d+\.\d+\.\d+)\*\*$/m.exec(readFileSync(file, "utf8"));
  return m ? m[1] : null;
}

const PKG_RE = /("version"\s*:\s*")[^"]+(")/;
/** The lock file's own version, at its top and on its root package (not the dependencies' ones). */
const LOCK_RES = [/^(\{\s*"name"\s*:\s*"[^"]+",\s*"version"\s*:\s*")[^"]+(")/, /("packages"\s*:\s*\{\s*""\s*:\s*\{\s*"name"\s*:\s*"[^"]+",\s*"version"\s*:\s*")[^"]+(")/];
export function readLockVersions(text) {
  return LOCK_RES.map((re) => re.exec(text)?.[0].match(/"([^"]+)"$/)?.[1] ?? null);
}

export function parseVersion(str) {
  const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(String(str ?? "").trim());
  if (!m) throw new Error(`Unreadable version "${str}" (expected major.minor.patch)`);
  return { major: +m[1], minor: +m[2], patch: +m[3] };
}

export const formatVersion = (v) => `${v.major}.${v.minor}.${v.patch}`;

/** The whole policy, in one pure function: the only place the reset rules live. */
export function bumpVersion(current, level) {
  const v = parseVersion(current);
  if (level === "patch") return formatVersion({ ...v, patch: v.patch + 1 });
  if (level === "minor") return formatVersion({ major: v.major, minor: v.minor + 1, patch: 0 });
  if (level === "major") return formatVersion({ major: v.major + 1, minor: 0, patch: 0 });
  // Rewrites the other files from package.json without changing it (first setup, a file edited by hand)
  if (level === "sync") return formatVersion(v);
  throw new Error(`Unknown level "${level}" (expected patch, minor, major or sync)`);
}

/**
 * Whether the pre-commit hook bumps the patch: not when the working version already differs from the
 * last commit's (a minor or major set by hand and not committed yet), or that version would be skipped.
 */
export function shouldAutoBump(headVersion, workingVersion) {
  if (!headVersion) return true; // no commit yet
  return headVersion === workingVersion;
}

/** Tag to set after a commit, or null: only minor and major versions are tagged (and so released). */
export function tagForBump(prev, next) {
  if (!prev || !next) return null;
  const a = parseVersion(prev);
  const b = parseVersion(next);
  if (a.major === b.major && a.minor === b.minor) return null;
  return `v${formatVersion(b)}`;
}

export const readPackageVersion = (file = PACKAGE_JSON) => JSON.parse(readFileSync(file, "utf8")).version;

function main() {
  // Questions asked by the git hooks: they answer and write nothing, so the decision stays here, tested.
  if (process.argv[2] === "tag-for") {
    const tag = tagForBump(process.argv[3], process.argv[4]);
    if (tag) console.log(tag);
    return;
  }
  if (process.argv[2] === "should-auto-bump") {
    process.exitCode = shouldAutoBump(process.argv[3], process.argv[4]) ? 0 : 1;
    return;
  }
  const level = process.argv[2] ?? "patch";
  const current = readPackageVersion();
  const next = bumpVersion(current, level);
  if (process.argv.includes("--dry-run")) {
    console.log(`${current} → ${next} (${level}, dry run)`);
    return;
  }
  // Every check before any write: a README without its version line must not leave package.json
  // bumped alone. Targeted replacements rather than JSON.stringify, which would reformat whole files.
  const pkg = readFileSync(PACKAGE_JSON, "utf8");
  if (!PKG_RE.test(pkg)) throw new Error('No "version" field in package.json');
  const lock = readFileSync(PACKAGE_LOCK, "utf8");
  if (!LOCK_RES.every((re) => re.test(lock))) throw new Error("The root version fields of package-lock.json were not found");
  const readmes = READMES.map((file) => {
    const text = readFileSync(file, "utf8");
    if (!README_VERSION_RE.test(text)) throw new Error(`No "**Version x.y.z**" line in ${file}`);
    return { file, text };
  });
  // From here on nothing can fail: the writes follow one another.
  writeFileSync(PACKAGE_JSON, pkg.replace(PKG_RE, `$1${next}$2`));
  writeFileSync(PACKAGE_LOCK, LOCK_RES.reduce((text, re) => text.replace(re, `$1${next}$2`), lock));
  for (const { file, text } of readmes) writeFileSync(file, text.replace(README_VERSION_RE, renderReadmeVersion(next)));
  console.log(`${current} → ${next} (${level})`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) main();
