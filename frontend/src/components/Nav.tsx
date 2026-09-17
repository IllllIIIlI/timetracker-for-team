import { NavLink } from "react-router-dom";
import { useAuth } from "../AuthContext";

export default function Nav() {
  const { user, logout } = useAuth();

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `px-3 py-2 rounded-md text-sm font-medium ${
      isActive ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-100"
    }`;

  return (
    <nav className="bg-white border-b border-slate-200">
      <div className="max-w-4xl mx-auto px-4 py-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1 flex-wrap">
          <span className="font-bold text-slate-800 mr-2 sm:mr-4">TimeTracker</span>
          <NavLink to="/" end className={linkClass}>
            Dashboard
          </NavLink>
          <NavLink to="/leaderboard" className={linkClass}>
            Leaderboard
          </NavLink>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          {user?.avatarUrl && (
            <img src={user.avatarUrl} alt={user.name} className="w-7 h-7 rounded-full shrink-0" />
          )}
          <span className="hidden sm:inline text-sm text-slate-600">{user?.name}</span>
          <button
            onClick={() => logout()}
            className="text-sm text-slate-500 hover:text-slate-800"
          >
            Sign out
          </button>
        </div>
      </div>
    </nav>
  );
}
