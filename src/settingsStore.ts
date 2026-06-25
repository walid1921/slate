import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Priority } from "./store";

export type Density = "compact" | "normal" | "comfortable";
export type DefaultSort = "manual" | "due" | "priority" | "az";
export type ViewMode = "list" | "cards";
export type Theme = "dark" | "light";
export type TextSize = "small" | "normal" | "large";
export type WindowMode = "default" | "compact";
export type AiModel = "claude-haiku-4-5" | "claude-sonnet-4-6" | "claude-opus-4-8" | "claude-fable-5";

export interface Settings {
  theme: Theme;
  density: Density;
  confirmDelete: boolean;
  defaultPriority: Priority;
  defaultSort: DefaultSort;
  showDoneAtBottom: boolean;
  tasksViewMode: ViewMode;
  remindersViewMode: ViewMode;
  reminderInterval: 30 | 60 | 300;
  textSize: TextSize;
  windowMode: WindowMode;
  autoBackupEnabled: boolean;
  lastAutoBackup: string | null;
  aiApiKey: string;
  aiModel: AiModel;
}

interface SettingsState extends Settings {
  set: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  reset: () => void;
}

const DEFAULTS: Settings = {
  theme: "dark",
  density: "normal",
  confirmDelete: true,
  defaultPriority: "none",
  defaultSort: "manual",
  showDoneAtBottom: false,
  tasksViewMode: "list",
  remindersViewMode: "list",
  reminderInterval: 30,
  textSize: "normal",
  windowMode: "default",
  autoBackupEnabled: false,
  lastAutoBackup: null,
  aiApiKey: "",
  aiModel: "claude-sonnet-4-6",
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
