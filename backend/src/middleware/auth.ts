import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { hashApiKey } from "../lib/apiKey";
import { prisma } from "../lib/prisma";

export interface AuthPayload {
  userId: string;
}

declare global {
  namespace Express {
    interface Request {
      auth?: AuthPayload;
    }
  }
}

// Accepts either the browser session cookie, or a personal API key sent as
// `Authorization: Bearer <key>` — the latter lets scripts / physical buttons
// / shortcuts call the API (e.g. start/stop a timer) without a browser.
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    const rawKey = authHeader.slice(7).trim();
    if (!rawKey) return res.status(401).json({ error: "Invalid API key" });

    const user = await prisma.user.findUnique({ where: { apiKeyHash: hashApiKey(rawKey) } });
    if (!user) return res.status(401).json({ error: "Invalid API key" });

    req.auth = { userId: user.id };
    return next();
  }

  const token = req.cookies?.token;
  if (!token) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as AuthPayload;
    req.auth = payload;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired session" });
  }
}
