import { create } from "zustand";
import { getDb } from "./db";
import { logActivity } from "./activity";

export const IHK_CATEGORIES = [
  "Betriebliche Tätigkeiten",
  "Unterweisungen / Schulungen",
  "Berufsschule",
] as const;

export type IHKCategory = 0 | 1 | 2;

export interface IHKEntry {
  id: number;
  text: string;
  category: IHKCategory;
  date: string;
  created_at: string;
}

interface IHKState {
  entries: IHKEntry[];
  load: () => Promise<void>;
  add: (text: string, category: IHKCategory, date: string) => Promise<void>;
  update: (id: number, text: string) => Promise<void>;
  remove: (id: number) => Promise<void>;
}

export const useIHKStore = create<IHKState>((set, get) => ({
  entries: [],

  load: async () => {
    const db = await getDb();
    const rows = await db.select<IHKEntry[]>(
      "SELECT id, text, category, date, created_at FROM ihk_entries ORDER BY date ASC, id ASC"
    );
    set({ entries: rows });
  },

  add: async (text, category, date) => {
    const db = await getDb();
    await db.execute(
      "INSERT INTO ihk_entries (text, category, date) VALUES (?, ?, ?)",
      [text.trim(), category, date]
    );
    logActivity();
    await get().load();
  },

  update: async (id, text) => {
    const db = await getDb();
    await db.execute("UPDATE ihk_entries SET text = ? WHERE id = ?", [text.trim(), id]);
    logActivity();
    await get().load();
  },

  remove: async (id) => {
    const db = await getDb();
    await db.execute("DELETE FROM ihk_entries WHERE id = ?", [id]);
    logActivity();
    set((s) => ({ entries: s.entries.filter((e) => e.id !== id) }));
  },
}));
