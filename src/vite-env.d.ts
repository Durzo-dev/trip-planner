/// <reference types="vite/client" />

/** The application version, from package.json (set by vite.config.ts at build time). */
declare const __APP_VERSION__: string;

interface ImportMetaEnv {
  /** Supabase project URL; without it the site only shows trip files. */
  readonly VITE_SUPABASE_URL?: string;
  /** Supabase public (anon) key: safe in the page, access is enforced by row-level security. */
  readonly VITE_SUPABASE_ANON_KEY?: string;
  /** "true" once Google sign-in is set up in Supabase. */
  readonly VITE_AUTH_GOOGLE?: string;
}
