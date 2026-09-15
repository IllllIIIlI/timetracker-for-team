import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { prisma } from "../lib/prisma";

const router = Router();
router.use(requireAuth);

router.get("/", async (req, res) => {
  const projects = await prisma.project.findMany({
    where: { ownerId: req.auth!.userId },
    orderBy: { createdAt: "asc" },
  });
  res.json(projects);
});

router.post("/", async (req, res) => {
  const { name, color } = req.body as { name?: string; color?: string };
  if (!name || !name.trim()) {
    return res.status(400).json({ error: "Project name is required" });
  }

  try {
    const project = await prisma.project.create({
      data: { name: name.trim(), color: color || undefined, ownerId: req.auth!.userId },
    });
    res.status(201).json(project);
  } catch {
    res.status(409).json({ error: "You already have a project with that name" });
  }
});

router.delete("/:id", async (req, res) => {
  const project = await prisma.project.findUnique({ where: { id: req.params.id } });
  if (!project || project.ownerId !== req.auth!.userId) {
    return res.status(404).json({ error: "Project not found" });
  }

  await prisma.project.delete({ where: { id: project.id } });
  res.status(204).end();
});

export default router;
