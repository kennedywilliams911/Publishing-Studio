import { Router } from "express";
import crypto from "node:crypto";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/requireAuth";

const router = Router();
const trialDays = 7;
const PAYSTACK_API = "https://api.paystack.co";

async function paystack(path: string, options: RequestInit = {}) {
  return fetch(`${PAYSTACK_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
}

router.post("/checkout", requireAuth, async (req, res) => {
  if (
    !process.env.PAYSTACK_SECRET_KEY ||
    !process.env.PAYSTACK_PLAN_CODE ||
    !process.env.PAYSTACK_AMOUNT
  ) {
    return res.status(503).json({ error: "Billing is not configured." });
  }
  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  const current = await prisma.subscription.findFirst({
    where: {
      userId: user.id,
      status: { in: ["TRIALING", "ACTIVE", "PAST_DUE"] },
    },
  });
  if (current?.status === "TRIALING") {
    return res
      .status(409)
      .json({
        error:
          "Your free trial is still active. Payment can be started after the trial ends.",
      });
  }
  if (current?.providerSubscriptionId) {
    return res
      .status(409)
      .json({ error: "You already have an active subscription." });
  }

  const callbackUrl =
    process.env.PAYSTACK_CALLBACK_URL ||
    "http://localhost:3000/admin/billing?success=1";
  const response = await paystack("/transaction/initialize", {
    method: "POST",
    body: JSON.stringify({
      email: user.email,
      amount: process.env.PAYSTACK_AMOUNT,
      plan: process.env.PAYSTACK_PLAN_CODE,
      callback_url: callbackUrl,
      metadata: { userId: user.id },
    }),
  });
  const result = (await response.json()) as {
    status: boolean;
    message?: string;
    data?: { authorization_url: string; reference: string };
  };
  if (!response.ok || !result.status || !result.data)
    return res
      .status(502)
      .json({
        error: result.message || "Could not initialize Paystack checkout.",
      });
  await prisma.subscription.upsert({
    where: { userId: user.id },
    update: {
      providerPlanId: process.env.PAYSTACK_PLAN_CODE,
    },
    create: {
      userId: user.id,
      providerPlanId: process.env.PAYSTACK_PLAN_CODE,
      status: "INCOMPLETE",
    },
  });
  res.json({
    url: result.data.authorization_url,
    reference: result.data.reference,
  });
});

router.post("/portal", requireAuth, async (req, res) => {
  return res
    .status(501)
    .json({
      error:
        "Paystack does not provide a hosted billing portal. Manage payment details through checkout or contact support.",
    });
});

router.get("/subscription", requireAuth, async (req, res) => {
  const subscription = await prisma.subscription.findFirst({
    where: { userId: req.userId },
    orderBy: { updatedAt: "desc" },
  });
  res.json({ subscription });
});

router.post("/webhook", async (req, res) => {
  if (!process.env.PAYSTACK_SECRET_KEY || !process.env.PAYSTACK_WEBHOOK_SECRET)
    return res.status(503).end();
  const signature = crypto
    .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY)
    .update(req.body)
    .digest("hex");
  if (signature !== req.headers["x-paystack-signature"]) {
    return res.status(400).json({ error: "Invalid webhook signature." });
  }
  const event = JSON.parse(req.body.toString()) as {
    event: string;
    data: {
      reference?: string;
      metadata?: { userId?: string };
      plan?: { plan_code?: string };
      customer?: { customer_code?: string };
    };
  };
  if (event.event === "charge.success" && event.data.metadata?.userId) {
    const userSubscription = await prisma.subscription.findUnique({
      where: { userId: event.data.metadata.userId },
    });
    if (userSubscription) {
      await prisma.subscription.update({
        where: { id: userSubscription.id },
        data: {
          providerSubscriptionId: event.data.reference,
          providerCustomerId: event.data.customer?.customer_code,
          providerPlanId:
            event.data.plan?.plan_code || process.env.PAYSTACK_PLAN_CODE,
          status: "ACTIVE",
          trialEndsAt: null,
          currentPeriodStart: new Date(),
        },
      });
    }
  }
  res.json({ received: true });
});

export default router;
