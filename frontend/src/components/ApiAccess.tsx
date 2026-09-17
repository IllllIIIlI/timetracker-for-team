import { useState } from "react";
import { api } from "../api";
import { useAuth } from "../AuthContext";

// Just key generation — see the README for curl examples of using it.
export default function ApiAccess() {
  const { user, refresh } = useAuth();
  const [newKey, setNewKey] = useState<string | null>(null);

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
    <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <h2 className="font-semibold text-slate-800 mb-3">API key</h2>

      <div className="flex flex-wrap items-center gap-3">
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
        <div className="mt-3 bg-amber-50 border border-amber-200 rounded-md p-3">
          <p className="text-amber-800 text-xs mb-1">Save this now — it won't be shown again:</p>
          <code className="block bg-white border border-amber-200 rounded px-2 py-1 text-xs break-all">
            {newKey}
          </code>
        </div>
      )}
    </section>
  );
}
