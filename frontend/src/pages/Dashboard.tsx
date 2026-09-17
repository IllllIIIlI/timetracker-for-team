import { useEffect, useState } from "react";
import { api, ActiveEntry, Project, TimeEntry } from "../api";
import { formatDuration } from "../format";
import ProjectMembers from "../components/ProjectMembers";
import ApiAccess from "../components/ApiAccess";

export default function Dashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [active, setActive] = useState<TimeEntry | null>(null);
  // How many seconds had already elapsed as of `clientRef`, both measured
  // purely from the server's own clock — never compared against this
  // device's clock, so a skewed local clock can't throw the display off.
  const [baselineSeconds, setBaselineSeconds] = useState(0);
  const [clientRef, setClientRef] = useState(0);
  const [newProjectName, setNewProjectName] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [description, setDescription] = useState("");
  const [, setTick] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null);

  const applyActive = (data: ActiveEntry) => {
    setActive(data.entry);
    if (data.entry) {
      const elapsedAtFetch =
        (new Date(data.serverNow).getTime() - new Date(data.entry.startTime).getTime()) / 1000;
      setBaselineSeconds(Math.max(0, elapsedAtFetch));
      setClientRef(Date.now());
    } else {
      setBaselineSeconds(0);
    }
  };

  const loadAll = async () => {
    const [p, e, a] = await Promise.all([
      api.projects.list(),
      api.timeEntries.list(),
      api.timeEntries.active(),
    ]);
    setProjects(p);
    setEntries(e);
    applyActive(a);
    if (!selectedProjectId && p.length > 0) setSelectedProjectId(p[0].id);
  };

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [active]);

  const createProject = async () => {
    if (!newProjectName.trim()) return;
    try {
      const project = await api.projects.create(newProjectName.trim());
      setNewProjectName("");
      setProjects((prev) => [...prev, project]);
      setSelectedProjectId(project.id);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const startTimer = async () => {
    if (!selectedProjectId) return;
    try {
      const data = await api.timeEntries.start(selectedProjectId, description);
      applyActive(data);
      setDescription("");
    } catch (err: any) {
      setError(err.message);
    }
  };

  const stopTimer = async () => {
    try {
      const entry = await api.timeEntries.stop();
      setActive(null);
      setBaselineSeconds(0);
      setEntries((prev) => [entry, ...prev]);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const removeProject = async (id: string) => {
    await api.projects.remove(id);
    setProjects((prev) => prev.filter((p) => p.id !== id));
    if (selectedProjectId === id) setSelectedProjectId("");
  };

  const adjustTime = async (projectId: string, deltaSeconds: number) => {
    try {
      const entry = await api.timeEntries.adjust(projectId, deltaSeconds);
      setEntries((prev) => [entry, ...prev]);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const elapsedSeconds = active
    ? Math.floor(baselineSeconds + (Date.now() - clientRef) / 1000)
    : 0;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {error && (
        <div className="bg-red-50 text-red-700 text-sm px-4 py-2 rounded-md border border-red-200">
          {error}
        </div>
      )}

      <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h2 className="font-semibold text-slate-800 mb-4">Timer</h2>

        {active ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm text-slate-500 truncate">
                Tracking <span className="font-medium text-slate-700">{active.project.name}</span>
                {active.description ? ` — ${active.description}` : ""}
              </p>
              <p className="text-3xl font-mono font-bold text-indigo-600">
                {formatDuration(elapsedSeconds)}
              </p>
            </div>
            <button
              onClick={stopTimer}
              className="bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-lg font-medium shrink-0"
            >
              Stop
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="border border-slate-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="" disabled>
                Select a project
              </option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder="What are you working on?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="flex-1 min-w-[200px] border border-slate-300 rounded-md px-3 py-2 text-sm"
            />
            <button
              onClick={startTimer}
              disabled={!selectedProjectId}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-5 py-2 rounded-lg font-medium"
            >
              Start
            </button>
          </div>
        )}
      </section>

      <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h2 className="font-semibold text-slate-800 mb-4">Projects</h2>
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            placeholder="New project name"
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && createProject()}
            className="flex-1 border border-slate-300 rounded-md px-3 py-2 text-sm"
          />
          <button
            onClick={createProject}
            className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            Add
          </button>
        </div>
        <ul className="divide-y divide-slate-100">
          {projects.map((p) => (
            <li key={p.id} className="py-2 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-y-1 gap-x-3">
                <span className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: p.color }}
                  />
                  <span className="truncate">{p.name}</span>
                </span>
                <span className="flex items-center flex-wrap gap-3">
                  <span className="flex items-center gap-1 text-slate-400">
                    <button
                      onClick={() => adjustTime(p.id, -300)}
                      title="Remove 5 minutes from my time on this project"
                      className="hover:text-red-600 px-1"
                    >
                      −5m
                    </button>
                    <button
                      onClick={() => adjustTime(p.id, 300)}
                      title="Add 5 minutes to my time on this project"
                      className="hover:text-indigo-600 px-1"
                    >
                      +5m
                    </button>
                  </span>
                  <button
                    onClick={() =>
                      setExpandedProjectId(expandedProjectId === p.id ? null : p.id)
                    }
                    className="text-slate-400 hover:text-indigo-600"
                  >
                    {expandedProjectId === p.id ? "Hide members" : "Members"}
                  </button>
                  {p.role === "OWNER" && (
                    <button
                      onClick={() => removeProject(p.id)}
                      className="text-slate-400 hover:text-red-600"
                    >
                      Remove
                    </button>
                  )}
                </span>
              </div>
              {expandedProjectId === p.id && <ProjectMembers projectId={p.id} />}
            </li>
          ))}
          {projects.length === 0 && (
            <p className="text-sm text-slate-400 py-2">No projects yet — add one above.</p>
          )}
        </ul>
      </section>

      <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h2 className="font-semibold text-slate-800 mb-4">Recent entries</h2>
        <ul className="divide-y divide-slate-100">
          {entries.map((e) => (
            <li key={e.id} className="py-2 flex items-center justify-between text-sm">
              <div>
                <span className="font-medium text-slate-700">{e.project.name}</span>
                {e.description && <span className="text-slate-500"> — {e.description}</span>}
                <p className="text-xs text-slate-400">
                  {new Date(e.startTime).toLocaleString()}
                </p>
              </div>
              <span className="font-mono text-slate-600">
                {e.durationSeconds != null ? formatDuration(e.durationSeconds) : "—"}
              </span>
            </li>
          ))}
          {entries.length === 0 && (
            <p className="text-sm text-slate-400 py-2">No time logged yet.</p>
          )}
        </ul>
      </section>

      <ApiAccess />
    </div>
  );
}
