import { create } from "zustand";
import { getDb } from "./db";
import { logActivity } from "./activity";

export const IHK_MODULE_TYPES = ["School", "Company", "Meeting"] as const;
export type IHKModuleType = 0 | 1 | 2; // 0=School→Berufsschule, 1=Company→Betrieb, 2=Meeting→Schulung

export interface IHKModule {
  id: number;
  name: string;
  type: IHKModuleType;
}

// Maps module type → IHK category
export const MODULE_TYPE_TO_CATEGORY: Record<IHKModuleType, IHKCategory> = { 0: 2, 1: 0, 2: 1 };

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
  sentWeeks: Set<string>;
  modules: IHKModule[];
  load: () => Promise<void>;
  loadModules: () => Promise<void>;
  addModule: (name: string, type: IHKModuleType) => Promise<void>;
  removeModule: (id: number) => Promise<void>;
  add: (text: string, category: IHKCategory, date: string) => Promise<void>;
  update: (id: number, text: string) => Promise<void>;
  remove: (id: number) => Promise<void>;
  reorder: (orderedIds: number[]) => Promise<void>;
  toggleSent: (weekKey: string) => Promise<void>;
}

export const useIHKStore = create<IHKState>((set, get) => ({
  entries: [],
  sentWeeks: new Set(),
  modules: [],

  loadModules: async () => {
    const db = await getDb();
    const rows = await db.select<IHKModule[]>("SELECT id, name, type FROM ihk_modules ORDER BY type ASC, name ASC");
    set({ modules: rows });
  },

  addModule: async (name, _type?) => {
    const db = await getDb();
    await db.execute("INSERT OR IGNORE INTO ihk_modules (name, type) VALUES (?, 2)", [name.trim()]);
    await get().loadModules();
  },

  removeModule: async (id) => {
    const db = await getDb();
    await db.execute("DELETE FROM ihk_modules WHERE id = ?", [id]);
    set(s => ({ modules: s.modules.filter(m => m.id !== id) }));
  },

  load: async () => {
    const db = await getDb();
    const rows = await db.select<IHKEntry[]>(
      "SELECT id, text, category, date, position, created_at FROM ihk_entries ORDER BY position ASC, id ASC"
    );
    const sentRows = await db.select<{ week_key: string }[]>("SELECT week_key FROM ihk_weeks WHERE sent = 1");
    const modRows = await db.select<IHKModule[]>("SELECT id, name, type FROM ihk_modules ORDER BY type ASC, name ASC");
    set({ entries: rows, sentWeeks: new Set(sentRows.map(r => r.week_key)), modules: modRows });
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
    set((s) => ({ entries: s.entries.filter((e) => e.id !== id) }));
  },

  toggleSent: async (weekKey) => {
    const db = await getDb();
    const isSent = get().sentWeeks.has(weekKey);
    await db.execute(
      "INSERT INTO ihk_weeks (week_key, sent) VALUES (?, ?) ON CONFLICT(week_key) DO UPDATE SET sent = excluded.sent",
      [weekKey, isSent ? 0 : 1]
    );
    if (!isSent) logActivity();
    set(s => {
      const next = new Set(s.sentWeeks);
      isSent ? next.delete(weekKey) : next.add(weekKey);
      return { sentWeeks: next };
    });
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
