/**
 * Guards of the design system: raw colours, text sizes and radii are written only in tokens.css (and
 * colours computed from a trip's theme only in theme.ts), and every variable a stylesheet or the code
 * uses is defined somewhere. Without these, the first hurried screen would bring raw values back.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = join(__dirname, "..");
const files = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p) : [p];
  });
const rel = (p: string) => relative(SRC, p).replaceAll("\\", "/");

// The preview pages (src/dev) are development tools with their own neutral look; tests hold fixtures.
const all = files(SRC).filter((p) => !rel(p).startsWith("dev/") && !/\.test\.ts$/.test(p));
const css = all.filter((p) => p.endsWith(".css"));
const ts = all.filter((p) => p.endsWith(".ts"));
const TOKENS = "styles/tokens.css";
const THEME = "theme.ts";

const HEX = /#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?(?:[0-9a-fA-F]{2})?(?![\w-])/g;
const RGB = /\b(?:rgb|rgba|hsl|hsla)\(/g;

function offenders(paths: string[], pattern: RegExp, except: string[]): string[] {
  return paths
    .filter((p) => !except.includes(rel(p)))
    .flatMap((p) => readFileSync(p, "utf8").split("\n").flatMap((line, i) => (line.match(pattern) ? [`${rel(p)}:${i + 1}: ${line.trim()}`] : [])));
}

describe("design system", () => {
  it("has guards that see the files they guard", () => {
    expect(css.map(rel)).toEqual(expect.arrayContaining([TOKENS, "styles/components.css", "styles.css", "admin/admin.css"]));
    expect(ts.map(rel)).toEqual(expect.arrayContaining([THEME, "ui/programme.ts", "ui/weatherPanel.ts"]));
  });

  it("writes colours only in tokens.css (and the trip-theme maths in theme.ts)", () => {
    expect(offenders(css, HEX, [TOKENS])).toEqual([]);
    expect(offenders(css, RGB, [TOKENS])).toEqual([]);
    expect(offenders(ts, HEX, [THEME])).toEqual([]);
  });

  it("takes every text size and corner radius from the scales", () => {
    expect(offenders(css, /font-size:\s*[0-9.]+(px|rem|em)/, [TOKENS])).toEqual([]);
    expect(offenders(css, /border-radius:\s*(?!0[;\s}])[0-9.]+(px|%|rem)/, [TOKENS])).toEqual([]);
  });

  it("uses no variable that nothing defines", () => {
    const sources = [...css, ...ts].map((p) => readFileSync(p, "utf8"));
    const defined = new Set<string>();
    for (const text of sources) {
      for (const m of text.matchAll(/(--[\w-]+)\s*:/g)) defined.add(m[1]);
      for (const m of text.matchAll(/setProperty\(\s*["'`](--[\w-]+)/g)) defined.add(m[1]);
      for (const m of text.matchAll(/\bset\(\s*"(--[\w-]+)"/g)) defined.add(m[1]);
    }
    const used = new Set<string>();
    for (const text of sources) for (const m of text.matchAll(/var\((--[\w-]+)(?![\w$-]*\$\{)/g)) used.add(m[1]);
    // Built from a number in code: var(--face-${n})
    for (let n = 1; n <= 6; n++) expect(defined, `--face-${n}`).toContain(`--face-${n}`);
    expect([...used].filter((v) => !defined.has(v))).toEqual([]);
  });

  it("catches a raw colour when one slips in (the guard itself works)", () => {
    expect("color: #C0392B;".match(HEX)).not.toBeNull();
    expect('querySelector("#add-day")'.match(HEX)).toBeNull();
    expect("background: rgba(0,0,0,.2)".match(RGB)).not.toBeNull();
  });
});
