import { create } from "zustand";
import { getDb } from "./db";

export interface Note {
  id: number;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

interface NotesState {
  notes: Note[];
  trash: Note[];
  load: () => Promise<void>;
  loadTrash: () => Promise<void>;
  add: (title: string, content: string) => Promise<void>;
  update: (id: number, title: string, content: string) => Promise<void>;
  remove: (id: number) => Promise<void>;
  restore: (id: number) => Promise<void>;
  deletePermanently: (id: number) => Promise<void>;
}

export const useNotesStore = create<NotesState>((set, get) => ({
  notes: [],
  trash: [],

  load: async () => {
    const db = await getDb();
    const rows = await db.select<Note[]>(
      "SELECT id, title, content, created_at, updated_at FROM notes WHERE deleted_at IS NULL ORDER BY created_at DESC"
    );
    set({ notes: rows });
  },

  loadTrash: async () => {
    const db = await getDb();
    const rows = await db.select<Note[]>(
      "SELECT id, title, content, created_at, updated_at FROM notes WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC"
    );
    set({ trash: rows });
  },

  add: async (title, content) => {
    const db = await getDb();
    await db.execute(
      "INSERT INTO notes (title, content) VALUES (?, ?)",
      [title.trim() || "Untitled", content]
    );
    await get().load();
  },

  update: async (id, title, content) => {
    const db = await getDb();
    await db.execute(
      "UPDATE notes SET title = ?, content = ?, updated_at = datetime('now') WHERE id = ?",
      [title.trim() || "Untitled", content, id]
    );
    await get().load();
  },

  remove: async (id) => {
    const db = await getDb();
    await db.execute("UPDATE notes SET deleted_at = datetime('now') WHERE id = ?", [id]);
    set((s) => ({ notes: s.notes.filter((n) => n.id !== id) }));
  },

  restore: async (id) => {
    const db = await getDb();
    await db.execute("UPDATE notes SET deleted_at = NULL WHERE id = ?", [id]);
    set((s) => ({ trash: s.trash.filter((n) => n.id !== id) }));
    await get().load();
  },

  deletePermanently: async (id) => {
    const db = await getDb();
    await db.execute("DELETE FROM notes WHERE id = ?", [id]);
    set((s) => ({ trash: s.trash.filter((n) => n.id !== id) }));
  },
}));
