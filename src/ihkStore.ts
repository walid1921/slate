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
  position: number;
  created_at: string;
}

interface IHKState {
  entries: IHKEntry[];
  load: () => Promise<void>;
  add: (text: string, category: IHKCategory, date: string) => Promise<void>;
  update: (id: number, text: string) => Promise<void>;
  remove: (id: number) => Promise<void>;
  reorder: (orderedIds: number[]) => Promise<void>;
}

export const useIHKStore = create<IHKState>((set, get) => ({
  entries: [],

  load: async () => {
    const db = await getDb();
    const rows = await db.select<IHKEntry[]>(
      "SELECT id, text, category, date, position, created_at FROM ihk_entries ORDER BY position ASC, id ASC"
    );
    set({ entries: rows });
  },

  add: async (text, category, date) => {
    const db = await getDb();
    const res = await db.select<{ maxpos: number }[]>("SELECT COALESCE(MAX(position), 0) as maxpos FROM ihk_entries");
    const pos = (res[0]?.maxpos ?? 0) + 1;
    await db.execute(
      "INSERT INTO ihk_entries (text, category, date, position) VALUES (?, ?, ?, ?)",
      [text.trim(), category, date, pos]
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

  reorder: async (orderedIds) => {
    const db = await getDb();
    for (let i = 0; i < orderedIds.length; i++) {
      await db.execute("UPDATE ihk_entries SET position = ? WHERE id = ?", [i + 1, orderedIds[i]]);
    }
    set((s) => {
      const byId = new Map(s.entries.map(e => [e.id, e]));
      const reordered = orderedIds.map((id, i) => ({ ...byId.get(id)!, position: i + 1 }));
      const rest = s.entries.filter(e => !orderedIds.includes(e.id));
      return { entries: [...reordered, ...rest].sort((a, b) => a.position - b.position) };
    });
  },
}));
