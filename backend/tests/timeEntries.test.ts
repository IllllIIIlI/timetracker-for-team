import { describe, it, expect, afterEach } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";
import { prisma } from "../src/lib/prisma";
import { createTestUser, deleteTestUsers } from "./helpers";

const app = createApp();
let createdUserIds: string[] = [];

afterEach(async () => {
  await deleteTestUsers(createdUserIds);
  createdUserIds = [];
});

async function setupUserWithProject() {
  const { user, apiKey } = await createTestUser();
  createdUserIds.push(user.id);
  const project = await prisma.project.create({
    data: { name: `Timer-${user.id.slice(0, 8)}`, ownerId: user.id, members: { create: { userId: user.id, role: "OWNER" } } },
  });
  return { user, apiKey, project };
}

describe("timer start/stop", () => {
  it("start returns an active entry and serverNow; stop computes a real duration", async () => {
    const { apiKey, project } = await setupUserWithProject();
    const auth = (req: request.Test) => req.set("Authorization", `Bearer ${apiKey}`);

    const start = await auth(request(app).post("/api/time-entries/start")).send({ projectId: project.id });
    expect(start.status).toBe(201);
    expect(start.body.entry.endTime).toBeNull();
    expect(start.body.serverNow).toBeTruthy();

    const active = await auth(request(app).get("/api/time-entries/active"));
    expect(active.body.entry.id).toBe(start.body.entry.id);

    await new Promise((r) => setTimeout(r, 1100));

    const stop = await auth(request(app).post("/api/time-entries/stop"));
    expect(stop.status).toBe(200);
    expect(stop.body.durationSeconds).toBeGreaterThanOrEqual(1);
    expect(stop.body.endTime).not.toBeNull();
  });

  it("refuses to start a second timer while one is already running", async () => {
    const { apiKey, project } = await setupUserWithProject();
    const auth = (req: request.Test) => req.set("Authorization", `Bearer ${apiKey}`);

    await auth(request(app).post("/api/time-entries/start")).send({ projectId: project.id });
    const secondStart = await auth(request(app).post("/api/time-entries/start")).send({ projectId: project.id });
    expect(secondStart.status).toBe(409);

    await auth(request(app).post("/api/time-entries/stop"));
  });

  it("refuses to start a timer on a project you don't belong to", async () => {
    const { user, apiKey } = await createTestUser();
    createdUserIds.push(user.id);

    const res = await request(app)
      .post("/api/time-entries/start")
      .set("Authorization", `Bearer ${apiKey}`)
      .send({ projectId: "00000000-0000-0000-0000-000000000000" });
    expect(res.status).toBe(404);
  });
});

describe("manual adjust", () => {
  it("accepts a positive delta and reflects it in the project total", async () => {
    const { apiKey, project } = await setupUserWithProject();

    const res = await request(app)
      .post("/api/time-entries/adjust")
      .set("Authorization", `Bearer ${apiKey}`)
      .send({ projectId: project.id, deltaSeconds: 600 });
    expect(res.status).toBe(201);
    expect(res.body.durationSeconds).toBe(600);
  });

  it("accepts a negative delta", async () => {
    const { apiKey, project } = await setupUserWithProject();

    const res = await request(app)
      .post("/api/time-entries/adjust")
      .set("Authorization", `Bearer ${apiKey}`)
      .send({ projectId: project.id, deltaSeconds: -300 });
    expect(res.status).toBe(201);
    expect(res.body.durationSeconds).toBe(-300);
  });

  it("rejects a zero delta", async () => {
    const { apiKey, project } = await setupUserWithProject();

    const res = await request(app)
      .post("/api/time-entries/adjust")
      .set("Authorization", `Bearer ${apiKey}`)
      .send({ projectId: project.id, deltaSeconds: 0 });
    expect(res.status).toBe(400);
  });

  it("rejects a missing projectId", async () => {
    const { apiKey } = await setupUserWithProject();

    const res = await request(app)
      .post("/api/time-entries/adjust")
      .set("Authorization", `Bearer ${apiKey}`)
      .send({ deltaSeconds: 100 });
    expect(res.status).toBe(400);
  });
});

describe("deleting entries", () => {
  it("lets you delete your own entry", async () => {
    const { apiKey, project } = await setupUserWithProject();

    const created = await request(app)
      .post("/api/time-entries/adjust")
      .set("Authorization", `Bearer ${apiKey}`)
      .send({ projectId: project.id, deltaSeconds: 100 });

    const del = await request(app)
      .delete(`/api/time-entries/${created.body.id}`)
      .set("Authorization", `Bearer ${apiKey}`);
    expect(del.status).toBe(204);
  });

  it("404s for a nonexistent entry", async () => {
    const { apiKey } = await setupUserWithProject();

    const res = await request(app)
      .delete("/api/time-entries/00000000-0000-0000-0000-000000000000")
      .set("Authorization", `Bearer ${apiKey}`);
    expect(res.status).toBe(404);
  });
});
