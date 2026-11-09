// tools/release-notes.mjs — the text published with a GitHub release (.github/workflows/release.yml).
//
// Kept out of the workflow's YAML so that it can be tested: a workflow only runs on the server, when a
// tag is pushed, the worst moment to find out it writes an empty note. buildReleaseNotes is pure and
// tools/release-notes.test.mjs checks it on every commit.
//
// What is published, by order of preference:
//   1. the section of CHANGELOG.md titled exactly "## <tag>", written by hand: it tells what changes
//      for the people using the site apart from the work under the hood, which no tool can guess;
//   2. failing that, the subjects of the commits since the previous tag: flat, but never wrong.
// With a written section, the subjects follow in a folded <details> block. Commit bodies are never
// published. Both forms end with a link comparing the two tags.
//
// Usage: node tools/release-notes.mjs [tag]   (default: the tag exactly on HEAD)

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

/** GitHub cuts a release body at 125,000 characters anyway: cut first, and say so. */
const MAX_SUBJECTS = 200;

/**
 * The note, from what git and CHANGELOG.md hold.
 * @param {{ tag: string, previousTag: string | null, subjects: string[], repoUrl: string, changelog?: string }} o
 *   subjects: commit subjects, newest first; repoUrl: https URL of the repository, without ".git".
 */
export function buildReleaseNotes({ tag, previousTag, subjects, repoUrl, changelog = "" }) {
  const all = subjects.map((s) => s.trim()).filter(Boolean);
  const cut = all.length > MAX_SUBJECTS;
  const shown = cut ? all.slice(0, MAX_SUBJECTS) : all;
  const written = extractChangelogSection(changelog, tag);
  const lines = [];

  if (written) lines.push(written, "");
  else if (previousTag) lines.push(`**${all.length} change(s) since ${previousTag}.**`, "");
  else lines.push(`**First release: ${all.length} change(s).**`, "");

  if (!shown.length) {
    // A tag set on a commit already tagged: better said than an empty note
    lines.push("_No commit between this tag and the previous one._");
  } else if (written) {
    lines.push("<details>", `<summary>The ${all.length} commits of this version</summary>`, "");
    shown.forEach((s) => lines.push(`- ${s}`));
    if (cut) lines.push("", `_… and ${all.length - MAX_SUBJECTS} more._`);
    lines.push("", "</details>");
  } else {
    shown.forEach((s) => lines.push(`- ${s}`));
    if (cut) lines.push("", `_… and ${all.length - MAX_SUBJECTS} more, see the comparison below._`);
  }

  if (repoUrl) lines.push("", "---", "", `**Full diff:** ${repoUrl}/${previousTag ? `compare/${previousTag}...${tag}` : `commits/${tag}`}`);
  return lines.join("\n");
}

/**
 * The CHANGELOG.md section of this tag, or null. The title must be exactly "## <tag>" (words may follow
 * after a space). No "Unreleased" section is ever picked up: left unrenamed, it would be published again
 * with the next version, and a wrong note is worse than a generated one.
 */
export function extractChangelogSection(changelog, tag) {
  if (!changelog || !tag) return null;
  const lines = changelog.split("\n");
  const title = new RegExp(`^##\\s+${tag.replace(/[.\\+*?^$()[\]{}|]/g, "\\$&")}(\\s|$)`);
  const start = lines.findIndex((l) => title.test(l));
  if (start === -1) return null;
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((l) => /^##\s/.test(l));
  const body = (end === -1 ? rest : rest.slice(0, end)).join("\n").trim();
  return body || null;
}

/** https URL of the repository, whether the remote is https or ssh. */
export const normaliseRepoUrl = (remote) =>
  remote ? remote.replace(/^git@([^:]+):/, "https://$1/").replace(/\.git$/, "").replace(/\/$/, "") : "";

/** Read-only git, without a shell. Expected failures (no earlier tag, no remote) are caught by the caller. */
const git = (...args) => execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();

function main() {
  const tag = process.argv[2] ?? git("describe", "--tags", "--exact-match");
  let previousTag = null;
  try {
    previousTag = git("describe", "--abbrev=0", "--tags", "--match", "v*", `${tag}^`);
  } catch {
    // First release: no earlier tag
  }
  const subjects = git("log", "--no-merges", "--format=%s", previousTag ? `${previousTag}..${tag}` : tag).split("\n");
  let repoUrl = "";
  try {
    repoUrl = normaliseRepoUrl(git("remote", "get-url", "origin"));
  } catch {
    // No remote
  }
  let changelog = "";
  try {
    changelog = readFileSync(new URL("../CHANGELOG.md", import.meta.url), "utf8");
  } catch {
    // No changelog: the commit subjects are published
  }
  process.stdout.write(buildReleaseNotes({ tag, previousTag, subjects, repoUrl, changelog }) + "\n");
}

if (process.argv[1]?.endsWith("release-notes.mjs")) main();
