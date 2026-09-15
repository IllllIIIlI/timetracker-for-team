import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { prisma } from "../lib/prisma";

const router = Router();
router.use(requireAuth);

// List time entries for the current user, most recent first.
router.get("/", async (req, res) => {
  const entries = await prisma.timeEntry.findMany({
    where: { userId: req.auth!.userId },
    include: { project: true },
    orderBy: { startTime: "desc" },
    take: 100,
  });
  res.json(entries);
});

// The currently running timer for the current user, if any. Includes the
// server's own clock reading so the client can measure elapsed time using
// its own clock's ticking only, never comparing absolute timestamps across
// two different machines' clocks (which may be skewed).
router.get("/active", async (req, res) => {
  const active = await prisma.timeEntry.findFirst({
    where: { userId: req.auth!.userId, endTime: null },
    include: { project: true },
  });
  res.json({ entry: active, serverNow: new Date().toISOString() });
});

router.post("/start", async (req, res) => {
  const { projectId, description } = req.body as { projectId?: string; description?: string };
  if (!projectId) return res.status(400).json({ error: "projectId is required" });

  const membership = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: req.auth!.userId } },
  });
  if (!membership) {
    return res.status(404).json({ error: "Project not found" });
  }

  const existingActive = await prisma.timeEntry.findFirst({
    where: { userId: req.auth!.userId, endTime: null },
  });
  if (existingActive) {
    return res.status(409).json({ error: "A timer is already running. Stop it first." });
  }

  const startTime = new Date();
  const entry = await prisma.timeEntry.create({
    data: {
      userId: req.auth!.userId,
      projectId,
      description: description?.trim() || null,
      startTime,
    },
    include: { project: true },
  });
  res.status(201).json({ entry, serverNow: startTime.toISOString() });
});

router.post("/stop", async (req, res) => {
  const active = await prisma.timeEntry.findFirst({
    where: { userId: req.auth!.userId, endTime: null },
  });
  if (!active) return res.status(404).json({ error: "No running timer" });

  const endTime = new Date();
  const durationSeconds = Math.max(
    0,
    Math.round((endTime.getTime() - active.startTime.getTime()) / 1000)
  );

  const entry = await prisma.timeEntry.update({
    where: { id: active.id },
    data: { endTime, durationSeconds },
    include: { project: true },
  });
  res.json(entry);
});

// Manual time entry, for logging work retroactively.
router.post("/", async (req, res) => {
  const { projectId, description, startTime, endTime } = req.body as {
    projectId?: string;
    description?: string;
    startTime?: string;
    endTime?: string;
  };

  if (!projectId || !startTime || !endTime) {
    return res.status(400).json({ error: "projectId, startTime and endTime are required" });
  }

  const membership = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: req.auth!.userId } },
  });
  if (!membership) {
    return res.status(404).json({ error: "Project not found" });
  }

  const start = new Date(startTime);
  const end = new Date(endTime);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
    return res.status(400).json({ error: "Invalid start/end time" });
  }

  const entry = await prisma.timeEntry.create({
    data: {
      userId: req.auth!.userId,
      projectId,
      description: description?.trim() || null,
      startTime: start,
      endTime: end,
      durationSeconds: Math.round((end.getTime() - start.getTime()) / 1000),
    },
    include: { project: true },
  });
  res.status(201).json(entry);
});

router.delete("/:id", async (req, res) => {
  const entry = await prisma.timeEntry.findUnique({ where: { id: req.params.id } });
  if (!entry || entry.userId !== req.auth!.userId) {
    return res.status(404).json({ error: "Entry not found" });
  }

  await prisma.timeEntry.delete({ where: { id: entry.id } });
  res.status(204).end();
});

export default router;
