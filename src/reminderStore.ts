import { create } from "zustand";
import { getDb } from "./db";
import { notify } from "./notifications";

export interface Reminder {
  id: number;
  text: string;
  remind_at: string;
  notified: boolean;
  created_at: string;
}

interface ReminderState {
  reminders: Reminder[];
  trash: Reminder[];
  hasUnread: boolean;
  pendingAlert: Reminder | null;
  clearUnread: () => void;
  dismissAlert: () => void;
  load: () => Promise<void>;
  loadTrash: () => Promise<void>;
  add: (text: string, remind_at: string) => Promise<void>;
  update: (id: number, text: string, remind_at: string) => Promise<void>;
  remove: (id: number) => Promise<void>;
  restore: (id: number) => Promise<void>;
  deletePermanently: (id: number) => Promise<void>;
  markSent: (id: number) => Promise<void>;
  checkDue: () => Promise<void>;
}

export const useReminderStore = create<ReminderState>((set, get) => ({
  reminders: [],
  trash: [],
  hasUnread: false,
  pendingAlert: null,
  clearUnread: () => set({ hasUnread: false }),
  dismissAlert: () => set({ pendingAlert: null }),

  load: async () => {
    const db = await getDb();
    const rows = await db.select<Reminder[]>(
      "SELECT id, text, remind_at, notified, created_at FROM reminders WHERE deleted_at IS NULL ORDER BY remind_at ASC"
    );
    set({ reminders: rows.map((r) => ({ ...r, notified: Boolean(r.notified) })) });
  },

  loadTrash: async () => {
    const db = await getDb();
    const rows = await db.select<Reminder[]>(
      "SELECT id, text, remind_at, notified, created_at FROM reminders WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC"
    );
    set({ trash: rows.map((r) => ({ ...r, notified: Boolean(r.notified) })) });
  },

  add: async (text, remind_at) => {
    const db = await getDb();
    await db.execute(
      "INSERT INTO reminders (text, remind_at) VALUES (?, ?)",
      [text, remind_at]
    );
    await get().load();
  },

  update: async (id, text, remind_at) => {
    const db = await getDb();
    await db.execute("UPDATE reminders SET text = ?, remind_at = ?, notified = 0 WHERE id = ?", [text.trim(), remind_at, id]);
    set((s) => ({ reminders: s.reminders.map((r) => r.id === id ? { ...r, text: text.trim(), remind_at, notified: false } : r) }));
  },

  remove: async (id) => {
    const db = await getDb();
    await db.execute("UPDATE reminders SET deleted_at = datetime('now') WHERE id = ?", [id]);
    set((s) => ({
      reminders: s.reminders.filter((r) => r.id !== id),
      pendingAlert: s.pendingAlert?.id === id ? null : s.pendingAlert,
    }));
    try {
      if (get().pendingAlert === null) {
        const { WebviewWindow } = await import("@tauri-apps/api/webviewWindow");
        const overlay = await WebviewWindow.getByLabel("reminder-overlay");
        if (overlay) await overlay.close();
      }
    } catch {}
  },

  restore: async (id) => {
    const db = await getDb();
    await db.execute("UPDATE reminders SET deleted_at = NULL WHERE id = ?", [id]);
    set((s) => ({ trash: s.trash.filter((r) => r.id !== id) }));
    await get().load();
  },

  deletePermanently: async (id) => {
    const db = await getDb();
    await db.execute("DELETE FROM reminders WHERE id = ?", [id]);
    set((s) => ({ trash: s.trash.filter((r) => r.id !== id) }));
  },

  markSent: async (id) => {
    const db = await getDb();
    const r = get().reminders.find((r) => r.id === id);
    if (r) await notify("Slate Reminder", r.text);
    await db.execute("UPDATE reminders SET notified = 1 WHERE id = ?", [id]);
    set((s) => ({
      reminders: s.reminders.map((r) => r.id === id ? { ...r, notified: true } : r),
      hasUnread: true,
      pendingAlert: s.pendingAlert?.id === id ? null : s.pendingAlert,
    }));
    try {
      const { WebviewWindow } = await import("@tauri-apps/api/webviewWindow");
      const overlay = await WebviewWindow.getByLabel("reminder-overlay");
      if (overlay) await overlay.close();
    } catch {}
  },

  checkDue: async () => {
    if (get().pendingAlert) return;
    const db = await getDb();
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const now = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    const fiveMinAgo = new Date(d.getTime() - 5 * 60 * 1000);
    const cutoff = `${fiveMinAgo.getFullYear()}-${pad(fiveMinAgo.getMonth()+1)}-${pad(fiveMinAgo.getDate())}T${pad(fiveMinAgo.getHours())}:${pad(fiveMinAgo.getMinutes())}:${pad(fiveMinAgo.getSeconds())}`;

    const due = await db.select<Reminder[]>(
      "SELECT id, text, remind_at, notified FROM reminders WHERE notified = 0 AND remind_at <= ?",
      [now]
    );

    // Silently mark stale reminders (older than 5 min) without showing overlay
    const stale = due.filter((r) => r.remind_at <= cutoff);
    for (const r of stale) {
      await db.execute("UPDATE reminders SET notified = 1 WHERE id = ?", [r.id]);
    }
    if (stale.length > 0) { set({ hasUnread: true }); await get().load(); }

    const fresh = due.filter((r) => r.remind_at > cutoff);
    if (fresh.length > 0) {
      const r = fresh[0];
      // Mark as notified immediately so it never re-fires even if the overlay crashes
      await db.execute("UPDATE reminders SET notified = 1 WHERE id = ?", [r.id]);
      set({ pendingAlert: r });
    }
  },
}));
