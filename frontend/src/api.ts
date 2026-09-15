export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
}

export interface Project {
  id: string;
  name: string;
  color: string;
  createdAt: string;
  role: "OWNER" | "MEMBER";
}

export interface ProjectMemberInfo {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
  role: "OWNER" | "MEMBER";
}

export interface ProjectMembers {
  members: ProjectMemberInfo[];
  pendingInvites: string[];
}

export interface TimeEntry {
  id: string;
  description: string | null;
  startTime: string;
  endTime: string | null;
  durationSeconds: number | null;
  project: Project;
}

export interface ActiveEntry {
  entry: TimeEntry | null;
  serverNow: string;
}

export interface LeaderboardRow {
  user: { id: string; name: string; avatarUrl?: string | null };
  totalSeconds: number;
}

class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(body.error || "Request failed", res.status);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  me: () => request<User>("/api/auth/me"),
  logout: () => request<void>("/api/auth/logout", { method: "POST" }),

  projects: {
    list: () => request<Project[]>("/api/projects"),
    create: (name: string, color?: string) =>
      request<Project>("/api/projects", { method: "POST", body: JSON.stringify({ name, color }) }),
    remove: (id: string) => request<void>(`/api/projects/${id}`, { method: "DELETE" }),
    members: (projectId: string) => request<ProjectMembers>(`/api/projects/${projectId}/members`),
    invite: (projectId: string, email: string) =>
      request<{ status: "added" | "pending" }>(`/api/projects/${projectId}/invite`, {
        method: "POST",
        body: JSON.stringify({ email }),
      }),
    removeMember: (projectId: string, userId: string) =>
      request<void>(`/api/projects/${projectId}/members/${userId}`, { method: "DELETE" }),
  },

  timeEntries: {
    list: () => request<TimeEntry[]>("/api/time-entries"),
    active: () => request<ActiveEntry>("/api/time-entries/active"),
    start: (projectId: string, description?: string) =>
      request<ActiveEntry>("/api/time-entries/start", {
        method: "POST",
        body: JSON.stringify({ projectId, description }),
      }),
    stop: () => request<TimeEntry>("/api/time-entries/stop", { method: "POST" }),
    createManual: (projectId: string, startTime: string, endTime: string, description?: string) =>
      request<TimeEntry>("/api/time-entries", {
        method: "POST",
        body: JSON.stringify({ projectId, startTime, endTime, description }),
      }),
    remove: (id: string) => request<void>(`/api/time-entries/${id}`, { method: "DELETE" }),
  },

  leaderboard: (projectId: string, period: string) =>
    request<LeaderboardRow[]>(`/api/leaderboard?projectId=${projectId}&period=${period}`),
};

export { ApiError };
