import { NavLink } from "react-router-dom";
import { useAuth } from "../AuthContext";

export default function Nav() {
  const { user, logout } = useAuth();

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `px-3 py-1.5 rounded-md text-sm font-medium ${
      isActive ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-100"
    }`;

  return (
    <nav className="bg-white border-b border-slate-200">
      {/* Always two rows — brand/account on top, nav links below — so
          nothing has to fit on one line regardless of screen width. */}
      <div className="max-w-4xl mx-auto px-4 py-2">
        <div className="flex items-center justify-between gap-2">
          <span className="font-bold text-slate-800">TimeTracker</span>
          <div className="flex items-center gap-2 min-w-0">
            {user?.avatarUrl && (
              <img src={user.avatarUrl} alt={user.name} className="w-7 h-7 rounded-full shrink-0" />
            )}
            <span className="hidden sm:inline text-sm text-slate-600 truncate">{user?.name}</span>
            <button
              onClick={() => logout()}
              className="text-sm text-slate-500 hover:text-slate-800 shrink-0"
            >
              Sign out
            </button>
          </div>
        </div>
        <div className="flex items-center gap-1 mt-1 -ml-3">
          <NavLink to="/" end className={linkClass}>
            Dashboard
          </NavLink>
          <NavLink to="/leaderboard" className={linkClass}>
            Leaderboard
          </NavLink>
        </div>
      </div>
    </nav>
  );
}
