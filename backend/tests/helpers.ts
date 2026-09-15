import crypto from "crypto";
import jwt from "jsonwebtoken";
import { prisma } from "../src/lib/prisma";
import { hashApiKey } from "../src/lib/apiKey";

// Integration tests run against a real Postgres (the same one used for
// local dev — see backend/.env). Every user/project a test creates must be
// tracked and removed via deleteTestUsers() in an afterEach/afterAll, so
// the suite never leaves data behind. Deleting a user cascades (via the
// schema's onDelete: Cascade) to everything that references it: their
// memberships, owned projects, and time entries.

export function randomSuffix(): string {
  return crypto.randomBytes(6).toString("hex");
}

export async function createTestUser(name = "Test User") {
  const suffix = randomSuffix();
  const apiKey = crypto.randomBytes(32).toString("hex");
  const user = await prisma.user.create({
    data: {
      googleId: `test-${suffix}`,
      email: `test-${suffix}@example.com`,
      name,
      apiKeyHash: hashApiKey(apiKey),
    },
  });
  return { user, apiKey };
}

export function cookieFor(userId: string): string {
  const token = jwt.sign({ userId }, process.env.JWT_SECRET!, { expiresIn: "1h" });
  return `token=${token}`;
}

export async function deleteTestUsers(userIds: string[]): Promise<void> {
  if (userIds.length === 0) return;
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
}
