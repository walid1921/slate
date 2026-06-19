import { create } from "zustand";
import { getDb } from "./db";
import { notify } from "./notifications";

export type Priority = "none" | "low" | "medium" | "high";

export interface Todo {
  id: number;
  text: string;
  done: boolean;
  priority: Priority;
  due_date: string | null;
  due_time: string | null;
  deadline_notified: boolean;
  position: number;
  created_at: string;
  deleted_at?: string | null;
  description: string;
}

interface State {
  todos: Todo[];
  trash: Todo[];
  query: string;
  loading: boolean;
  hasUnread: boolean;
  clearUnread: () => void;
  setQuery: (q: string) => void;
  load: () => Promise<void>;
  checkDueTodos: () => Promise<void>;
  loadTrash: () => Promise<void>;
  add: (text: string, priority?: Priority, due_date?: string | null, due_time?: string | null) => Promise<void>;
  toggle: (id: number) => Promise<void>;
  remove: (id: number) => Promise<void>;
  restore: (id: number) => Promise<void>;
  deletePermanently: (id: number) => Promise<void>;
  deleteAllPermanently: () => Promise<void>;
  setPriority: (id: number, priority: Priority) => Promise<void>;
  updateText: (id: number, text: string) => Promise<void>;
  setDeadline: (id: number, due_date: string | null, due_time: string | null) => Promise<void>;
  reorder: (ids: number[]) => Promise<void>;
  setDescription: (id: number, description: string) => Promise<void>;
}

export const useTodoStore = create<State>((set, get) => ({
  todos: [],
  trash: [],
  query: "",
  loading: true,
  hasUnread: false,
  clearUnread: () => set({ hasUnread: false }),

  setQuery: (query) => set({ query }),

  load: async () => {
    const db = await getDb();
    const rows = await db.select<Todo[]>(
      "SELECT id, text, done, priority, due_date, due_time, deadline_notified, position, created_at, description FROM todos WHERE deleted_at IS NULL ORDER BY position ASC, created_at DESC"
    );
    set({ todos: rows.map((r) => ({ ...r, done: Boolean(r.done), deadline_notified: Boolean(r.deadline_notified) })), loading: false });
  },

  checkDueTodos: async () => {
    const db = await getDb();
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const now = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    const today = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;

    const due = await db.select<{ id: number; text: string; due_time: string | null }[]>(
      `SELECT id, text, due_time FROM todos
       WHERE deadline_notified = 0 AND done = 0 AND deleted_at IS NULL
         AND due_date IS NOT NULL
         AND (
           (due_time IS NOT NULL AND (due_date || 'T' || due_time) <= ?)
           OR (due_time IS NULL AND due_date <= ?)
         )`,
      [now, today]
    );

    for (const t of due) {
      await notify("Slate — Task due", t.text);
      await db.execute("UPDATE todos SET deadline_notified = 1 WHERE id = ?", [t.id]);
    }
    if (due.length > 0) { set({ hasUnread: true }); await get().load(); }
  },

  loadTrash: async () => {
    const db = await getDb();
    const rows = await db.select<Todo[]>(
      "SELECT id, text, done, priority, due_date, position, created_at, deleted_at FROM todos WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC"
    );
    set({ trash: rows.map((r) => ({ ...r, done: Boolean(r.done) })) });
  },

  add: async (text, priority = "none", due_date = null, due_time = null) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const db = await getDb();
    await db.execute("UPDATE todos SET position = position + 1 WHERE deleted_at IS NULL");
    await db.execute(
      "INSERT INTO todos (text, priority, due_date, due_time, position) VALUES (?, ?, ?, ?, 0)",
      [trimmed, priority, due_date, due_time]
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

  updateText: async (id, text) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const db = await getDb();
    await db.execute("UPDATE todos SET text = ? WHERE id = ?", [trimmed, id]);
    set((s) => ({ todos: s.todos.map((t) => t.id === id ? { ...t, text: trimmed } : t) }));
  },

  setDeadline: async (id, due_date, due_time) => {
    const db = await getDb();
    await db.execute("UPDATE todos SET due_date = ?, due_time = ?, deadline_notified = 0 WHERE id = ?", [due_date, due_time, id]);
    set((s) => ({ todos: s.todos.map((t) => t.id === id ? { ...t, due_date, due_time } : t) }));
  },

  setDescription: async (id, description) => {
    const db = await getDb();
    await db.execute("UPDATE todos SET description = ? WHERE id = ?", [description, id]);
    set((s) => ({ todos: s.todos.map((t) => t.id === id ? { ...t, description } : t) }));
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
