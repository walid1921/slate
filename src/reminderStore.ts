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
  load: () => Promise<void>;
  add: (text: string, remind_at: string) => Promise<void>;
  remove: (id: number) => Promise<void>;
  checkDue: () => Promise<void>;
}

export const useReminderStore = create<ReminderState>((set, get) => ({
  reminders: [],

  load: async () => {
    const db = await getDb();
    const rows = await db.select<Reminder[]>(
      "SELECT id, text, remind_at, notified, created_at FROM reminders ORDER BY remind_at ASC"
    );
    set({ reminders: rows.map((r) => ({ ...r, notified: Boolean(r.notified) })) });
  },

  add: async (text, remind_at) => {
    const db = await getDb();
    await db.execute(
      "INSERT INTO reminders (text, remind_at) VALUES (?, ?)",
      [text, remind_at]
    );
    await get().load();
  },

  remove: async (id) => {
    const db = await getDb();
    await db.execute("DELETE FROM reminders WHERE id = ?", [id]);
    set((s) => ({ reminders: s.reminders.filter((r) => r.id !== id) }));
  },

  checkDue: async () => {
    const db = await getDb();
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const now = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;

    const due = await db.select<Reminder[]>(
      "SELECT id, text, remind_at, notified FROM reminders WHERE notified = 0 AND remind_at <= ?",
      [now]
    );
    for (const r of due) {
      await notify("Slate Reminder", r.text);
      await db.execute("UPDATE reminders SET notified = 1 WHERE id = ?", [r.id]);
    }
    if (due.length > 0) await get().load();
  },
}));
