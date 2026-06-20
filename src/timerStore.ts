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

export type StartResult = "ok" | "blocked";

interface TimerStore {
  sessions: TaskSession[];
  blockedMsg: string | null;
  clearBlockedMsg: () => void;
  load: () => Promise<void>;
  start: (taskId: number) => Promise<StartResult>;
  stop: (taskId: number) => Promise<void>;
  finish: (taskId: number, setStatus: (id: number, s: "done") => Promise<void>) => Promise<void>;
  runningTaskId: () => number | null;
  updateSession: (id: number, started_at: string, ended_at: string | null) => Promise<void>;
  deleteSession: (id: number) => Promise<void>;
}

export const useTimerStore = create<TimerStore>((set, get) => ({
  sessions: [],
  blockedMsg: null,
  clearBlockedMsg: () => set({ blockedMsg: null }),

  runningTaskId: () => get().sessions.find(s => !s.ended_at)?.task_id ?? null,

  load: async () => {
    const db = await getDb();
    // Cap any orphaned open sessions at started_at + 4 hours to prevent corrupt time logs
    const MAX_SESSION_MS = 4 * 60 * 60 * 1000;
    const open = await db.select<TaskSession[]>(
      "SELECT id, task_id, started_at, ended_at FROM task_sessions WHERE ended_at IS NULL"
    );
    for (const s of open) {
      const elapsed = Date.now() - new Date(s.started_at).getTime();
      if (elapsed > MAX_SESSION_MS) {
        const cappedEnd = new Date(new Date(s.started_at).getTime() + MAX_SESSION_MS).toISOString().slice(0, 19) + "Z";
        await db.execute("UPDATE task_sessions SET ended_at = ? WHERE id = ?", [cappedEnd, s.id]);
      }
    }
    const rows = await db.select<TaskSession[]>(
      "SELECT id, task_id, started_at, ended_at FROM task_sessions ORDER BY started_at ASC"
    );
    set({ sessions: rows });
  },

  start: async (taskId) => {
    const running = get().runningTaskId();
    if (running !== null && running !== taskId) {
      set({ blockedMsg: `Another task's timer is already running. Pause or finish it first.` });
      return "blocked";
    }
    const db = await getDb();
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
    return "ok";
  },

  stop: async (taskId) => {
    const db = await getDb();
    await db.execute(
      "UPDATE task_sessions SET ended_at = ? WHERE task_id = ? AND ended_at IS NULL",
      [nowIso(), taskId]
    );
    await get().load();
  },

  updateSession: async (id, started_at, ended_at) => {
    const db = await getDb();
    await db.execute("UPDATE task_sessions SET started_at = ?, ended_at = ? WHERE id = ?", [started_at, ended_at, id]);
    await get().load();
  },

  deleteSession: async (id) => {
    const db = await getDb();
    await db.execute("DELETE FROM task_sessions WHERE id = ?", [id]);
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
