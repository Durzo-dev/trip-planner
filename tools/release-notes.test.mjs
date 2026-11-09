// Release note (tools/release-notes.mjs) and the files the release workflow relies on.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildReleaseNotes, extractChangelogSection, normaliseRepoUrl } from "./release-notes.mjs";

const CHANGELOG = "# Changelog\n\nIntro.\n\n## v0.3.0\n\nNewer.\n\n## v0.2.0 First release\n\n### For you\n\nDrafts.\n\n## v0.1.0\n\nOld.\n";
const repoUrl = "https://github.com/Durzo-dev/trip-planner";

describe("extractChangelogSection", () => {
  it("takes the section titled exactly with the tag, up to the next one", () => {
    expect(extractChangelogSection(CHANGELOG, "v0.2.0")).toBe("### For you\n\nDrafts.");
    expect(extractChangelogSection(CHANGELOG, "v0.1.0")).toBe("Old.");
  });
  it("finds nothing for another tag, nor for a prefix of a tag", () => {
    expect(extractChangelogSection(CHANGELOG, "v0.4.0")).toBeNull();
    expect(extractChangelogSection(CHANGELOG, "v0.2")).toBeNull();
    expect(extractChangelogSection("## Unreleased\n\nSoon.", "v0.4.0")).toBeNull();
  });
});

describe("buildReleaseNotes", () => {
  it("puts the written section first and folds the commits under it", () => {
    const note = buildReleaseNotes({ tag: "v0.2.0", previousTag: "v0.1.0", subjects: ["B", "A"], repoUrl, changelog: CHANGELOG });
    expect(note.startsWith("### For you\n\nDrafts.")).toBe(true);
    expect(note).toContain("<summary>The 2 commits of this version</summary>");
    expect(note).toContain(`${repoUrl}/compare/v0.1.0...v0.2.0`);
  });
  it("falls back to the commit subjects, and says when it is the first release", () => {
    expect(buildReleaseNotes({ tag: "v0.4.0", previousTag: "v0.3.0", subjects: ["B", " ", "A"], repoUrl })).toBe(
      `**2 change(s) since v0.3.0.**\n\n- B\n- A\n\n---\n\n**Full diff:** ${repoUrl}/compare/v0.3.0...v0.4.0`,
    );
    expect(buildReleaseNotes({ tag: "v0.2.0", previousTag: null, subjects: ["A"], repoUrl: "" })).toBe("**First release: 1 change(s).**\n\n- A");
  });
  it("says when there is no commit rather than publishing an empty note", () => {
    expect(buildReleaseNotes({ tag: "v0.4.0", previousTag: "v0.3.0", subjects: [""], repoUrl: "" })).toContain("_No commit between");
  });
  it("cuts a very long list and says so", () => {
    const subjects = Array.from({ length: 205 }, (_, i) => `c${i}`);
    const note = buildReleaseNotes({ tag: "v1.0.0", previousTag: "v0.9.0", subjects, repoUrl: "" });
    expect(note.match(/^- /gm)).toHaveLength(200);
    expect(note).toContain("_… and 5 more");
  });
});

it("normaliseRepoUrl reads https and ssh remotes", () => {
  expect(normaliseRepoUrl("git@github.com:Durzo-dev/trip-planner.git")).toBe(repoUrl);
  expect(normaliseRepoUrl(`${repoUrl}.git`)).toBe(repoUrl);
});

describe("release files", () => {
  const changelog = (f) => readFileSync(new URL(`../${f}`, import.meta.url), "utf8");
  const versions = (text) => [...text.matchAll(/^## (.*)$/gm)].map((m) => m[1].split(" ")[0]);
  // No section until a version is decided; each one then gets its section in both languages
  it("titles every CHANGELOG section ## vX.Y.Z, the same ones in both languages", () => {
    const en = versions(changelog("CHANGELOG.md"));
    en.forEach((v) => expect(v).toMatch(/^v\d+\.\d+\.\d+$/));
    expect(versions(changelog("CHANGELOG.fr.md"))).toEqual(en);
  });
  it("checks out the whole history in the release workflow, or every release calls itself the first", () => {
    const yml = readFileSync(new URL("../.github/workflows/release.yml", import.meta.url), "utf8");
    expect(yml).toMatch(/fetch-depth:\s*0/);
    expect(yml).toContain("tools/release-notes.mjs");
  });
});
