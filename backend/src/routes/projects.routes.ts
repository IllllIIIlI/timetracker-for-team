import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { prisma } from "../lib/prisma";

const router = Router();
router.use(requireAuth);

// Projects the current user is a member (or owner) of.
router.get("/", async (req, res) => {
  const memberships = await prisma.projectMember.findMany({
    where: { userId: req.auth!.userId },
    include: { project: true },
    orderBy: { project: { createdAt: "asc" } },
  });
  res.json(memberships.map((m) => ({ ...m.project, role: m.role })));
});

router.post("/", async (req, res) => {
  const { name, color } = req.body as { name?: string; color?: string };
  if (!name || !name.trim()) {
    return res.status(400).json({ error: "Project name is required" });
  }

  try {
    const project = await prisma.project.create({
      data: {
        name: name.trim(),
        color: color || undefined,
        ownerId: req.auth!.userId,
        members: { create: { userId: req.auth!.userId, role: "OWNER" } },
      },
    });
    res.status(201).json({ ...project, role: "OWNER" });
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

// Members + pending invites of a project, visible to anyone in the project.
router.get("/:id/members", async (req, res) => {
  const membership = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId: req.params.id, userId: req.auth!.userId } },
  });
  if (!membership) return res.status(404).json({ error: "Project not found" });

  const [members, invites] = await Promise.all([
    prisma.projectMember.findMany({
      where: { projectId: req.params.id },
      include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
      orderBy: { joinedAt: "asc" },
    }),
    prisma.projectInvite.findMany({ where: { projectId: req.params.id } }),
  ]);

  res.json({
    members: members.map((m) => ({ ...m.user, role: m.role })),
    pendingInvites: invites.map((i) => i.email),
  });
});

// Invite a teammate by their Gmail/Google account email. Any current member can invite.
router.post("/:id/invite", async (req, res) => {
  const { email } = req.body as { email?: string };
  const normalizedEmail = email?.trim().toLowerCase();
  if (!normalizedEmail) return res.status(400).json({ error: "Email is required" });

  const membership = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId: req.params.id, userId: req.auth!.userId } },
  });
  if (!membership) return res.status(404).json({ error: "Project not found" });

  const invitedUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });

  if (invitedUser) {
    const existing = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: req.params.id, userId: invitedUser.id } },
    });
    if (existing) return res.status(409).json({ error: "That person is already in the project" });

    await prisma.projectMember.create({
      data: { projectId: req.params.id, userId: invitedUser.id, role: "MEMBER" },
    });
    return res.status(201).json({ status: "added" });
  }

  try {
    await prisma.projectInvite.create({
      data: { projectId: req.params.id, email: normalizedEmail },
    });
    return res.status(201).json({ status: "pending" });
  } catch {
    return res.status(409).json({ error: "That email has already been invited" });
  }
});

// Remove a member. Owners can remove anyone (except themselves); anyone can remove themselves.
router.delete("/:id/members/:userId", async (req, res) => {
  const project = await prisma.project.findUnique({ where: { id: req.params.id } });
  if (!project) return res.status(404).json({ error: "Project not found" });

  const isSelf = req.params.userId === req.auth!.userId;
  const isOwner = project.ownerId === req.auth!.userId;
  if (!isSelf && !isOwner) {
    return res.status(403).json({ error: "Only the owner can remove other members" });
  }
  if (req.params.userId === project.ownerId) {
    return res.status(400).json({ error: "The project owner can't be removed" });
  }

  await prisma.projectMember.delete({
    where: { projectId_userId: { projectId: req.params.id, userId: req.params.userId } },
  });
  res.status(204).end();
});

export default router;
