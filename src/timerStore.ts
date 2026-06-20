import { create } from "zustand";
import { getDb } from "./db";
import { logActivity } from "./activity";

export interface TaskSession {
  id: number;
  task_id: number;
  started_at: string;
  ended_at: string | null;
}

function nowIso(): string {
  return new Date().toISOString().slice(0, 19) + "Z";
}

interface TimerStore {
  sessions: TaskSession[];
  load: () => Promise<void>;
  start: (taskId: number) => Promise<void>;
  stop: (taskId: number) => Promise<void>;
  finish: (taskId: number, setStatus: (id: number, s: "done") => Promise<void>) => Promise<void>;
}

export const useTimerStore = create<TimerStore>((set, get) => ({
  sessions: [],

  load: async () => {
    const db = await getDb();
    const rows = await db.select<TaskSession[]>(
      "SELECT id, task_id, started_at, ended_at FROM task_sessions ORDER BY started_at ASC"
    );
    set({ sessions: rows });
  },

  start: async (taskId) => {
    const db = await getDb();
    // Stop any running session first (safety)
    await db.execute(
      "UPDATE task_sessions SET ended_at = ? WHERE task_id = ? AND ended_at IS NULL",
      [nowIso(), taskId]
    );
    await db.execute(
      "INSERT INTO task_sessions (task_id, started_at) VALUES (?, ?)",
      [taskId, nowIso()]
    );
    logActivity();
    await get().load();
  },

  stop: async (taskId) => {
    const db = await getDb();
    await db.execute(
      "UPDATE task_sessions SET ended_at = ? WHERE task_id = ? AND ended_at IS NULL",
      [nowIso(), taskId]
    );
    await get().load();
  },

  finish: async (taskId, setStatus) => {
    const db = await getDb();
    await db.execute(
      "UPDATE task_sessions SET ended_at = ? WHERE task_id = ? AND ended_at IS NULL",
      [nowIso(), taskId]
    );
    logActivity();
    await get().load();
    await setStatus(taskId, "done");
  },
}));

export function fmtDuration(ms: number): string {
  const s = Math.floor(Math.max(0, ms) / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

export function fmtElapsed(ms: number): string {
  const s = Math.floor(Math.max(0, ms) / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2,"0")}m`;
  if (m > 0) return `${m}m ${String(sec).padStart(2,"0")}s`;
  return `${sec}s`;
}

export function sessionDurationMs(s: TaskSession): number {
  const end = s.ended_at ? new Date(s.ended_at).getTime() : Date.now();
  return end - new Date(s.started_at).getTime();
}

export function totalDurationMs(sessions: TaskSession[]): number {
  return sessions.reduce((acc, s) => acc + sessionDurationMs(s), 0);
}
