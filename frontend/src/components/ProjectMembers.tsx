import { useEffect, useState } from "react";
import { api, ProjectMembers as ProjectMembersData } from "../api";
import { useAuth } from "../AuthContext";

export default function ProjectMembers({ projectId }: { projectId: string }) {
  const { user } = useAuth();
  const [data, setData] = useState<ProjectMembersData | null>(null);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);

  const load = () => {
    api.projects.members(projectId).then(setData).catch(() => setData(null));
  };

  useEffect(load, [projectId]);

  const invite = async () => {
    if (!email.trim()) return;
    setInviting(true);
    setError(null);
    try {
      await api.projects.invite(projectId, email.trim());
      setEmail("");
      load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setInviting(false);
    }
  };

  const removeMember = async (userId: string) => {
    await api.projects.removeMember(projectId, userId);
    load();
  };

  if (!data) return <p className="text-xs text-slate-400">Loading members…</p>;

  return (
    <div className="mt-2 pl-4 border-l-2 border-slate-100 space-y-2">
      <ul className="space-y-1">
        {data.members.map((m) => (
          <li key={m.id} className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-xs text-slate-600">
            <span className="min-w-0 truncate">
              {m.avatarUrl && (
                <img src={m.avatarUrl} className="inline w-4 h-4 rounded-full mr-1 align-middle" alt="" />
              )}
              {m.name} <span className="text-slate-400">({m.email})</span>
              {m.role === "OWNER" && <span className="ml-1 text-indigo-500">owner</span>}
            </span>
            {m.role !== "OWNER" && m.id === user?.id && (
              <button onClick={() => removeMember(m.id)} className="shrink-0 text-slate-400 hover:text-red-600">
                Leave
              </button>
            )}
            {m.role !== "OWNER" && m.id !== user?.id && (
              <button onClick={() => removeMember(m.id)} className="shrink-0 text-slate-400 hover:text-red-600">
                Remove
              </button>
            )}
          </li>
        ))}
        {data.pendingInvites.map((email) => (
          <li key={email} className="text-xs text-slate-400 italic">
            {email} (invited, hasn't signed in yet)
          </li>
        ))}
      </ul>

      <div className="flex gap-2">
        <input
          type="email"
          placeholder="teammate@gmail.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && invite()}
          className="flex-1 border border-slate-300 rounded-md px-2 py-1 text-xs"
        />
        <button
          onClick={invite}
          disabled={inviting}
          className="bg-slate-700 hover:bg-slate-800 disabled:opacity-50 text-white px-3 py-1 rounded-md text-xs font-medium"
        >
          Invite
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
