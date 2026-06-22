import { create } from "zustand";
import { getDb } from "./db";
import { showErrorToast } from "./toastStore";

export type DevPriority = "none" | "low" | "medium" | "high";

export interface DevItem {
  id: number;
  text: string;
  done: boolean;
  category_id: number;
  priority: DevPriority;
  position: number;
  created_at: string;
}

export interface DevCategory {
  id: number;
  name: string;
  color: string;
  icon: string;
  position: number;
  is_preset: boolean;
}

interface DevStore {
  items: DevItem[];
  categories: DevCategory[];
  loading: boolean;
  load: () => Promise<void>;
  addItem: (text: string, categoryId: number, priority?: DevPriority) => Promise<void>;
  toggleItem: (id: number) => Promise<void>;
  deleteItem: (id: number) => Promise<void>;
  updateItemText: (id: number, text: string) => Promise<void>;
  updateItemPriority: (id: number, priority: DevPriority) => Promise<void>;
  resetCategory: (categoryId: number) => Promise<void>;
  reorderItems: (categoryId: number, orderedIds: number[]) => Promise<void>;
  addCategory: (name: string, color: string, icon: string) => Promise<void>;
  removeCategory: (id: number) => Promise<void>;
  updateCategoryColor: (id: number, color: string) => Promise<void>;
}

export const useDevStore = create<DevStore>((set, get) => ({
  items: [],
  categories: [],
  loading: true,

  load: async () => {
    try {
      const db = await getDb();
      const cats = await db.select<DevCategory[]>(
        "SELECT id, name, color, icon, position, is_preset FROM dev_categories ORDER BY position ASC, id ASC"
      );
      const rows = await db.select<DevItem[]>(
        "SELECT id, text, done, category_id, priority, position, created_at FROM dev_items WHERE deleted_at IS NULL ORDER BY position ASC, id ASC"
      );
      set({
        categories: cats.map(c => ({ ...c, is_preset: Boolean(c.is_preset) })),
        items: rows.map(r => ({ ...r, done: Boolean(r.done) })),
        loading: false,
      });
    } catch (e) {
      console.error("load dev items failed:", e);
      showErrorToast("Failed to load dev checklist");
      set({ loading: false });
    }
  },

  addItem: async (text, categoryId, priority = "none") => {
    const trimmed = text.trim();
    if (!trimmed) return;
    try {
      const db = await getDb();
      const pos = get().items.filter(i => i.category_id === categoryId).length;
      await db.execute(
        "INSERT INTO dev_items (text, category_id, priority, position) VALUES (?, ?, ?, ?)",
        [trimmed, categoryId, priority, pos]
      );
      await get().load();
    } catch (e) {
      console.error("add dev item failed:", e);
      showErrorToast("Couldn't save item");
    }
  },

  toggleItem: async (id) => {
    const item = get().items.find(i => i.id === id);
    if (!item) return;
    try {
      const db = await getDb();
      await db.execute("UPDATE dev_items SET done = ? WHERE id = ?", [item.done ? 0 : 1, id]);
      set(s => ({ items: s.items.map(i => i.id === id ? { ...i, done: !i.done } : i) }));
    } catch (e) {
      showErrorToast("Couldn't update item");
    }
  },

  deleteItem: async (id) => {
    try {
      const db = await getDb();
      await db.execute("UPDATE dev_items SET deleted_at = datetime('now') WHERE id = ?", [id]);
      set(s => ({ items: s.items.filter(i => i.id !== id) }));
    } catch (e) {
      showErrorToast("Couldn't delete item");
    }
  },

  updateItemText: async (id, text) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    try {
      const db = await getDb();
      await db.execute("UPDATE dev_items SET text = ? WHERE id = ?", [trimmed, id]);
      set(s => ({ items: s.items.map(i => i.id === id ? { ...i, text: trimmed } : i) }));
    } catch (e) {
      showErrorToast("Couldn't update item");
    }
  },

  updateItemPriority: async (id, priority) => {
    try {
      const db = await getDb();
      await db.execute("UPDATE dev_items SET priority = ? WHERE id = ?", [priority, id]);
      set(s => ({ items: s.items.map(i => i.id === id ? { ...i, priority } : i) }));
    } catch (e) {
      showErrorToast("Couldn't update priority");
    }
  },

  reorderItems: async (_categoryId, orderedIds) => {
    try {
      const db = await getDb();
      for (let i = 0; i < orderedIds.length; i++) {
        await db.execute("UPDATE dev_items SET position = ? WHERE id = ?", [i, orderedIds[i]]);
      }
      const posMap = new Map(orderedIds.map((id, i) => [id, i]));
      set(s => ({
        items: s.items
          .map(item => posMap.has(item.id) ? { ...item, position: posMap.get(item.id)! } : item)
          .sort((a, b) => a.position - b.position),
      }));
    } catch (e) {
      showErrorToast("Couldn't reorder items");
    }
  },

  resetCategory: async (categoryId) => {
    try {
      const db = await getDb();
      await db.execute("UPDATE dev_items SET done = 0 WHERE category_id = ? AND deleted_at IS NULL", [categoryId]);
      set(s => ({ items: s.items.map(i => i.category_id === categoryId ? { ...i, done: false } : i) }));
    } catch (e) {
      showErrorToast("Couldn't reset category");
    }
  },

  addCategory: async (name, color, icon) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    try {
      const db = await getDb();
      const pos = get().categories.length;
      await db.execute(
        "INSERT INTO dev_categories (name, color, icon, position, is_preset) VALUES (?, ?, ?, ?, 0)",
        [trimmed, color, icon, pos]
      );
      await get().load();
    } catch (e) {
      showErrorToast("Couldn't add category");
    }
  },

  removeCategory: async (id) => {
    try {
      const db = await getDb();
      await db.execute("UPDATE dev_items SET deleted_at = datetime('now') WHERE category_id = ? AND deleted_at IS NULL", [id]);
      await db.execute("DELETE FROM dev_categories WHERE id = ? AND is_preset = 0", [id]);
      await get().load();
    } catch (e) {
      showErrorToast("Couldn't remove category");
    }
  },

  updateCategoryColor: async (id, color) => {
    try {
      const db = await getDb();
      await db.execute("UPDATE dev_categories SET color = ? WHERE id = ?", [color, id]);
      set(s => ({ categories: s.categories.map(c => c.id === id ? { ...c, color } : c) }));
    } catch (e) {
      showErrorToast("Couldn't update color");
    }
  },
}));
