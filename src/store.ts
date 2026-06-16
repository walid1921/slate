import { create } from "zustand";
import { getDb } from "./db";

export type Priority = "none" | "low" | "medium" | "high";

export interface Todo {
  id: number;
  text: string;
  done: boolean;
  priority: Priority;
  due_date: string | null;
  position: number;
  created_at: string;
  deleted_at?: string | null;
}

interface State {
  todos: Todo[];
  trash: Todo[];
  query: string;
  loading: boolean;
  setQuery: (q: string) => void;
  load: () => Promise<void>;
  loadTrash: () => Promise<void>;
  add: (text: string, priority?: Priority, due_date?: string | null) => Promise<void>;
  toggle: (id: number) => Promise<void>;
  remove: (id: number) => Promise<void>;
  restore: (id: number) => Promise<void>;
  deletePermanently: (id: number) => Promise<void>;
  deleteAllPermanently: () => Promise<void>;
  setPriority: (id: number, priority: Priority) => Promise<void>;
  setDueDate: (id: number, due_date: string | null) => Promise<void>;
  reorder: (ids: number[]) => Promise<void>;
}

export const useTodoStore = create<State>((set, get) => ({
  todos: [],
  trash: [],
  query: "",
  loading: true,

  setQuery: (query) => set({ query }),

  load: async () => {
    const db = await getDb();
    const rows = await db.select<Todo[]>(
      "SELECT id, text, done, priority, due_date, position, created_at FROM todos WHERE deleted_at IS NULL ORDER BY position ASC, created_at DESC"
    );
    set({ todos: rows.map((r) => ({ ...r, done: Boolean(r.done) })), loading: false });
  },

  loadTrash: async () => {
    const db = await getDb();
    const rows = await db.select<Todo[]>(
      "SELECT id, text, done, priority, due_date, position, created_at, deleted_at FROM todos WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC"
    );
    set({ trash: rows.map((r) => ({ ...r, done: Boolean(r.done) })) });
  },

  add: async (text, priority = "none", due_date = null) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const db = await getDb();
    const rows = await db.select<{ max: number }[]>("SELECT COALESCE(MAX(position), -1) as max FROM todos WHERE deleted_at IS NULL");
    const nextPos = (rows[0]?.max ?? -1) + 1;
    await db.execute(
      "INSERT INTO todos (text, priority, due_date, position) VALUES (?, ?, ?, ?)",
      [trimmed, priority, due_date, nextPos]
    );
    await get().load();
  },

  toggle: async (id) => {
    const todo = get().todos.find((t) => t.id === id);
    if (!todo) return;
    const db = await getDb();
    await db.execute("UPDATE todos SET done = ? WHERE id = ?", [todo.done ? 0 : 1, id]);
    await get().load();
  },

  // Soft delete
  remove: async (id) => {
    const db = await getDb();
    await db.execute("UPDATE todos SET deleted_at = datetime('now') WHERE id = ?", [id]);
    set((s) => ({ todos: s.todos.filter((t) => t.id !== id) }));
  },

  restore: async (id) => {
    const db = await getDb();
    await db.execute("UPDATE todos SET deleted_at = NULL WHERE id = ?", [id]);
    set((s) => ({ trash: s.trash.filter((t) => t.id !== id) }));
    await get().load();
  },

  deletePermanently: async (id) => {
    const db = await getDb();
    await db.execute("DELETE FROM todos WHERE id = ?", [id]);
    set((s) => ({ trash: s.trash.filter((t) => t.id !== id) }));
  },

  deleteAllPermanently: async () => {
    const db = await getDb();
    await db.execute("DELETE FROM todos WHERE deleted_at IS NOT NULL");
    set({ trash: [] });
  },

  setPriority: async (id, priority) => {
    const db = await getDb();
    await db.execute("UPDATE todos SET priority = ? WHERE id = ?", [priority, id]);
    await get().load();
  },

  setDueDate: async (id, due_date) => {
    const db = await getDb();
    await db.execute("UPDATE todos SET due_date = ? WHERE id = ?", [due_date, id]);
    await get().load();
  },

  reorder: async (ids) => {
    const current = get().todos;
    const reordered = ids.map((id) => current.find((t) => t.id === id)!).filter(Boolean);
    set({ todos: reordered });
    const db = await getDb();
    for (let i = 0; i < ids.length; i++) {
      await db.execute("UPDATE todos SET position = ? WHERE id = ?", [i, ids[i]]);
    }
  },
}));
