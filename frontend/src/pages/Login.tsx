import { API_URL } from "../api";

export default function Login() {
  const params = new URLSearchParams(window.location.search);
  const hadError = params.get("error") === "1";

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="bg-white shadow-md rounded-xl p-10 w-full max-w-sm text-center">
        <h1 className="text-2xl font-bold text-slate-800 mb-2">TimeTracker</h1>
        <p className="text-slate-500 mb-8">Track time on your projects and climb the leaderboard.</p>

        {hadError && (
          <p className="mb-4 text-sm text-red-600">Login failed, please try again.</p>
        )}

        <a
          href={`${API_URL}/api/auth/google`}
          className="flex items-center justify-center gap-3 w-full border border-slate-300 rounded-lg py-2.5 px-4 font-medium text-slate-700 hover:bg-slate-50 transition"
        >
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path
              fill="#FFC107"
              d="M43.6 20.5h-1.9V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l5.7-5.7C33.9 6.1 29.2 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z"
            />
            <path
              fill="#FF3D00"
              d="M6.3 14.7l6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.8 1.1 8 3l5.7-5.7C33.9 6.1 29.2 4 24 4 16.3 4 9.6 8.3 6.3 14.7z"
            />
            <path
              fill="#4CAF50"
              d="M24 44c5.1 0 9.8-2 13.3-5.2l-6.1-5.2C29.2 35.6 26.7 36.5 24 36.5c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"
            />
            <path
              fill="#1976D2"
              d="M43.6 20.5h-1.9V20H24v8h11.3c-.8 2.3-2.2 4.2-4.1 5.6l6.1 5.2C40.5 36.1 44 30.6 44 24c0-1.3-.1-2.7-.4-3.5z"
            />
          </svg>
          Sign in with Google
        </a>
      </div>
    </div>
  );
}
