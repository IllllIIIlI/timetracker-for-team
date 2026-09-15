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

// Leaderboard for a single project, scoped to that project's members only.
router.get("/", async (req, res) => {
  const projectId = String(req.query.projectId || "");
  if (!projectId) return res.status(400).json({ error: "projectId is required" });

  const membership = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: req.auth!.userId } },
  });
  if (!membership) return res.status(404).json({ error: "Project not found" });

  const period = String(req.query.period || "all");
  const since = periodStart(period);

  const [grouped, members] = await Promise.all([
    prisma.timeEntry.groupBy({
      by: ["userId"],
      where: {
        projectId,
        durationSeconds: { not: null },
        ...(since ? { startTime: { gte: since } } : {}),
      },
      _sum: { durationSeconds: true },
    }),
    prisma.projectMember.findMany({
      where: { projectId },
      include: { user: { select: { id: true, name: true, avatarUrl: true } } },
    }),
  ]);

  const totalsByUserId = new Map(grouped.map((g) => [g.userId, g._sum.durationSeconds || 0]));

  const leaderboard = members
    .map((m) => ({
      user: { id: m.user.id, name: m.user.name, avatarUrl: m.user.avatarUrl },
      totalSeconds: totalsByUserId.get(m.userId) || 0,
    }))
    .sort((a, b) => b.totalSeconds - a.totalSeconds);

  res.json(leaderboard);
});

export default router;
