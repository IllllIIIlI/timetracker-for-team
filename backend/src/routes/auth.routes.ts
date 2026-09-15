import { Router } from "express";
import jwt from "jsonwebtoken";
import passport from "../config/passport";
import { requireAuth } from "../middleware/auth";
import { prisma } from "../lib/prisma";
import { generateApiKey, hashApiKey } from "../lib/apiKey";

const router = Router();

const COOKIE_NAME = "token";
const COOKIE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"], session: false })
);

router.get(
  "/google/callback",
  passport.authenticate("google", { session: false, failureRedirect: "/login?error=1" }),
  (req, res) => {
    const user = req.user as { id: string };
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, {
      expiresIn: "30d",
    });

    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      // Browsers silently drop Secure cookies set over plain HTTP, so this
      // must follow the actual request protocol, not NODE_ENV — otherwise
      // login "succeeds" but the session cookie never sticks on a
      // production deployment that isn't behind HTTPS (e.g. a bare LAN box).
      secure: req.protocol === "https",
      maxAge: COOKIE_MAX_AGE_MS,
    });

    res.redirect(process.env.FRONTEND_URL || "/");
  }
);

router.post("/logout", (_req, res) => {
  res.clearCookie(COOKIE_NAME);
  res.status(204).end();
});

router.get("/me", requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.auth!.userId } });
  if (!user) return res.status(404).json({ error: "User not found" });

  res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    hasApiKey: user.apiKeyHash != null,
  });
});

// Generates a new personal API key, replacing any previous one. The raw key
// is only ever returned here — only its hash is stored — so it must be
// saved by the caller immediately.
router.post("/api-key", requireAuth, async (req, res) => {
  const rawKey = generateApiKey();
  await prisma.user.update({
    where: { id: req.auth!.userId },
    data: { apiKeyHash: hashApiKey(rawKey) },
  });
  res.status(201).json({ apiKey: rawKey });
});

router.delete("/api-key", requireAuth, async (req, res) => {
  await prisma.user.update({
    where: { id: req.auth!.userId },
    data: { apiKeyHash: null },
  });
  res.status(204).end();
});

export default router;
