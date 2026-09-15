import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { prisma } from "../lib/prisma";

const router = Router();
router.use(requireAuth);

function periodStart(period: string): Date | undefined {
  const now = new Date();
  switch (period) {
    case "today": {
      const d = new Date(now);
      d.setHours(0, 0, 0, 0);
      return d;
    }
    case "week": {
      const d = new Date(now);
      const day = (d.getDay() + 6) % 7; // Monday = 0
      d.setDate(d.getDate() - day);
      d.setHours(0, 0, 0, 0);
      return d;
    }
    case "month": {
      return new Date(now.getFullYear(), now.getMonth(), 1);
    }
    default:
      return undefined;
  }
}

router.get("/", async (req, res) => {
  const period = String(req.query.period || "all");
  const since = periodStart(period);

  const grouped = await prisma.timeEntry.groupBy({
    by: ["userId"],
    where: {
      durationSeconds: { not: null },
      ...(since ? { startTime: { gte: since } } : {}),
    },
    _sum: { durationSeconds: true },
  });

  const userIds = grouped.map((g) => g.userId);
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, avatarUrl: true },
  });
  const usersById = new Map(users.map((u) => [u.id, u]));

  const leaderboard = grouped
    .map((g) => ({
      user: usersById.get(g.userId),
      totalSeconds: g._sum.durationSeconds || 0,
    }))
    .filter((row) => row.user)
    .sort((a, b) => b.totalSeconds - a.totalSeconds);

  res.json(leaderboard);
});

export default router;
