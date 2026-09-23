import { useState } from "react";
import { useAuth } from "../AuthContext";

export default function DangerZone() {
  const { user, deleteAccount } = useAuth();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) return null;

  const handleDelete = async () => {
    setBusy(true);
    setError(null);
    try {
      await deleteAccount();
    } catch (err: any) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <section className="bg-white rounded-xl shadow-sm border border-red-200 p-6">
      <h2 className="font-semibold text-red-700 mb-2">Danger zone</h2>
      <p className="text-sm text-slate-500 mb-3">
        Permanently deletes your account, your time entries, and any project only you're a
        member of. Projects you own with other members are handed to the next member
        instead of being deleted.
      </p>

      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

      {!confirming ? (
        <button
          onClick={() => setConfirming(true)}
          className="text-sm text-red-600 hover:text-red-800 font-medium"
        >
          Delete my account
        </button>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-slate-700">Are you sure? This can't be undone.</span>
          <button
            onClick={handleDelete}
            disabled={busy}
            className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            {busy ? "Deleting…" : "Yes, delete everything"}
          </button>
          <button
            onClick={() => setConfirming(false)}
            disabled={busy}
            className="text-sm text-slate-500 hover:text-slate-800"
          >
            Cancel
          </button>
        </div>
      )}
    </section>
  );
}
