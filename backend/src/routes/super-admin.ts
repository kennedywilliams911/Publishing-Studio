import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole } from "../middleware/requireAuth";

const router = Router();
router.use(requireAuth, requireRole("SUPER_ADMIN"));

router.get("/users", async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 25));
  const search =
    typeof req.query.search === "string" ? req.query.search.trim() : "";
  const where = search
    ? {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { email: { contains: search, mode: "insensitive" as const } },
        ],
      }
    : {};
  const [users, total, active, trials, suspended] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        subscriptions: { orderBy: { updatedAt: "desc" }, take: 1 },
      },
    }),
    prisma.user.count({ where }),
    prisma.subscription.count({ where: { status: "ACTIVE" } }),
    prisma.subscription.count({ where: { status: "TRIALING" } }),
    prisma.user.count({ where: { status: "SUSPENDED" } }),
  ]);
  res.json({
    users,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    summary: { total, active, trials, suspended },
  });
});

router.patch("/users/:id/status", async (req, res) => {
  const status =
    req.body?.status === "SUSPENDED"
      ? "SUSPENDED"
      : req.body?.status === "ACTIVE"
        ? "ACTIVE"
        : null;
  if (!status)
    return res
      .status(400)
      .json({ error: "Status must be ACTIVE or SUSPENDED." });
  if (req.params.id === req.userId && status === "SUSPENDED")
    return res
      .status(400)
      .json({ error: "You cannot suspend your own account." });
  const target = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!target) return res.status(404).json({ error: "User not found." });
  if (target.role === "SUPER_ADMIN" && status === "SUSPENDED") {
    const count = await prisma.user.count({
      where: { role: "SUPER_ADMIN", status: "ACTIVE" },
    });
    if (count <= 1)
      return res
        .status(400)
        .json({ error: "The last active super admin cannot be suspended." });
  }
  const user = await prisma.user.update({
    where: { id: target.id },
    data: { status },
    select: { id: true, name: true, email: true, role: true, status: true },
  });
  res.json({ user });
});

router.patch("/users/:id/role", async (req, res) => {
  const role =
    req.body?.role === "SUPER_ADMIN" || req.body?.role === "ADMIN"
      ? req.body.role
      : null;
  if (!role)
    return res
      .status(400)
      .json({ error: "Role must be SUPER_ADMIN or ADMIN." });
  if (req.params.id === req.userId && role !== "SUPER_ADMIN")
    return res
      .status(400)
      .json({ error: "You cannot remove your own super-admin access." });
  const target = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!target) return res.status(404).json({ error: "User not found." });
  if (target.role === "SUPER_ADMIN" && role === "ADMIN") {
    const count = await prisma.user.count({
      where: { role: "SUPER_ADMIN", status: "ACTIVE" },
    });
    if (count <= 1)
      return res
        .status(400)
        .json({ error: "The last active super admin cannot be demoted." });
  }
  const user = await prisma.user.update({
    where: { id: target.id },
    data: { role },
    select: { id: true, name: true, email: true, role: true, status: true },
  });
  res.json({ user });
});

router.get("/subscriptions", async (_req, res) => {
  const subscriptions = await prisma.subscription.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      user: { select: { id: true, name: true, email: true, status: true } },
    },
  });
  res.json({ subscriptions });
});

export default router;
