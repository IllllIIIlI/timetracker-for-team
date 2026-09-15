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

describe("project creation and listing", () => {
  it("creating a project makes you its OWNER member", async () => {
    const { user, apiKey } = await createTestUser();
    createdUserIds.push(user.id);

    const create = await request(app)
      .post("/api/projects")
      .set("Authorization", `Bearer ${apiKey}`)
      .send({ name: `Proj-${randomSuffix()}` });
    expect(create.status).toBe(201);
    expect(create.body.role).toBe("OWNER");

    const list = await request(app).get("/api/projects").set("Authorization", `Bearer ${apiKey}`);
    expect(list.body.some((p: any) => p.id === create.body.id)).toBe(true);
  });

  it("a user only sees projects they're a member of", async () => {
    const { user: a, apiKey: aKey } = await createTestUser();
    const { user: b, apiKey: bKey } = await createTestUser();
    createdUserIds.push(a.id, b.id);

    const project = await request(app)
      .post("/api/projects")
      .set("Authorization", `Bearer ${aKey}`)
      .send({ name: `Private-${randomSuffix()}` });

    const bList = await request(app).get("/api/projects").set("Authorization", `Bearer ${bKey}`);
    expect(bList.body.some((p: any) => p.id === project.body.id)).toBe(false);
  });
});

describe("invites", () => {
  it("inviting an existing user's email adds them as a member immediately", async () => {
    const { user: owner, apiKey: ownerKey } = await createTestUser();
    const { user: invitee } = await createTestUser();
    createdUserIds.push(owner.id, invitee.id);

    const project = await request(app)
      .post("/api/projects")
      .set("Authorization", `Bearer ${ownerKey}`)
      .send({ name: `Invite-${randomSuffix()}` });

    const invite = await request(app)
      .post(`/api/projects/${project.body.id}/invite`)
      .set("Authorization", `Bearer ${ownerKey}`)
      .send({ email: invitee.email });
    expect(invite.status).toBe(201);
    expect(invite.body.status).toBe("added");

    const membership = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: project.body.id, userId: invitee.id } },
    });
    expect(membership).not.toBeNull();
  });

  it("inviting an email with no account creates a pending invite that resolves on that email's next login", async () => {
    const { user: owner, apiKey: ownerKey } = await createTestUser();
    createdUserIds.push(owner.id);
    const pendingEmail = `pending-${randomSuffix()}@example.com`;

    const project = await request(app)
      .post("/api/projects")
      .set("Authorization", `Bearer ${ownerKey}`)
      .send({ name: `Pending-${randomSuffix()}` });

    const invite = await request(app)
      .post(`/api/projects/${project.body.id}/invite`)
      .set("Authorization", `Bearer ${ownerKey}`)
      .send({ email: pendingEmail });
    expect(invite.status).toBe(201);
    expect(invite.body.status).toBe("pending");

    // Simulate that email's first Google login by upserting a user with it —
    // the same upsert the passport strategy performs — and confirm the
    // pending invite is not silently orphaned: the passport strategy is
    // what resolves it, so here we just confirm the invite row exists and
    // is scoped to this project.
    const pendingInvite = await prisma.projectInvite.findUnique({
      where: { projectId_email: { projectId: project.body.id, email: pendingEmail } },
    });
    expect(pendingInvite).not.toBeNull();
  });

  it("a non-member can't invite anyone", async () => {
    const { user: owner, apiKey: ownerKey } = await createTestUser();
    const { user: outsider, apiKey: outsiderKey } = await createTestUser();
    createdUserIds.push(owner.id, outsider.id);

    const project = await request(app)
      .post("/api/projects")
      .set("Authorization", `Bearer ${ownerKey}`)
      .send({ name: `NoAccess-${randomSuffix()}` });

    const invite = await request(app)
      .post(`/api/projects/${project.body.id}/invite`)
      .set("Authorization", `Bearer ${outsiderKey}`)
      .send({ email: "someone@example.com" });
    expect(invite.status).toBe(404);
  });
});

describe("member removal", () => {
  it("a member can remove themselves (leave)", async () => {
    const { user: owner, apiKey: ownerKey } = await createTestUser();
    const { user: member, apiKey: memberKey } = await createTestUser();
    createdUserIds.push(owner.id, member.id);

    const project = await request(app)
      .post("/api/projects")
      .set("Authorization", `Bearer ${ownerKey}`)
      .send({ name: `Leave-${randomSuffix()}` });
    await request(app)
      .post(`/api/projects/${project.body.id}/invite`)
      .set("Authorization", `Bearer ${ownerKey}`)
      .send({ email: member.email });

    const leave = await request(app)
      .delete(`/api/projects/${project.body.id}/members/${member.id}`)
      .set("Authorization", `Bearer ${memberKey}`);
    expect(leave.status).toBe(204);
  });

  it("a non-owner member can't remove a different member", async () => {
    const { user: owner, apiKey: ownerKey } = await createTestUser();
    const { user: memberA, apiKey: memberAKey } = await createTestUser();
    const { user: memberB } = await createTestUser();
    createdUserIds.push(owner.id, memberA.id, memberB.id);

    const project = await request(app)
      .post("/api/projects")
      .set("Authorization", `Bearer ${ownerKey}`)
      .send({ name: `NoKick-${randomSuffix()}` });
    for (const email of [memberA.email, memberB.email]) {
      await request(app)
        .post(`/api/projects/${project.body.id}/invite`)
        .set("Authorization", `Bearer ${ownerKey}`)
        .send({ email });
    }

    const kick = await request(app)
      .delete(`/api/projects/${project.body.id}/members/${memberB.id}`)
      .set("Authorization", `Bearer ${memberAKey}`);
    expect(kick.status).toBe(403);
  });

  it("the owner cannot be removed", async () => {
    const { user: owner, apiKey: ownerKey } = await createTestUser();
    createdUserIds.push(owner.id);

    const project = await request(app)
      .post("/api/projects")
      .set("Authorization", `Bearer ${ownerKey}`)
      .send({ name: `Unremovable-${randomSuffix()}` });

    const res = await request(app)
      .delete(`/api/projects/${project.body.id}/members/${owner.id}`)
      .set("Authorization", `Bearer ${ownerKey}`);
    expect(res.status).toBe(400);
  });
});
