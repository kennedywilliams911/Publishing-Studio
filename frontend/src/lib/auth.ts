import { jwtVerify } from "jose";
import { cookies } from "next/headers";

const SESSION_COOKIE = "pastor_session";

export type SessionPayload = {
  userId: string;
  email: string;
  name: string;
  role: "SUPER_ADMIN" | "ADMIN";
  subscriptionStatus:
    | "TRIALING"
    | "ACTIVE"
    | "PAST_DUE"
    | "CANCELED"
    | "INCOMPLETE"
    | "INACTIVE";
  trialEndsAt: string | null;
};

/**
 * Reads and verifies the session cookie set by the backend, purely for
 * display purposes on the frontend (e.g. showing the pastor's name in the
 * sidebar). This does NOT authorize anything — every mutating request is
 * independently authorized by the backend API, which owns the source of
 * truth for sessions. AUTH_SECRET must match the backend's exactly.
 */
export async function getCurrentSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const secret = process.env.AUTH_SECRET;
  if (!secret) return null;

  try {
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(secret),
    );
    if (
      typeof payload.userId === "string" &&
      typeof payload.email === "string" &&
      typeof payload.name === "string" &&
      (payload.role === "SUPER_ADMIN" || payload.role === "ADMIN") &&
      typeof payload.subscriptionStatus === "string"
    ) {
      return {
        userId: payload.userId,
        email: payload.email,
        name: payload.name,
        role: payload.role,
        subscriptionStatus:
          payload.subscriptionStatus as SessionPayload["subscriptionStatus"],
        trialEndsAt:
          typeof payload.trialEndsAt === "string" ? payload.trialEndsAt : null,
      };
    }
    return null;
  } catch {
    return null;
  }
}
