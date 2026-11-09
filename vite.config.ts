import { resolve } from "node:path";
import { defineConfig } from "vite";

// GitHub Pages serves the site from /<repo-name>/; BASE_PATH lets other hosts use "/".
// Two pages: the trip (index.html) and the organisers' admin (admin.html).
export default defineConfig({
  base: process.env.BASE_PATH ?? "/trip-planner/",
  build: {
    rollupOptions: {
      input: { main: resolve(__dirname, "index.html"), admin: resolve(__dirname, "admin.html") },
    },
  },
});
