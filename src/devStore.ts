import { create } from "zustand";
import { getDb, resetDevDb } from "./db";
import { showErrorToast } from "./toastStore";

export type DevPriority = "none" | "low" | "medium" | "high";

export interface DevItem {
  id: number;
  text: string;
  done: boolean;
  category_id: number;
  priority: DevPriority;
  position: number;
  description: string;
  created_at: string;
}

export interface DevCategory {
  id: number;
  name: string;
  color: string;
  icon: string;
  position: number;
  is_preset: boolean;
  section_id: number;
}

export interface DevSection {
  id: number;
  name: string;
  position: number;
}

interface DevStore {
  items: DevItem[];
  trashedItems: DevItem[];
  trashedCategories: DevCategory[];
  trashedSections: DevSection[];
  categories: DevCategory[];
  sections: DevSection[];
  loading: boolean;
  load: () => Promise<void>;
  loadTrashed: () => Promise<void>;
  addItem: (text: string, categoryId: number, priority?: DevPriority) => Promise<void>;
  toggleItem: (id: number) => Promise<void>;
  deleteItem: (id: number) => Promise<void>;
  updateItemText: (id: number, text: string) => Promise<void>;
  updateItemPriority: (id: number, priority: DevPriority) => Promise<void>;
  updateItemDescription: (id: number, description: string) => Promise<void>;
  resetCategory: (categoryId: number) => Promise<void>;
  reorderItems: (categoryId: number, orderedIds: number[]) => Promise<void>;
  addCategory: (name: string, color: string, icon: string, sectionId?: number) => Promise<void>;
  removeCategory: (id: number) => Promise<void>;
  updateCategoryName: (id: number, name: string) => Promise<void>;
  updateCategoryColor: (id: number, color: string) => Promise<void>;
  updateCategoryIcon: (id: number, icon: string) => Promise<void>;
  addSection: (name: string) => Promise<void>;
  removeSection: (id: number) => Promise<void>;
  updateSectionName: (id: number, name: string) => Promise<void>;
  restoreItem: (id: number) => Promise<void>;
  permanentDeleteItem: (id: number) => Promise<void>;
  clearDevTrash: () => Promise<void>;
  resetDevContent: () => Promise<void>;
}

export const useDevStore = create<DevStore>((set, get) => ({
  items: [],
  trashedItems: [],
  trashedCategories: [],
  trashedSections: [],
  categories: [],
  sections: [],
  loading: true,

  load: async () => {
    try {
      const db = await getDb();
      const sections = await db.select<DevSection[]>(
        "SELECT id, name, position FROM dev_sections WHERE deleted_at IS NULL ORDER BY position ASC, id ASC"
      );
      const cats = await db.select<DevCategory[]>(
        "SELECT id, name, color, icon, position, is_preset, section_id FROM dev_categories WHERE deleted_at IS NULL ORDER BY position ASC, id ASC"
      );
      const rows = await db.select<DevItem[]>(
        "SELECT id, text, done, category_id, priority, position, description, created_at FROM dev_items WHERE deleted_at IS NULL ORDER BY position ASC, id ASC"
      );
      set({
        sections,
        categories: cats.map(c => ({ ...c, is_preset: Boolean(c.is_preset) })),
        items: rows.map(r => ({ ...r, done: Boolean(r.done), description: r.description ?? "" })),
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

  updateItemDescription: async (id, description) => {
    try {
      const db = await getDb();
      await db.execute("UPDATE dev_items SET description = ? WHERE id = ?", [description, id]);
      set(s => ({ items: s.items.map(i => i.id === id ? { ...i, description } : i) }));
    } catch (e) {
      showErrorToast("Couldn't save description");
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

  addCategory: async (name, color, icon, sectionId = 1) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    try {
      const db = await getDb();
      const pos = get().categories.length;
      await db.execute(
        "INSERT INTO dev_categories (name, color, icon, position, is_preset, section_id) VALUES (?, ?, ?, ?, 0, ?)",
        [trimmed, color, icon, pos, sectionId]
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
      await db.execute("UPDATE dev_categories SET deleted_at = datetime('now') WHERE id = ?", [id]);
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

  updateCategoryName: async (id, name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    try {
      const db = await getDb();
      await db.execute("UPDATE dev_categories SET name = ? WHERE id = ?", [trimmed, id]);
      set(s => ({ categories: s.categories.map(c => c.id === id ? { ...c, name: trimmed } : c) }));
    } catch (e) {
      showErrorToast("Couldn't update category name");
    }
  },

  updateCategoryIcon: async (id, icon) => {
    try {
      const db = await getDb();
      await db.execute("UPDATE dev_categories SET icon = ? WHERE id = ?", [icon, id]);
      set(s => ({ categories: s.categories.map(c => c.id === id ? { ...c, icon } : c) }));
    } catch (e) {
      showErrorToast("Couldn't update category icon");
    }
  },

  updateSectionName: async (id, name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    try {
      const db = await getDb();
      await db.execute("UPDATE dev_sections SET name = ? WHERE id = ?", [trimmed, id]);
      set(s => ({ sections: s.sections.map(sec => sec.id === id ? { ...sec, name: trimmed } : sec) }));
    } catch (e) {
      showErrorToast("Couldn't update page name");
    }
  },

  addSection: async (name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    try {
      const db = await getDb();
      const pos = get().sections.length;
      await db.execute(
        "INSERT INTO dev_sections (name, position) VALUES (?, ?)",
        [trimmed, pos]
      );
      await get().load();
    } catch (e) {
      showErrorToast("Couldn't add page");
    }
  },

  removeSection: async (id) => {
    if (id === 1) return;
    try {
      const db = await getDb();
      await db.execute(
        "UPDATE dev_items SET deleted_at = datetime('now') WHERE category_id IN (SELECT id FROM dev_categories WHERE section_id = ?) AND deleted_at IS NULL",
        [id]
      );
      await db.execute("UPDATE dev_categories SET deleted_at = datetime('now') WHERE section_id = ? AND deleted_at IS NULL", [id]);
      await db.execute("UPDATE dev_sections SET deleted_at = datetime('now') WHERE id = ?", [id]);
      await get().load();
    } catch (e) {
      showErrorToast("Couldn't remove page");
    }
  },

  loadTrashed: async () => {
    try {
      const db = await getDb();
      const rows = await db.select<DevItem[]>(
        "SELECT id, text, done, category_id, priority, position, description, created_at FROM dev_items WHERE deleted_at IS NOT NULL ORDER BY category_id ASC, id DESC"
      );
      const cats = await db.select<DevCategory[]>(
        "SELECT id, name, color, icon, position, is_preset, section_id FROM dev_categories WHERE deleted_at IS NOT NULL ORDER BY position ASC, id ASC"
      );
      const sects = await db.select<DevSection[]>(
        "SELECT id, name, position FROM dev_sections WHERE deleted_at IS NOT NULL ORDER BY position ASC, id ASC"
      );
      set({
        trashedItems: rows.map(r => ({ ...r, done: Boolean(r.done), description: r.description ?? "" })),
        trashedCategories: cats.map(c => ({ ...c, is_preset: Boolean(c.is_preset) })),
        trashedSections: sects,
      });
    } catch (e) {
      showErrorToast("Failed to load dev trash");
    }
  },

  restoreItem: async (id) => {
    try {
      const db = await getDb();
      const item = get().trashedItems.find(i => i.id === id);
      if (!item) return;

      // If the item's category is also trashed, restore it first
      const trashedCat = get().trashedCategories.find(c => c.id === item.category_id);
      if (trashedCat) {
        // If that category's section is also trashed, restore it too
        const trashedSection = get().trashedSections.find(s => s.id === trashedCat.section_id);
        if (trashedSection) {
          await db.execute("UPDATE dev_sections SET deleted_at = NULL WHERE id = ?", [trashedSection.id]);
        }
        await db.execute("UPDATE dev_categories SET deleted_at = NULL WHERE id = ?", [trashedCat.id]);
      }

      await db.execute("UPDATE dev_items SET deleted_at = NULL WHERE id = ?", [id]);
      await get().load();
      await get().loadTrashed();
    } catch (e) {
      showErrorToast("Couldn't restore item");
    }
  },

  permanentDeleteItem: async (id) => {
    try {
      const db = await getDb();
      await db.execute("DELETE FROM dev_items WHERE id = ?", [id]);
      set(s => ({ trashedItems: s.trashedItems.filter(i => i.id !== id) }));
    } catch (e) {
      showErrorToast("Couldn't delete item");
    }
  },

  clearDevTrash: async () => {
    try {
      const db = await getDb();
      await db.execute("DELETE FROM dev_items WHERE deleted_at IS NOT NULL");
      await db.execute("DELETE FROM dev_categories WHERE deleted_at IS NOT NULL");
      await db.execute("DELETE FROM dev_sections WHERE deleted_at IS NOT NULL");
      set({ trashedItems: [], trashedCategories: [], trashedSections: [] });
    } catch (e) {
      showErrorToast("Couldn't clear trash");
    }
  },

  resetDevContent: async () => {
    try {
      await resetDevDb();
      await get().load();
    } catch (e) {
      showErrorToast("Couldn't reset dev checklist");
    }
  },
}));
