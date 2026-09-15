import { describe, it, expect, afterEach } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";
import { createTestUser, cookieFor, deleteTestUsers } from "./helpers";

const app = createApp();
let createdUserIds: string[] = [];

afterEach(async () => {
  await deleteTestUsers(createdUserIds);
  createdUserIds = [];
});

describe("authentication", () => {
  it("rejects requests with no cookie and no API key", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });

  it("rejects an invalid API key", async () => {
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", "Bearer not-a-real-key");
    expect(res.status).toBe(401);
  });

  it("accepts a valid session cookie", async () => {
    const { user } = await createTestUser();
    createdUserIds.push(user.id);

    const res = await request(app).get("/api/auth/me").set("Cookie", cookieFor(user.id));
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(user.id);
  });

  it("accepts a valid API key", async () => {
    const { user, apiKey } = await createTestUser();
    createdUserIds.push(user.id);

    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${apiKey}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(user.id);
    expect(res.body.hasApiKey).toBe(true);
  });

  it("generates a key, then accepts it, then revokes it so it no longer works", async () => {
    const { user } = await createTestUser();
    createdUserIds.push(user.id);
    const cookie = cookieFor(user.id);

    const generateRes = await request(app).post("/api/auth/api-key").set("Cookie", cookie);
    expect(generateRes.status).toBe(201);
    const newKey = generateRes.body.apiKey as string;
    expect(newKey).toMatch(/^[0-9a-f]{64}$/);

    const meWithNewKey = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${newKey}`);
    expect(meWithNewKey.status).toBe(200);

    const revokeRes = await request(app).delete("/api/auth/api-key").set("Cookie", cookie);
    expect(revokeRes.status).toBe(204);

    const meAfterRevoke = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${newKey}`);
    expect(meAfterRevoke.status).toBe(401);
  });
});
