import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Priority } from "./store";

export type Density = "compact" | "normal" | "comfortable";
export type DefaultSort = "manual" | "due" | "priority" | "az";

export interface Settings {
  density: Density;
  confirmDelete: boolean;
  defaultPriority: Priority;
  defaultSort: DefaultSort;
  showDoneAtBottom: boolean;
  showDividers: boolean;
  reminderInterval: 30 | 60 | 300;
}

interface SettingsState extends Settings {
  set: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  reset: () => void;
}

const DEFAULTS: Settings = {
  density: "normal",
  confirmDelete: true,
  defaultPriority: "none",
  defaultSort: "manual",
  showDoneAtBottom: false,
  showDividers: false,
  reminderInterval: 30,
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULTS,
      set: (key, value) => set((s) => ({ ...s, [key]: value })),
      reset: () => set({ ...DEFAULTS }),
    }),
    { name: "slate-settings" }
  )
);
