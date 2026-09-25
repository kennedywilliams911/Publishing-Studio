/**
 * Every data access in the frontend goes through this module instead of a
 * database client — the frontend has none. The backend (a separate Express
 * + Prisma service) is the only thing that talks to Postgres.
 *
 * Server Components need this too (so public pages can still be rendered on
 * the server for SEO / social-preview purposes), so `apiFetch` forwards the
 * incoming request's cookies when called from server-side code.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

type FetchOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  cache?: RequestCache;
  revalidate?: number;
  tags?: string[];
  forwardCookies?: boolean;
};

async function getForwardedCookieHeader(): Promise<string | undefined> {
  if (typeof window !== "undefined") return undefined; // browser sends cookies automatically

  try {
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    const all = cookieStore.getAll();
    if (all.length === 0) return undefined;
    return all.map((c) => `${c.name}=${c.value}`).join("; ");
  } catch {
    // During prerender/build there may be no request context, so there is
    // nothing to forward. In those cases we simply skip cookie propagation.
    return undefined;
  }
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function apiFetch<T = unknown>(
  path: string,
  options: FetchOptions = {},
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const cookieHeader =
    options.forwardCookies === false
      ? undefined
      : await getForwardedCookieHeader();
  if (cookieHeader) headers["Cookie"] = cookieHeader;

  const defaultCache: RequestCache = "no-store";
  const cacheOptions =
    options.revalidate === undefined
      ? { cache: options.cache ?? defaultCache }
      : {
          next: {
            revalidate: options.revalidate,
            ...(options.tags ? { tags: options.tags } : {}),
          },
        };

  const res = await fetch(`${API_URL}${path}`, {
    method: options.method || "GET",
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    credentials: "include",
    ...cacheOptions,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiError(
      data?.error || "Something went wrong. Please try again.",
      res.status,
    );
  }

  return data as T;
}

/** For Server Components: returns null instead of throwing on 404 / auth failures. */
export async function apiFetchSafe<T = unknown>(
  path: string,
  options: FetchOptions = {},
): Promise<T | null> {
  try {
    return await apiFetch<T>(path, options);
  } catch (error) {
    console.error("API FETCH ERROR:", path, error);
    return null;
  }
}

export { API_URL };
