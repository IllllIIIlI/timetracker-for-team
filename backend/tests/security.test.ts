import { describe, it, expect, afterEach } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";
import { prisma } from "../src/lib/prisma";
import { createTestUser, deleteTestUsers } from "./helpers";

// These formalize the manual Jonas/Mantas check: one member of a shared
// project must never be able to read, adjust, or delete another member's
// time, whether unauthenticated, using a forged key, or using their own
// valid key against someone else's data.

const app = createApp();
let createdUserIds: string[] = [];

afterEach(async () => {
  await deleteTestUsers(createdUserIds);
  createdUserIds = [];
});

async function setup() {
  const { user: owner, apiKey: ownerKey } = await createTestUser("Jonas Testinis");
  const { user: other, apiKey: otherKey } = await createTestUser("Mantas Testinis");
  createdUserIds.push(owner.id, other.id);

  const project = await prisma.project.create({
    data: {
      name: `SecurityTest-${owner.id.slice(0, 8)}`,
      ownerId: owner.id,
      members: {
        create: [
          { userId: owner.id, role: "OWNER" },
          { userId: other.id, role: "MEMBER" },
        ],
      },
    },
  });

  const otherEntry = await prisma.timeEntry.create({
    data: {
      userId: other.id,
      projectId: project.id,
      startTime: new Date(),
      endTime: new Date(),
      durationSeconds: 1000,
      description: "Mantas baseline",
    },
  });

  return { owner, ownerKey, other, otherKey, project, otherEntry };
}

describe("cross-user data isolation", () => {
  it("rejects unauthenticated writes", async () => {
    const { project } = await setup();

    const results = await Promise.all([
      request(app).post("/api/time-entries/adjust").send({ projectId: project.id, deltaSeconds: 9999 }),
      request(app).post("/api/time-entries/start").send({ projectId: project.id }),
      request(app).get(`/api/leaderboard?projectId=${project.id}&period=all`),
    ]);
    for (const res of results) expect(res.status).toBe(401);
  });

  it("never lets one member delete another member's time entry", async () => {
    const { ownerKey, otherEntry } = await setup();

    const res = await request(app)
      .delete(`/api/time-entries/${otherEntry.id}`)
      .set("Authorization", `Bearer ${ownerKey}`);
    expect(res.status).toBe(404);

    const stillExists = await prisma.timeEntry.findUnique({ where: { id: otherEntry.id } });
    expect(stillExists).not.toBeNull();
  });

  it("ignores a userId injected into the adjust body — it always writes the caller's own entry", async () => {
    const { ownerKey, owner, other, project } = await setup();

    const res = await request(app)
      .post("/api/time-entries/adjust")
      .set("Authorization", `Bearer ${ownerKey}`)
      .send({ projectId: project.id, deltaSeconds: 9999, userId: other.id });

    expect(res.status).toBe(201);
    expect(res.body.userId).toBe(owner.id);
    expect(res.body.userId).not.toBe(other.id);
  });

  it("leaves the other member's total untouched after an attacker adjusts their own time", async () => {
    const { ownerKey, otherKey, project } = await setup();

    await request(app)
      .post("/api/time-entries/adjust")
      .set("Authorization", `Bearer ${ownerKey}`)
      .send({ projectId: project.id, deltaSeconds: 9999 });

    const leaderboard = await request(app)
      .get(`/api/leaderboard?projectId=${project.id}&period=all`)
      .set("Authorization", `Bearer ${otherKey}`);

    const otherRow = leaderboard.body.find((r: any) => r.totalSeconds === 1000);
    expect(otherRow).toBeDefined();
  });

  it("a member's own entry list never includes another member's entries", async () => {
    const { ownerKey, other } = await setup();

    const res = await request(app)
      .get("/api/time-entries")
      .set("Authorization", `Bearer ${ownerKey}`);

    expect(res.status).toBe(200);
    expect(res.body.some((e: any) => e.userId === other.id)).toBe(false);
  });

  it("a non-member gets 404, not data, for a project's leaderboard", async () => {
    const { project } = await setup();
    const { user: outsider, apiKey: outsiderKey } = await createTestUser("Outsider");
    createdUserIds.push(outsider.id);

    const res = await request(app)
      .get(`/api/leaderboard?projectId=${project.id}&period=all`)
      .set("Authorization", `Bearer ${outsiderKey}`);
    expect(res.status).toBe(404);
  });

  it("still lets a member adjust and delete their own time normally", async () => {
    const { otherKey, otherEntry } = await setup();

    const adjust = await request(app)
      .post("/api/time-entries/adjust")
      .set("Authorization", `Bearer ${otherKey}`)
      .send({ projectId: otherEntry.projectId, deltaSeconds: 500 });
    expect(adjust.status).toBe(201);

    const del = await request(app)
      .delete(`/api/time-entries/${otherEntry.id}`)
      .set("Authorization", `Bearer ${otherKey}`);
    expect(del.status).toBe(204);
  });
});
