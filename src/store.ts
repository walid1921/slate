import { create } from "zustand";
import { getDb } from "./db";
import { notify } from "./notifications";
import { logActivity } from "./activity";

export type Priority = "none" | "low" | "medium" | "high";

export interface TaskCategory {
  id: number;
  name: string;
  color: string;
  position: number;
}

export type TodoStatus = 'todo' | 'in_progress' | 'done';

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
  category_id: number;
  status: TodoStatus;
}

const PRESET_COLORS = [
  "59,130,246", "99,102,241", "168,85,247", "236,72,153",
  "239,68,68",  "245,158,11", "16,185,129", "20,184,166",
];

export interface DeletedCategory {
  id: number;
  name: string;
  color: string;
}

interface State {
  todos: Todo[];
  trash: Todo[];
  categories: TaskCategory[];
  deletedCategories: DeletedCategory[];
  query: string;
  loading: boolean;
  hasUnread: boolean;
  clearUnread: () => void;
  setQuery: (q: string) => void;
  load: () => Promise<void>;
  loadCategories: () => Promise<void>;
  addCategory: (name: string) => Promise<void>;
  removeCategory: (id: number) => Promise<void>;
  updateCategoryName: (id: number, name: string) => Promise<void>;
  checkDueTodos: () => Promise<void>;
  loadTrash: () => Promise<void>;
  add: (text: string, priority?: Priority, due_date?: string | null, due_time?: string | null, category_id?: number) => Promise<void>;
  toggle: (id: number) => Promise<void>;
  remove: (id: number) => Promise<void>;
  restore: (id: number) => Promise<void>;
  deletePermanently: (id: number) => Promise<void>;
  deleteAllPermanently: () => Promise<void>;
  deleteGroupPermanently: (categoryId: number) => Promise<void>;
  setPriority: (id: number, priority: Priority) => Promise<void>;
  updateText: (id: number, text: string) => Promise<void>;
  setDeadline: (id: number, due_date: string | null, due_time: string | null) => Promise<void>;
  reorder: (ids: number[]) => Promise<void>;
  setDescription: (id: number, description: string) => Promise<void>;
  setStatus: (id: number, status: TodoStatus) => Promise<void>;
}

export const useTodoStore = create<State>((set, get) => ({
  todos: [],
  trash: [],
  categories: [],
  deletedCategories: [],
  query: "",
  loading: true,
  hasUnread: false,
  clearUnread: () => set({ hasUnread: false }),

  setQuery: (query) => set({ query }),

  loadCategories: async () => {
    const db = await getDb();
    const rows = await db.select<TaskCategory[]>("SELECT id, name, color, position FROM task_categories ORDER BY position ASC, id ASC");
    set({ categories: rows });
  },

  addCategory: async (name) => {
    const db = await getDb();
    const existing = get().categories;
    const color = PRESET_COLORS[existing.length % PRESET_COLORS.length];
    const pos = existing.length;
    await db.execute("INSERT OR IGNORE INTO task_categories (name, color, position) VALUES (?, ?, ?)", [name.trim(), color, pos]);
    await get().loadCategories();
  },

  updateCategoryName: async (id, name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const db = await getDb();
    await db.execute("UPDATE task_categories SET name = ? WHERE id = ?", [trimmed, id]);
    await get().loadCategories();
  },

  removeCategory: async (id) => {
    if (id === 1) return;
    const db = await getDb();
    const rows = await db.select<{ name: string; color: string }[]>("SELECT name, color FROM task_categories WHERE id = ?", [id]);
    if (rows[0]) {
      await db.execute("INSERT OR REPLACE INTO deleted_categories (id, name, color) VALUES (?, ?, ?)", [id, rows[0].name, rows[0].color]);
    }
    await db.execute("UPDATE todos SET deleted_at = datetime('now') WHERE category_id = ? AND deleted_at IS NULL", [id]);
    await db.execute("DELETE FROM task_categories WHERE id = ?", [id]);
    await get().loadCategories();
    await get().load();
  },

  load: async () => {
    const db = await getDb();
    const rows = await db.select<Todo[]>(
      "SELECT id, text, done, priority, due_date, due_time, deadline_notified, position, created_at, description, category_id, status FROM todos WHERE deleted_at IS NULL ORDER BY position ASC, created_at DESC"
    );
    set({ todos: rows.map((r) => ({ ...r, done: Boolean(r.done), deadline_notified: Boolean(r.deadline_notified), status: (r.status as TodoStatus) || (r.done ? 'done' : 'todo') })), loading: false });
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
      "SELECT id, text, done, priority, due_date, position, created_at, deleted_at, category_id, status FROM todos WHERE deleted_at IS NOT NULL ORDER BY category_id ASC, deleted_at DESC"
    );
    const deletedCats = await db.select<DeletedCategory[]>("SELECT id, name, color FROM deleted_categories");
    set({ trash: rows.map((r) => ({ ...r, done: Boolean(r.done) })), deletedCategories: deletedCats });
  },

  deleteGroupPermanently: async (categoryId) => {
    const db = await getDb();
    await db.execute("DELETE FROM todos WHERE deleted_at IS NOT NULL AND category_id = ?", [categoryId]);
    await db.execute("DELETE FROM deleted_categories WHERE id = ?", [categoryId]);
    const { trash, deletedCategories } = get();
    set({
      trash: trash.filter(t => t.category_id !== categoryId),
      deletedCategories: deletedCategories.filter(c => c.id !== categoryId),
    });
  },

  add: async (text, priority = "none", due_date = null, due_time = null, category_id = 1) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const db = await getDb();
    await db.execute("UPDATE todos SET position = position + 1 WHERE deleted_at IS NULL");
    await db.execute(
      "INSERT INTO todos (text, priority, due_date, due_time, position, category_id) VALUES (?, ?, ?, ?, 0, ?)",
      [trimmed, priority, due_date, due_time, category_id]
    );
    logActivity();
    await get().load();
  },

  toggle: async (id) => {
    const todo = get().todos.find((t) => t.id === id);
    if (!todo) return;
    const db = await getDb();
    const newDone = !todo.done;
    const newStatus = newDone ? 'done' : 'todo';
    await db.execute("UPDATE todos SET done = ?, status = ? WHERE id = ?", [newDone ? 1 : 0, newStatus, id]);
    logActivity();
    await get().load();
  },

  setStatus: async (id, status) => {
    const db = await getDb();
    const done = status === 'done' ? 1 : 0;
    await db.execute("UPDATE todos SET status = ?, done = ? WHERE id = ?", [status, done, id]);
    logActivity();
    await get().load();
  },

  // Soft delete
  remove: async (id) => {
    const db = await getDb();
    await db.execute("UPDATE todos SET deleted_at = datetime('now') WHERE id = ?", [id]);
    logActivity();
    set((s) => ({ todos: s.todos.filter((t) => t.id !== id) }));
  },

  restore: async (id) => {
    const db = await getDb();
    await db.execute("UPDATE todos SET deleted_at = NULL WHERE id = ?", [id]);
    logActivity();
    set((s) => ({ trash: s.trash.filter((t) => t.id !== id) }));
    await get().load();
  },

  deletePermanently: async (id) => {
    const db = await getDb();
    await db.execute("DELETE FROM todos WHERE id = ?", [id]);
    logActivity();
    set((s) => ({ trash: s.trash.filter((t) => t.id !== id) }));
  },

  deleteAllPermanently: async () => {
    const db = await getDb();
    await db.execute("DELETE FROM todos WHERE deleted_at IS NOT NULL");
    logActivity();
    set({ trash: [] });
  },

  setPriority: async (id, priority) => {
    const db = await getDb();
    await db.execute("UPDATE todos SET priority = ? WHERE id = ?", [priority, id]);
    logActivity();
    await get().load();
  },

  updateText: async (id, text) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const db = await getDb();
    await db.execute("UPDATE todos SET text = ? WHERE id = ?", [trimmed, id]);
    logActivity();
    set((s) => ({ todos: s.todos.map((t) => t.id === id ? { ...t, text: trimmed } : t) }));
  },

  setDeadline: async (id, due_date, due_time) => {
    const db = await getDb();
    await db.execute("UPDATE todos SET due_date = ?, due_time = ?, deadline_notified = 0 WHERE id = ?", [due_date, due_time, id]);
    logActivity();
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
