/**
 * Where stored trips and sign-in come from: Supabase, or in development with ?mock in the address, an
 * in-memory stand-in with sample data (src/dev/mockDb.ts) so every screen can be previewed without an
 * account. The stand-in is never part of a production build.
 */
export type DataSource = typeof import("./db");

export const usingMock = (): boolean => import.meta.env.DEV && new URLSearchParams(location.search).has("mock");

export const dataConfigured = (): boolean =>
  usingMock() || Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);

export function loadDataSource(): Promise<DataSource> {
  if (import.meta.env.DEV && usingMock()) return import("./dev/mockDb");
  return import("./db");
}
