import { create } from "zustand";
import { getDb } from "./db";
import { logActivity } from "./activity";
import { showErrorToast } from "./toastStore";

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
  add: (title: string, content: string) => Promise<number>;
  update: (id: number, title: string, content: string) => Promise<void>;
  remove: (id: number) => Promise<void>;
  restore: (id: number) => Promise<void>;
  deletePermanently: (id: number) => Promise<void>;
  deleteAllPermanently: () => Promise<void>;
}

export const useNotesStore = create<NotesState>((set, get) => ({
  notes: [],
  trash: [],

  load: async () => {
    try {
      const db = await getDb();
      const rows = await db.select<Note[]>(
        "SELECT id, title, content, created_at, updated_at FROM notes WHERE deleted_at IS NULL ORDER BY created_at DESC"
      );
      set({ notes: rows });
    } catch (e) {
      console.error("load notes failed:", e);
      showErrorToast("Failed to load notes");
    }
  },

  loadTrash: async () => {
    const db = await getDb();
    const rows = await db.select<Note[]>(
      "SELECT id, title, content, created_at, updated_at FROM notes WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC"
    );
    set({ trash: rows });
  },

  add: async (title, content) => {
    try {
      const db = await getDb();
      const result = await db.execute(
        "INSERT INTO notes (title, content) VALUES (?, ?)",
        [title.trim() || "Untitled", content]
      );
      logActivity();
      await get().load();
      return result.lastInsertId as number;
    } catch (e) {
      console.error("add note failed:", e);
      showErrorToast("Couldn't save note — please try again");
      return 0;
    }
  },

  update: async (id, title, content) => {
    try {
      const db = await getDb();
      await db.execute(
        "UPDATE notes SET title = ?, content = ?, updated_at = datetime('now') WHERE id = ?",
        [title.trim() || "Untitled", content, id]
      );
      logActivity();
      await get().load();
    } catch (e) {
      console.error("update note failed:", e);
      showErrorToast("Couldn't save note — please try again");
    }
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

  deleteAllPermanently: async () => {
    const db = await getDb();
    await db.execute("DELETE FROM notes WHERE deleted_at IS NOT NULL");
    set({ trash: [] });
  },
}));
