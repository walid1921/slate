import { create } from "zustand";
import type { ToastType } from "./components/Toast";

interface ToastState {
  kind: ToastType | null;
  message: string | null;
  show: (kind: ToastType, message?: string) => void;
  clear: () => void;
}

export const useToastStore = create<ToastState>((set) => ({
  kind: null,
  message: null,
  show: (kind, message) => set({ kind, message: message ?? null }),
  clear: () => set({ kind: null, message: null }),
}));

export function showErrorToast(message?: string): void {
  useToastStore.getState().show("error", message ?? "Something went wrong");
}

export function showSuccessToast(message?: string): void {
  useToastStore.getState().show("success", message);
}
