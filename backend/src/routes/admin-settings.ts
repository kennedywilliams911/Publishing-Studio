import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { verifyPassword, hashPassword, clearSessionCookie } from "../lib/auth";
import { requireAuth } from "../middleware/requireAuth";

const router = Router();
router.use(requireAuth);

const passwordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, "New password must be at least 8 characters."),
});

const deleteAccountSchema = z.object({
  currentPassword: z.string().min(1, "Enter your current password."),
});

router.patch("/password", async (req, res) => {
  const parsed = passwordSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
    });
  }

  const user = await prisma.user.findUnique({
    where: { id: req.session!.userId },
  });
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const valid = await verifyPassword(
    parsed.data.currentPassword,
    user.passwordHash,
  );
  if (!valid) {
    return res
      .status(400)
      .json({ error: "Your current password is incorrect." });
  }

  const passwordHash = await hashPassword(parsed.data.newPassword);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

  res.json({ success: true });
});

router.delete("/account", async (req, res) => {
  const parsed = deleteAccountSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
    });
  }

  const user = await prisma.user.findUnique({
    where: { id: req.session!.userId },
  });
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const valid = await verifyPassword(
    parsed.data.currentPassword,
    user.passwordHash,
  );
  if (!valid) {
    return res
      .status(400)
      .json({ error: "Your current password is incorrect." });
  }

  try {
    await prisma.user.delete({ where: { id: user.id } });
    clearSessionCookie(res);
    return res.json({ success: true });
  } catch (error) {
    console.error("Delete account failed:", error);
    return res.status(409).json({
      error:
        "This account cannot be deleted because related records still exist.",
    });
  }
});

export default router;
