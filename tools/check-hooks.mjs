// tools/check-hooks.mjs — after `npm install`, reminds that the git hooks are not installed.
// It only says so, and never fails an installation: installing hooks behind someone's back is not
// the job of `npm install`. Silent outside a git repository and in CI.

import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
if (existsSync(join(ROOT, ".git")) && !process.env.CI && !["pre-commit", "post-commit"].every((h) => existsSync(join(ROOT, ".git", "hooks", h)))) {
  console.log("\n  Git hooks are not installed: commits will not be checked nor versioned.\n    npm run setup-hooks\n");
}
