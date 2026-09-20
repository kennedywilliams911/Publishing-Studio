import type { Request, Response, NextFunction } from "express";
import { getSessionFromRequest, SessionPayload } from "../lib/auth";
import { prisma } from "../lib/prisma";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      session?: SessionPayload;
      userId?: string;
    }
  }
}

export function requireRole(...roles: SessionPayload["role"][]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.session || !roles.includes(req.session.role)) {
      return res
        .status(403)
        .json({ error: "You do not have permission to access this resource." });
    }
    next();
  };
}

export async function requireActiveSubscription(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (req.session?.role === "SUPER_ADMIN") return next();
  const status = req.session?.subscriptionStatus;
  if (status !== "TRIALING" && status !== "ACTIVE") {
    return res
      .status(402)
      .json({ error: "An active subscription is required." });
  }
  next();
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: { subscriptions: { orderBy: { updatedAt: "desc" }, take: 1 } },
  });
  if (!user || user.status === "SUSPENDED") {
    return res.status(403).json({ error: "Your account is suspended." });
  }
  const subscription = user.subscriptions[0];
  const trialExpired =
    subscription?.status === "TRIALING" &&
    subscription.trialEndsAt &&
    subscription.trialEndsAt <= new Date();
  if (trialExpired && subscription) {
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: { status: "INACTIVE" },
    });
  }
  session.role = user.role;
  session.subscriptionStatus = trialExpired
    ? "INACTIVE"
    : (subscription?.status ?? "INACTIVE");
  session.trialEndsAt = subscription?.trialEndsAt?.toISOString() ?? null;
  req.session = session;
  req.userId = session.userId;
  next();
}
