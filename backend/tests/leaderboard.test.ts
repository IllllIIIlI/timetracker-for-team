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

async function projectWithTwoMembers() {
  const { user: a, apiKey: aKey } = await createTestUser("Alice");
  const { user: b, apiKey: bKey } = await createTestUser("Bob");
  createdUserIds.push(a.id, b.id);

  const project = await prisma.project.create({
    data: {
      name: `Board-${randomSuffix()}`,
      ownerId: a.id,
      members: { create: [{ userId: a.id, role: "OWNER" }, { userId: b.id, role: "MEMBER" }] },
    },
  });

  return { a, aKey, b, bKey, project };
}

describe("leaderboard", () => {
  it("sums each member's completed entries and ranks by total descending", async () => {
    const { a, b, aKey, project } = await projectWithTwoMembers();

    await prisma.timeEntry.createMany({
      data: [
        { userId: a.id, projectId: project.id, startTime: new Date(), endTime: new Date(), durationSeconds: 300 },
        { userId: b.id, projectId: project.id, startTime: new Date(), endTime: new Date(), durationSeconds: 900 },
      ],
    });

    const res = await request(app)
      .get(`/api/leaderboard?projectId=${project.id}&period=all`)
      .set("Authorization", `Bearer ${aKey}`);

    expect(res.status).toBe(200);
    expect(res.body[0].totalSeconds).toBe(900);
    expect(res.body[1].totalSeconds).toBe(300);
  });

  it("includes members with zero time logged", async () => {
    const { aKey, project } = await projectWithTwoMembers();

    const res = await request(app)
      .get(`/api/leaderboard?projectId=${project.id}&period=all`)
      .set("Authorization", `Bearer ${aKey}`);

    expect(res.body).toHaveLength(2);
    expect(res.body.every((r: any) => r.totalSeconds === 0)).toBe(true);
  });

  it("an active (unfinished) timer doesn't count toward the total yet", async () => {
    const { a, aKey, project } = await projectWithTwoMembers();
    await prisma.timeEntry.create({
      data: { userId: a.id, projectId: project.id, startTime: new Date(), endTime: null, durationSeconds: null },
    });

    const res = await request(app)
      .get(`/api/leaderboard?projectId=${project.id}&period=all`)
      .set("Authorization", `Bearer ${aKey}`);

    const aliceRow = res.body.find((r: any) => r.user.id === a.id);
    expect(aliceRow.totalSeconds).toBe(0);
  });

  it("period=today excludes entries from before today", async () => {
    const { a, aKey, project } = await projectWithTwoMembers();
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    await prisma.timeEntry.create({
      data: {
        userId: a.id,
        projectId: project.id,
        startTime: yesterday,
        endTime: yesterday,
        durationSeconds: 5000,
      },
    });

    const res = await request(app)
      .get(`/api/leaderboard?projectId=${project.id}&period=today`)
      .set("Authorization", `Bearer ${aKey}`);

    const aliceRow = res.body.find((r: any) => r.user.id === a.id);
    expect(aliceRow.totalSeconds).toBe(0);
  });

  it("requires projectId", async () => {
    const { aKey } = await projectWithTwoMembers();
    const res = await request(app).get("/api/leaderboard?period=all").set("Authorization", `Bearer ${aKey}`);
    expect(res.status).toBe(400);
  });
});
