import { Router } from "express";
import { createHash, randomBytes, randomInt } from "node:crypto";
import { prisma } from "../lib/prisma";
import {
  hashPassword,
  verifyPassword,
  setSessionCookie,
  clearSessionCookie,
} from "../lib/auth";
import {
  loginInputSchema,
  registerInputSchema,
  requestOtpInputSchema,
  forgotPasswordInputSchema,
  resetPasswordInputSchema,
} from "../lib/validation";
import { requireAuth } from "../middleware/requireAuth";
import { sendPasswordResetEmail, sendVerificationCode } from "../lib/email";

const router = Router();

// Very small in-memory rate limiter to slow down credential stuffing.
// For a multi-instance deployment, replace with a shared store (e.g. Redis).
const attempts = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 10;
const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_RESEND_WINDOW_MS = 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;
const otpRequests = new Map<string, number>();

function hashOtp(email: string, code: string) {
  return createHash("sha256")
    .update(`${process.env.AUTH_SECRET}:${email}:${code}`)
    .digest("hex");
}

function hashResetToken(token: string) {
  return createHash("sha256")
    .update(`${process.env.AUTH_SECRET}:${token}`)
    .digest("hex");
}

router.post("/forgot-password", async (req, res) => {
  const parsed = forgotPasswordInputSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.json({
      message: "If an account exists, reset instructions have been sent.",
    });
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });
  if (!user) {
    return res.json({
      message: "If an account exists, reset instructions have been sent.",
    });
  }

  const token = randomBytes(32).toString("hex");
  await prisma.passwordResetToken.updateMany({
    where: { userId: user.id, usedAt: null },
    data: { usedAt: new Date() },
  });
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: hashResetToken(token),
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    },
  });

  try {
    await sendPasswordResetEmail(user.email, token);
  } catch (error) {
    console.error("Password reset email failed:", error);
  }

  return res.json({
    message: "If an account exists, reset instructions have been sent.",
  });
});

router.post("/reset-password", async (req, res) => {
  const parsed = resetPasswordInputSchema.safeParse(req.body);
  if (!parsed.success)
    return res
      .status(400)
      .json({ error: "Enter a valid reset token and password." });

  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashResetToken(parsed.data.token) },
  });
  if (!resetToken || resetToken.usedAt || resetToken.expiresAt <= new Date()) {
    return res
      .status(400)
      .json({ error: "This password reset link is invalid or expired." });
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: resetToken.userId },
      data: { passwordHash: await hashPassword(parsed.data.password) },
    }),
    prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { usedAt: new Date() },
    }),
  ]);

  return res.json({ message: "Password reset successfully." });
});

router.post("/request-otp", async (req, res) => {
  const ip = req.ip ?? "unknown";
  if (isRateLimited(`otp-ip:${ip}`)) {
    return res.status(429).json({
      error: "Too many verification requests. Please try again later.",
    });
  }

  const parsed = requestOtpInputSchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ error: "Enter a valid email address." });

  const { email } = parsed.data;
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing)
    return res
      .status(409)
      .json({ error: "An account with that email already exists." });

  const now = Date.now();
  const lastRequest = otpRequests.get(email);
  if (lastRequest && now - lastRequest < OTP_RESEND_WINDOW_MS) {
    return res.status(429).json({
      error: "Please wait a minute before requesting another code.",
    });
  }

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const verification = await prisma.emailVerificationCode.create({
    data: {
      email,
      codeHash: hashOtp(email, code),
      expiresAt: new Date(now + OTP_TTL_MS),
    },
  });

  try {
    await sendVerificationCode(email, code);
    otpRequests.set(email, now);
    return res.json({ message: "Verification code sent." });
  } catch (error) {
    await prisma.emailVerificationCode.delete({
      where: { id: verification.id },
    });
    console.error("Verification email failed:", error);
    return res.status(503).json({
      error:
        "Verification email is temporarily unavailable. Please try again later.",
    });
  }
});

async function sessionForUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { subscriptions: { orderBy: { updatedAt: "desc" }, take: 1 } },
  });
  if (!user) return null;
  const subscription = user.subscriptions[0];
  return {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    subscriptionStatus: subscription?.status ?? "INACTIVE",
    trialEndsAt: subscription?.trialEndsAt?.toISOString() ?? null,
  } as const;
}

router.post("/register", async (req, res) => {
  const parsed = registerInputSchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({
      error:
        "Enter a valid name, email, and password of at least 8 characters.",
    });

  const { name, email, password, otp } = parsed.data;
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing)
    return res
      .status(409)
      .json({ error: "An account with that email already exists." });

  const verification = await prisma.emailVerificationCode.findFirst({
    where: {
      email,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });
  if (!verification)
    return res.status(400).json({
      error: "Your verification code is missing or has expired.",
    });

  const validOtp = verification.codeHash === hashOtp(email, otp);
  if (!validOtp) {
    const attempts = verification.attempts + 1;
    await prisma.emailVerificationCode.update({
      where: { id: verification.id },
      data: {
        attempts,
        ...(attempts >= MAX_OTP_ATTEMPTS ? { usedAt: new Date() } : {}),
      },
    });
    return res.status(400).json({
      error:
        attempts >= MAX_OTP_ATTEMPTS
          ? "Too many incorrect codes. Request a new verification code."
          : "That verification code is incorrect.",
    });
  }

  const trialEndsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const user = await prisma.$transaction(async (transaction) => {
    const claimed = await transaction.emailVerificationCode.updateMany({
      where: { id: verification.id, usedAt: null },
      data: { usedAt: new Date() },
    });
    if (claimed.count !== 1) throw new Error("Verification code already used.");

    return transaction.user.create({
      data: {
        name,
        email,
        passwordHash: await hashPassword(password),
        role: "ADMIN",
        profile: {
          create: { pastorName: name, contactEmail: email, socialLinks: {} },
        },
        subscriptions: { create: { status: "TRIALING", trialEndsAt } },
      },
    });
  });
  const session = await sessionForUser(user.id);
  if (!session)
    return res.status(500).json({ error: "Could not create the account." });
  await setSessionCookie(res, session);
  return res
    .status(201)
    .json({ success: true, user: { name, email, role: "ADMIN" }, trialEndsAt });
});

function isRateLimited(key: string) {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || now > entry.resetAt) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_ATTEMPTS;
}

router.post("/login", async (req, res) => {
  const ip = req.ip ?? "unknown";
  if (isRateLimited(ip)) {
    return res
      .status(429)
      .json({ error: "Too many login attempts. Please try again later." });
  }

  const parsed = loginInputSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Enter a valid email and password." });
  }

  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });

  // Always compare against a hash (even a dummy one) to avoid timing leaks
  // that reveal whether an email address exists.
  const validPassword = user
    ? await verifyPassword(password, user.passwordHash)
    : await verifyPassword(
        password,
        "$2a$12$invalidsaltinvalidsaltinvalidsalthash",
      );

  if (!user || !validPassword) {
    return res.status(401).json({ error: "Incorrect email or password." });
  }

  if (user.status === "SUSPENDED") {
    return res.status(403).json({ error: "Your account is suspended." });
  }

  const session = await sessionForUser(user.id);
  if (!session)
    return res.status(500).json({ error: "Could not create a session." });
  await setSessionCookie(res, session);
  attempts.delete(ip);
  res.json({
    success: true,
    user: { name: user.name, email: user.email, role: user.role },
  });
});

router.post("/logout", (_req, res) => {
  clearSessionCookie(res);
  res.json({ success: true });
});

router.get("/me", requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    select: { id: true, name: true, email: true, role: true, profile: true },
  });
  if (!user) return res.status(404).json({ error: "User not found." });
  res.json({ user });
});

export default router;
