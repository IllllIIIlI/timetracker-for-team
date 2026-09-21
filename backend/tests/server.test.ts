import { describe, it, expect, afterEach } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";
import { createTestUser, deleteTestUsers } from "./helpers";

const app = createApp();
let createdUserIds: string[] = [];

afterEach(async () => {
  await deleteTestUsers(createdUserIds);
  createdUserIds = [];
});

describe("server status", () => {
  it("rejects unauthenticated requests", async () => {
    const res = await request(app).get("/api/server/status");
    expect(res.status).toBe(401);
  });

  it("reports live load/memory/request stats for a signed-in user", async () => {
    const { user, apiKey } = await createTestUser();
    createdUserIds.push(user.id);

    const res = await request(app).get("/api/server/status").set("Authorization", `Bearer ${apiKey}`);
    expect(res.status).toBe(200);
    expect(res.body.requestsTotal).toBeGreaterThan(0);
    expect(res.body.loadAvg).toHaveLength(3);
    expect(res.body.cpuCount).toBeGreaterThan(0);
    expect(res.body.memory.totalMB).toBeGreaterThan(0);
    expect(res.body.uptimeSeconds).toBeGreaterThanOrEqual(0);
  });

  it("requestsPerMinute reflects recent traffic", async () => {
    const { user, apiKey } = await createTestUser();
    createdUserIds.push(user.id);
    const auth = () => request(app).get("/api/server/status").set("Authorization", `Bearer ${apiKey}`);

    const before = (await auth()).body.requestsPerMinute;
    await auth();
    await auth();
    const after = (await auth()).body.requestsPerMinute;

    expect(after).toBeGreaterThan(before);
  });
});
