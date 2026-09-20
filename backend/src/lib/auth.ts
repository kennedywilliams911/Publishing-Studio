import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import type { Request, Response } from "express";

export const SESSION_COOKIE = "pastor_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7; // 7 days

function getSecretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "AUTH_SECRET is not set or too short. Set a long random string in your .env file.",
    );
  }
  return new TextEncoder().encode(secret);
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

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

export async function createSessionToken(payload: SessionPayload) {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(getSecretKey());
}

export async function verifySessionToken(
  token: string,
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
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

/**
 * Whether frontend and backend are deployed on different registrable domains.
 * When true, the session cookie must use SameSite=None (which requires
 * Secure=true, i.e. HTTPS) so the browser will still send it on cross-site
 * fetch requests from the frontend. For same-site setups (including local
 * dev across two localhost ports) SameSite=Lax is both sufficient and safer.
 */
const CROSS_SITE = process.env.CROSS_SITE_COOKIES === "true";

export function cookieOptions() {
  return {
    httpOnly: true,
    secure: CROSS_SITE || process.env.NODE_ENV === "production",
    sameSite: (CROSS_SITE ? "none" : "lax") as "none" | "lax",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS * 1000,
    // Only needed when the frontend and backend are deployed on subdomains
    // of the same parent domain in production (e.g. app.example.com +
    // api.example.com) — set COOKIE_DOMAIN=".example.com" so the session
    // cookie is shared across both. Without this, a genuinely separate
    // frontend domain can still call the backend directly from the browser
    // (client-side actions keep working via CORS + credentials), but the
    // frontend's own server (SSR pages, edge middleware) won't see the
    // cookie, since it belongs to the backend's host. Leave unset for local
    // dev — localhost:3000 and localhost:4000 already share a cookie
    // because cookie scoping ignores port.
    domain: process.env.COOKIE_DOMAIN || undefined,
  };
}

export async function setSessionCookie(res: Response, payload: SessionPayload) {
  const token = await createSessionToken(payload);
  res.cookie(SESSION_COOKIE, token, cookieOptions());
}

export function clearSessionCookie(res: Response) {
  res.clearCookie(SESSION_COOKIE, { ...cookieOptions(), maxAge: undefined });
}

export async function getSessionFromRequest(
  req: Request,
): Promise<SessionPayload | null> {
  const token = req.cookies?.[SESSION_COOKIE];
  if (!token) return null;
  return verifySessionToken(token);
}
