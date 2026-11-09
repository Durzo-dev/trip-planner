import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "vite";

// The version shown in the settings dialog comes from package.json, its only source (tools/bump-version.mjs).
const { version } = JSON.parse(readFileSync(resolve(__dirname, "package.json"), "utf8")) as { version: string };

// GitHub Pages serves the site from /<repo-name>/; BASE_PATH lets other hosts use "/".
// Two pages: the trip (index.html) and the organisers' admin (admin.html).
export default defineConfig({
  base: process.env.BASE_PATH ?? "/trip-planner/",
  define: { __APP_VERSION__: JSON.stringify(version) },
  build: {
    rollupOptions: {
      input: { main: resolve(__dirname, "index.html"), admin: resolve(__dirname, "admin.html") },
    },
  },
});
