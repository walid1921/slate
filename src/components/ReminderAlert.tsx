import { useEffect, useRef } from "react";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { listen } from "@tauri-apps/api/event";
import { useReminderStore } from "../reminderStore";

const closeOverlay = async () => {
  try {
    const overlay = await WebviewWindow.getByLabel("reminder-overlay");
    if (overlay) await overlay.close();
  } catch {}
};

export default function ReminderAlert() {
  const { pendingAlert, markSent, dismissAlert, update } = useReminderStore();
  const openRef = useRef(false);

  useEffect(() => {
    if (!pendingAlert || openRef.current) return;
    openRef.current = true;

    const r = pendingAlert;

    const win = new WebviewWindow("reminder-overlay", {
      url: `index.html?reminderOverlay=1&text=${encodeURIComponent(r.text)}`,
      fullscreen: true,
      transparent: true,
      decorations: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      focus: true,
    });

    const cleanup = () => {
      openRef.current = false;
      unlistenDone.then((fn) => fn());
      unlistenReschedule.then((fn) => fn());
    };

    const unlistenDone = listen("reminder-done", async () => {
      await markSent(r.id);
      dismissAlert();
      await closeOverlay();
      cleanup();
    });

    const unlistenReschedule = listen<{ date: string; time: string }>("reminder-reschedule", async (e) => {
      const { date, time } = e.payload;
      await update(r.id, r.text, `${date}T${time}:00`);
      dismissAlert();
      await closeOverlay();
      cleanup();
    });

    win.onCloseRequested(() => cleanup());
  }, [pendingAlert]);

  return null;
}
