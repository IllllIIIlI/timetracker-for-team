import { Router } from "express";
import os from "os";
import { requireAuth } from "../middleware/auth";
import { getRequestsPerMinute, getRequestsTotal } from "../lib/metrics";

const router = Router();
router.use(requireAuth);

const processStartedAt = Date.now();

// Live server status: current API load and basic host resource usage.
// Any signed-in user can see this — it's operational info, not per-project
// data, and this app only ever has a small trusted team on it.
router.get("/status", (_req, res) => {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();

  res.json({
    requestsTotal: getRequestsTotal(),
    requestsPerMinute: getRequestsPerMinute(),
    loadAvg: os.loadavg(),
    cpuCount: os.cpus().length,
    uptimeSeconds: Math.floor((Date.now() - processStartedAt) / 1000),
    memory: {
      totalMB: Math.round(totalMem / 1024 / 1024),
      freeMB: Math.round(freeMem / 1024 / 1024),
      usedMB: Math.round((totalMem - freeMem) / 1024 / 1024),
    },
  });
});

export default router;
