import { create } from "zustand";
import { getDb } from "./db";

export type Priority = "none" | "low" | "medium" | "high";

export interface Todo {
  id: number;
  text: string;
  done: boolean;
  priority: Priority;
  due_date: string | null;
  created_at: string;
}

interface State {
  todos: Todo[];
  query: string;
  loading: boolean;
  setQuery: (q: string) => void;
  load: () => Promise<void>;
  add: (text: string, priority?: Priority, due_date?: string | null) => Promise<void>;
  toggle: (id: number) => Promise<void>;
  remove: (id: number) => Promise<void>;
  setPriority: (id: number, priority: Priority) => Promise<void>;
  setDueDate: (id: number, due_date: string | null) => Promise<void>;
}

export const useTodoStore = create<State>((set, get) => ({
  todos: [],
  query: "",
  loading: true,

  setQuery: (query) => set({ query }),

  load: async () => {
    const db = await getDb();
    const rows = await db.select<Todo[]>(
      "SELECT id, text, done, priority, due_date, created_at FROM todos ORDER BY done ASC, created_at DESC"
    );
    set({
      todos: rows.map((r) => ({ ...r, done: Boolean(r.done) })),
      loading: false,
    });
  },

  add: async (text, priority = "none", due_date = null) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const db = await getDb();
    await db.execute(
      "INSERT INTO todos (text, priority, due_date) VALUES (?, ?, ?)",
      [trimmed, priority, due_date]
    );
    await get().load();
  },

  toggle: async (id) => {
    const todo = get().todos.find((t) => t.id === id);
    if (!todo) return;
    const db = await getDb();
    await db.execute("UPDATE todos SET done = ? WHERE id = ?", [
      todo.done ? 0 : 1,
      id,
    ]);
    await get().load();
  },

  remove: async (id) => {
    const db = await getDb();
    await db.execute("DELETE FROM todos WHERE id = ?", [id]);
    set((s) => ({ todos: s.todos.filter((t) => t.id !== id) }));
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
}));
