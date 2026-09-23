import { describe, it, expect, afterEach } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";
import { prisma } from "../src/lib/prisma";
import { createTestUser, deleteTestUsers, randomSuffix } from "./helpers";

const app = createApp();
let createdUserIds: string[] = [];

afterEach(async () => {
  await deleteTestUsers(createdUserIds);
  createdUserIds = [];
});

describe("account deletion", () => {
  it("rejects unauthenticated requests", async () => {
    const res = await request(app).delete("/api/auth/me");
    expect(res.status).toBe(401);
  });

  it("deletes a solo user with no projects", async () => {
    const { user, apiKey } = await createTestUser();
    createdUserIds.push(user.id);

    const res = await request(app).delete("/api/auth/me").set("Authorization", `Bearer ${apiKey}`);
    expect(res.status).toBe(204);

    const stillExists = await prisma.user.findUnique({ where: { id: user.id } });
    expect(stillExists).toBeNull();
  });

  it("hands ownership of a shared project to the next member instead of deleting it", async () => {
    const { user: owner, apiKey: ownerKey } = await createTestUser("Owner");
    const { user: member } = await createTestUser("Member");
    createdUserIds.push(owner.id, member.id);

    const project = await prisma.project.create({
      data: {
        name: `Handoff-${randomSuffix()}`,
        ownerId: owner.id,
        members: {
          create: [
            { userId: owner.id, role: "OWNER" },
            { userId: member.id, role: "MEMBER" },
          ],
        },
      },
    });
    const entry = await prisma.timeEntry.create({
      data: {
        userId: member.id,
        projectId: project.id,
        startTime: new Date(),
        endTime: new Date(),
        durationSeconds: 500,
      },
    });

    const res = await request(app).delete("/api/auth/me").set("Authorization", `Bearer ${ownerKey}`);
    expect(res.status).toBe(204);

    const survivedProject = await prisma.project.findUnique({ where: { id: project.id } });
    expect(survivedProject).not.toBeNull();
    expect(survivedProject!.ownerId).toBe(member.id);

    const newOwnerMembership = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: project.id, userId: member.id } },
    });
    expect(newOwnerMembership!.role).toBe("OWNER");

    const survivedEntry = await prisma.timeEntry.findUnique({ where: { id: entry.id } });
    expect(survivedEntry).not.toBeNull();
  });

  it("deletes a project the user owned alone, along with its own entries", async () => {
    const { user, apiKey } = await createTestUser();
    createdUserIds.push(user.id);

    const project = await prisma.project.create({
      data: {
        name: `SoloOwned-${randomSuffix()}`,
        ownerId: user.id,
        members: { create: { userId: user.id, role: "OWNER" } },
      },
    });
    await prisma.timeEntry.create({
      data: { userId: user.id, projectId: project.id, startTime: new Date(), endTime: new Date(), durationSeconds: 100 },
    });

    const res = await request(app).delete("/api/auth/me").set("Authorization", `Bearer ${apiKey}`);
    expect(res.status).toBe(204);

    const survivedProject = await prisma.project.findUnique({ where: { id: project.id } });
    expect(survivedProject).toBeNull();
  });

  it("removing a member's own account leaves the project and other members' time untouched", async () => {
    const { user: owner, apiKey: ownerKey } = await createTestUser("Owner");
    const { user: member, apiKey: memberKey } = await createTestUser("Member");
    createdUserIds.push(owner.id, member.id);

    const project = await prisma.project.create({
      data: {
        name: `Stays-${randomSuffix()}`,
        ownerId: owner.id,
        members: {
          create: [
            { userId: owner.id, role: "OWNER" },
            { userId: member.id, role: "MEMBER" },
          ],
        },
      },
    });
    const ownerEntry = await prisma.timeEntry.create({
      data: { userId: owner.id, projectId: project.id, startTime: new Date(), endTime: new Date(), durationSeconds: 777 },
    });

    const res = await request(app).delete("/api/auth/me").set("Authorization", `Bearer ${memberKey}`);
    expect(res.status).toBe(204);

    const survivedProject = await prisma.project.findUnique({ where: { id: project.id } });
    expect(survivedProject).not.toBeNull();
    expect(survivedProject!.ownerId).toBe(owner.id);

    const survivedEntry = await prisma.timeEntry.findUnique({ where: { id: ownerEntry.id } });
    expect(survivedEntry).not.toBeNull();

    // Confirm the owner's session still works after their teammate deleted their own account.
    const meCheck = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${ownerKey}`);
    expect(meCheck.status).toBe(200);
  });
});
