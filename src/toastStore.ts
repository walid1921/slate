import { create } from "zustand";
import type { ToastType } from "./components/Toast";

interface ToastState {
  kind: ToastType | null;
  message: string | null;
  persistent: boolean;
  show: (kind: ToastType, message?: string, opts?: { persistent?: boolean }) => void;
  clear: () => void;
}

export const useToastStore = create<ToastState>((set) => ({
  kind: null,
  message: null,
  persistent: false,
  show: (kind, message, opts) => set({ kind, message: message ?? null, persistent: opts?.persistent ?? false }),
  clear: () => set({ kind: null, message: null, persistent: false }),
}));

export function showErrorToast(message?: string): void {
  useToastStore.getState().show("error", message ?? "Something went wrong");
}

export function showSuccessToast(message?: string): void {
  useToastStore.getState().show("success", message);
}
