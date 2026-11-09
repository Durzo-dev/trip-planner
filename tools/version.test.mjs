// Version policy (tools/bump-version.mjs) and the coherence of the files carrying the version.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  PACKAGE_LOCK, READMES, bumpVersion, formatVersion, parseVersion, readLockVersions, readPackageVersion,
  readReadmeVersion, shouldAutoBump, tagForBump,
} from "./bump-version.mjs";
import { POST_COMMIT, PRE_COMMIT } from "./setup-hooks.mjs";

describe("parseVersion", () => {
  it("reads and writes back major.minor.patch", () => {
    expect(parseVersion(" 10.0.42 ")).toEqual({ major: 10, minor: 0, patch: 42 });
    expect(formatVersion({ major: 1, minor: 2, patch: 3 })).toBe("1.2.3");
  });
  it.each(["1.2", "1.2.3.4", "v1.2.3", "1.2.x", "", null, undefined])("refuses %j", (bad) => {
    expect(() => parseVersion(bad)).toThrow(/Unreadable version/);
  });
});

describe("bumpVersion", () => {
  it("patch: the third number", () => expect(bumpVersion("1.4.9", "patch")).toBe("1.4.10"));
  it("minor: the second number, patch back to 0", () => expect(bumpVersion("2.9.3", "minor")).toBe("2.10.0"));
  it("major: the first number, the others back to 0", () => expect(bumpVersion("1.4.12", "major")).toBe("2.0.0"));
  it("sync: unchanged", () => expect(bumpVersion("3.2.1", "sync")).toBe("3.2.1"));
  it("refuses an unknown level", () => {
    expect(() => bumpVersion("1.0.0", "majeur")).toThrow(/Unknown level/);
    expect(() => bumpVersion("1.0.0", undefined)).toThrow(/Unknown level/);
  });
});

describe("hooks' decisions", () => {
  it("bumps the patch unless the version was already changed by hand", () => {
    expect(shouldAutoBump("1.2.3", "1.2.3")).toBe(true);
    expect(shouldAutoBump("1.2.3", "1.3.0")).toBe(false);
    expect(shouldAutoBump("", "0.1.0")).toBe(true);
  });
  it("tags minor and major versions only", () => {
    expect(tagForBump("1.2.3", "1.2.4")).toBeNull();
    expect(tagForBump("1.2.3", "1.3.0")).toBe("v1.3.0");
    expect(tagForBump("1.9.9", "2.0.0")).toBe("v2.0.0");
    expect(tagForBump("", "1.0.0")).toBeNull();
  });
  it("runs the checks before the bump, and adds every file carrying the version", () => {
    expect(PRE_COMMIT.indexOf("vitest run")).toBeLessThan(PRE_COMMIT.indexOf("bump-version.mjs patch"));
    expect(PRE_COMMIT).toContain("git add package.json package-lock.json README.md README.fr.md");
    expect(POST_COMMIT).toContain("git push --follow-tags");
  });
});

describe("files carrying the version", () => {
  it("all say the version of package.json", () => {
    const v = readPackageVersion();
    expect(READMES.map(readReadmeVersion)).toEqual([v, v]);
    expect(readLockVersions(readFileSync(PACKAGE_LOCK, "utf8"))).toEqual([v, v]);
  });
});
