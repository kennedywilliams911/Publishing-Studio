/**
 * Client Component counterpart to lib/api.ts's server-side apiFetch. Browser
 * fetches to the backend need `credentials: "include"` (to send the session
 * cookie cross-origin) instead of manual cookie forwarding.
 */
export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export function apiUrl(path: string) {
  return `/api/backend${path}`;
}
