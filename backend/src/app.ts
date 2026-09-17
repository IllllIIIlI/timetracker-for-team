import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import passport from "./config/passport";

import authRoutes from "./routes/auth.routes";
import projectsRoutes from "./routes/projects.routes";
import timeEntriesRoutes from "./routes/timeEntries.routes";
import leaderboardRoutes from "./routes/leaderboard.routes";

export function createApp() {
  const app = express();

  // Behind Caddy (or any reverse proxy) the actual TLS connection terminates
  // there, so Express only ever sees plain HTTP internally. Trusting the
  // proxy makes req.protocol reflect the X-Forwarded-Proto header Caddy
  // sets, which the login route relies on to mark the session cookie
  // Secure only when the real client connection was HTTPS.
  app.set("trust proxy", 1);

  app.use(
    cors({
      origin: process.env.FRONTEND_URL || "http://localhost:3000",
      credentials: true,
    })
  );
  app.use(express.json());
  app.use(cookieParser());
  app.use(passport.initialize());

  app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

  app.use("/api/auth", authRoutes);
  app.use("/api/projects", projectsRoutes);
  app.use("/api/time-entries", timeEntriesRoutes);
  app.use("/api/leaderboard", leaderboardRoutes);

  return app;
}
