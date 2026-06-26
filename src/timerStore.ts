import { create } from "zustand";
import { getDb } from "./db";
import { logActivity } from "./activity";
import { showErrorToast } from "./toastStore";

export interface TaskSession {
  id: number;
  task_id: number;
  started_at: string;
  ended_at: string | null;
  deducted_ms: number;
}

function nowIso(): string {
  return new Date().toISOString().slice(0, 19) + "Z";
}

function toIso(ms: number): string {
  return new Date(ms).toISOString().slice(0, 19) + "Z";
}

export type StartResult = "ok" | "blocked";
export type IdleAction = "keep" | "subtract" | "stop";

export interface IdleReview {
  id: string;
  sessionId: number;
  taskId: number;
  idleStartMs: number;
  idleEndMs: number;
  durationMs: number;
  createdAt: number;
}

export type AutoStopReason = "display_sleep" | "system_sleep";

export interface AutoStopEvent {
  taskId: number;
  reason: AutoStopReason;
  sessionDurationMs: number;
  stoppedAtMs: number;
  detail: string; // human-readable, e.g. "Mac was asleep 23 min"
}

interface TimerStore {
  sessions: TaskSession[];
  blockedMsg: string | null;
  pendingTaskId: number | null;
  idleReviews: IdleReview[];
  currentIdleStartMs: number | null;
  autoStopEvent: AutoStopEvent | null;
  clearBlockedMsg: () => void;
  setAutoStop: (e: AutoStopEvent | null) => void;
  load: () => Promise<void>;
  start: (taskId: number) => Promise<StartResult>;
  stop: (taskId: number) => Promise<void>;
  finish: (taskId: number, setStatus: (id: number, s: "done") => Promise<void>) => Promise<void>;
  runningTaskId: () => number | null;
  runningSession: () => TaskSession | null;
  updateSession: (id: number, started_at: string, ended_at: string | null) => Promise<void>;
  deleteSession: (id: number) => Promise<void>;
  observeIdle: (idleSeconds: number, thresholdSeconds: number) => void;
  applyIdleAction: (reviewId: string, action: IdleAction) => Promise<void>;
  dismissReview: (reviewId: string) => void;
}

export const useTimerStore = create<TimerStore>((set, get) => ({
  sessions: [],
  blockedMsg: null,
  pendingTaskId: null,
  idleReviews: [],
  currentIdleStartMs: null,
  autoStopEvent: null,
  clearBlockedMsg: () => set({ blockedMsg: null, pendingTaskId: null }),
  setAutoStop: (e) => set({ autoStopEvent: e }),

  runningTaskId: () => get().sessions.find(s => !s.ended_at)?.task_id ?? null,
  runningSession: () => get().sessions.find(s => !s.ended_at) ?? null,

  load: async () => {
    try {
      const db = await getDb();
      // Cap any orphaned open sessions at started_at + 4 hours to prevent corrupt time logs
      const MAX_SESSION_MS = 4 * 60 * 60 * 1000;
      const open = await db.select<TaskSession[]>(
        "SELECT id, task_id, started_at, ended_at, deducted_ms FROM task_sessions WHERE ended_at IS NULL"
      );
      for (const s of open) {
        const elapsed = Date.now() - new Date(s.started_at).getTime();
        if (elapsed > MAX_SESSION_MS) {
          const cappedEnd = new Date(new Date(s.started_at).getTime() + MAX_SESSION_MS).toISOString().slice(0, 19) + "Z";
          await db.execute("UPDATE task_sessions SET ended_at = ? WHERE id = ?", [cappedEnd, s.id]);
        }
      }
      const rows = await db.select<TaskSession[]>(
        "SELECT id, task_id, started_at, ended_at, deducted_ms FROM task_sessions ORDER BY started_at ASC"
      );
      set({ sessions: rows.map(r => ({ ...r, deducted_ms: r.deducted_ms ?? 0 })) });
    } catch (e) {
      console.error("load timer sessions failed:", e);
      showErrorToast("Failed to load timers");
    }
  },

  start: async (taskId) => {
    const running = get().runningTaskId();
    if (running !== null && running !== taskId) {
      set({ blockedMsg: `Another task's timer is already running.`, pendingTaskId: taskId });
      return "blocked";
    }
    try {
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
      set({ currentIdleStartMs: null });
      await get().load();
      return "ok";
    } catch (e) {
      console.error("start timer failed:", e);
      showErrorToast("Couldn't start timer — please try again");
      return "blocked";
    }
  },

  stop: async (taskId) => {
    try {
      const db = await getDb();
      await db.execute(
        "UPDATE task_sessions SET ended_at = ? WHERE task_id = ? AND ended_at IS NULL",
        [nowIso(), taskId]
      );
      set({ currentIdleStartMs: null });
      await get().load();
    } catch (e) {
      console.error("stop timer failed:", e);
      showErrorToast("Couldn't stop timer — please try again");
    }
  },

  updateSession: async (id, started_at, ended_at) => {
    try {
      const db = await getDb();
      await db.execute("UPDATE task_sessions SET started_at = ?, ended_at = ? WHERE id = ?", [started_at, ended_at, id]);
      await get().load();
    } catch (e) {
      console.error("update session failed:", e);
      showErrorToast("Couldn't update session — please try again");
    }
  },

  deleteSession: async (id) => {
    try {
      const db = await getDb();
      await db.execute("DELETE FROM task_sessions WHERE id = ?", [id]);
      await get().load();
    } catch (e) {
      console.error("delete session failed:", e);
      showErrorToast("Couldn't delete session — please try again");
    }
  },

  finish: async (taskId, setStatus) => {
    try {
      const db = await getDb();
      await db.execute(
        "UPDATE task_sessions SET ended_at = ? WHERE task_id = ? AND ended_at IS NULL",
        [nowIso(), taskId]
      );
      logActivity();
      set({ currentIdleStartMs: null });
      await get().load();
      await setStatus(taskId, "done");
    } catch (e) {
      console.error("finish timer failed:", e);
      showErrorToast("Couldn't finish task — please try again");
    }
  },

  observeIdle: (idleSeconds, thresholdSeconds) => {
    const running = get().runningSession();
    if (!running) {
      if (get().currentIdleStartMs !== null) set({ currentIdleStartMs: null });
      return;
    }
    const now = Date.now();
    const idleStart = now - idleSeconds * 1000;
    if (idleSeconds >= thresholdSeconds) {
      // user is idle; record start if not already
      if (get().currentIdleStartMs === null) {
        set({ currentIdleStartMs: idleStart });
      }
    } else {
      // user is active again; close out any open idle period
      const start = get().currentIdleStartMs;
      if (start !== null) {
        const end = idleStart; // last activity time
        const dur = end - start;
        if (dur >= thresholdSeconds * 1000) {
          const review: IdleReview = {
            id: `${running.id}-${start}`,
            sessionId: running.id,
            taskId: running.task_id,
            idleStartMs: start,
            idleEndMs: end,
            durationMs: dur,
            createdAt: now,
          };
          // dedupe by id
          const existing = get().idleReviews.find(r => r.id === review.id);
          if (!existing) set({ idleReviews: [...get().idleReviews, review] });
        }
        set({ currentIdleStartMs: null });
      }
    }
  },

  applyIdleAction: async (reviewId, action) => {
    const review = get().idleReviews.find(r => r.id === reviewId);
    if (!review) return;
    try {
      const db = await getDb();
      if (action === "subtract") {
        await db.execute(
          "UPDATE task_sessions SET deducted_ms = deducted_ms + ? WHERE id = ?",
          [review.durationMs, review.sessionId]
        );
      } else if (action === "stop") {
        await db.execute(
          "UPDATE task_sessions SET ended_at = ? WHERE id = ?",
          [toIso(review.idleStartMs), review.sessionId]
        );
      }
      // "keep" → no-op
      set({ idleReviews: get().idleReviews.filter(r => r.id !== reviewId) });
      await get().load();
    } catch (e) {
      console.error("apply idle action failed:", e);
      showErrorToast("Couldn't apply idle action");
    }
  },

  dismissReview: (reviewId) => {
    set({ idleReviews: get().idleReviews.filter(r => r.id !== reviewId) });
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
  const raw = end - new Date(s.started_at).getTime();
  return Math.max(0, raw - (s.deducted_ms ?? 0));
}

export function totalDurationMs(sessions: TaskSession[]): number {
  return sessions.reduce((acc, s) => acc + sessionDurationMs(s), 0);
}
