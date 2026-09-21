import { useEffect, useState } from "react";
import { api, ServerStatus } from "../api";

function formatUptime(totalSeconds: number): string {
  const d = Math.floor(totalSeconds / 86400);
  const h = Math.floor((totalSeconds % 86400) / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className="text-2xl font-mono font-bold text-slate-800">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  );
}

export default function Server() {
  const [status, setStatus] = useState<ServerStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const poll = () => {
      api
        .server.status()
        .then((s) => {
          if (!cancelled) {
            setStatus(s);
            setError(null);
          }
        })
        .catch((err) => {
          if (!cancelled) setError(err.message);
        });
    };

    poll();
    const id = setInterval(poll, 3000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <h1 className="text-xl font-bold text-slate-800">Server</h1>

      {error && (
        <div className="bg-red-50 text-red-700 text-sm px-4 py-2 rounded-md border border-red-200">
          {error}
        </div>
      )}

      {!status && !error && <p className="text-sm text-slate-400">Loading…</p>}

      {status && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <StatCard label="Requests / min" value={String(status.requestsPerMinute)} />
            <StatCard label="Requests total" value={status.requestsTotal.toLocaleString()} />
            <StatCard label="Uptime" value={formatUptime(status.uptimeSeconds)} />
            <StatCard
              label="Load avg (1m)"
              value={status.loadAvg[0].toFixed(2)}
              sub={`5m ${status.loadAvg[1].toFixed(2)} · 15m ${status.loadAvg[2].toFixed(2)}`}
            />
            <StatCard label="CPU cores" value={String(status.cpuCount)} />
            <StatCard
              label="Memory"
              value={`${status.memory.usedMB} / ${status.memory.totalMB} MB`}
              sub={`${status.memory.freeMB} MB free`}
            />
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <p className="text-xs text-slate-500 mb-2">Memory used</p>
            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-600"
                style={{
                  width: `${Math.min(100, (status.memory.usedMB / status.memory.totalMB) * 100)}%`,
                }}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
