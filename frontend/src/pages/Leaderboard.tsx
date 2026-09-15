import { useEffect, useState } from "react";
import { api, LeaderboardRow, Project } from "../api";
import { formatDuration } from "../format";
import { useAuth } from "../AuthContext";

const PERIODS = [
  { value: "today", label: "Today" },
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
  { value: "all", label: "All time" },
];

const MEDALS = ["🥇", "🥈", "🥉"];

export default function Leaderboard() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState("");
  const [period, setPeriod] = useState("week");
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.projects.list().then((p) => {
      setProjects(p);
      if (p.length > 0) setProjectId(p[0].id);
      else setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    api
      .leaderboard(projectId, period)
      .then(setRows)
      .finally(() => setLoading(false));
  }, [projectId, period]);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-slate-800">Leaderboard</h1>
        <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-3 py-1.5 text-sm rounded-md font-medium ${
                period === p.value ? "bg-white shadow-sm text-slate-800" : "text-slate-500"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {projects.length > 0 && (
        <select
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          className="mb-6 border border-slate-300 rounded-md px-3 py-2 text-sm bg-white"
        >
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      )}

      {projects.length === 0 && !loading && (
        <p className="text-sm text-slate-400">
          You're not in any projects yet — create one on the Dashboard.
        </p>
      )}

      {projects.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 divide-y divide-slate-100">
          {loading && <p className="text-sm text-slate-400 p-6">Loading…</p>}

          {!loading && rows.length === 0 && (
            <p className="text-sm text-slate-400 p-6">No members in this project yet.</p>
          )}

          {rows.map((row, i) => (
            <div
              key={row.user.id}
              className={`flex items-center gap-4 px-6 py-3 ${
                row.user.id === user?.id ? "bg-indigo-50" : ""
              }`}
            >
              <span className="w-6 text-center text-lg">{MEDALS[i] ?? i + 1}</span>
              {row.user.avatarUrl && (
                <img src={row.user.avatarUrl} className="w-8 h-8 rounded-full" alt="" />
              )}
              <span className="flex-1 font-medium text-slate-700">{row.user.name}</span>
              <span className="font-mono text-slate-600">{formatDuration(row.totalSeconds)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
