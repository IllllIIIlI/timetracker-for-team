import { useState } from "react";
import { api, API_URL } from "../api";
import { useAuth } from "../AuthContext";

export default function ApiAccess() {
  const { user, refresh } = useAuth();
  const [newKey, setNewKey] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const generate = async () => {
    const { apiKey } = await api.generateApiKey();
    setNewKey(apiKey);
    await refresh();
  };

  const revoke = async () => {
    await api.revokeApiKey();
    setNewKey(null);
    await refresh();
  };

  if (!user) return null;

  return (
    // curl/scripting isn't a phone use case — keep it out of the way on
    // small screens and only show it from tablet width up.
    <section className="hidden sm:block bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <button
        onClick={() => setOpen(!open)}
        className="font-semibold text-slate-800 flex items-center gap-2"
      >
        API access {open ? "▾" : "▸"}
      </button>

      {open && (
        <div className="mt-4 space-y-3 text-sm text-slate-600">
          <p>
            Start/stop timers and adjust time from a script, shortcut, or physical button —
            no browser needed. Send your key as{" "}
            <code className="bg-slate-100 px-1 rounded">Authorization: Bearer &lt;key&gt;</code>.
          </p>

          <div className="flex items-center gap-3">
            <button
              onClick={generate}
              className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium"
            >
              {user.hasApiKey ? "Regenerate key" : "Generate key"}
            </button>
            {user.hasApiKey && (
              <button onClick={revoke} className="text-slate-400 hover:text-red-600 text-sm">
                Revoke
              </button>
            )}
          </div>

          {newKey && (
            <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
              <p className="text-amber-800 text-xs mb-1">
                Save this now — it won't be shown again:
              </p>
              <code className="block bg-white border border-amber-200 rounded px-2 py-1 text-xs break-all">
                {newKey}
              </code>
            </div>
          )}

          <div className="bg-slate-50 rounded-md p-3 space-y-2 font-mono text-xs overflow-x-auto">
            <p># Start a timer</p>
            <p className="whitespace-pre">
              {`curl -X POST ${API_URL}/api/time-entries/start \\\n  -H "Authorization: Bearer <key>" -H "Content-Type: application/json" \\\n  -d '{"projectId":"<project-id>"}'`}
            </p>
            <p># Stop it</p>
            <p className="whitespace-pre">
              {`curl -X POST ${API_URL}/api/time-entries/stop \\\n  -H "Authorization: Bearer <key>"`}
            </p>
            <p># Add/remove time without a timer (e.g. -5 min)</p>
            <p className="whitespace-pre">
              {`curl -X POST ${API_URL}/api/time-entries/adjust \\\n  -H "Authorization: Bearer <key>" -H "Content-Type: application/json" \\\n  -d '{"projectId":"<project-id>","deltaSeconds":-300}'`}
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
