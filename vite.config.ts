import { defineConfig } from "vite";

// GitHub Pages serves the site from /<repo-name>/; BASE_PATH lets other hosts use "/".
export default defineConfig({
  base: process.env.BASE_PATH ?? "/trip-planner/",
});
