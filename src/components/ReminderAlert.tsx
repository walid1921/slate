import { useEffect, useRef } from "react";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { listen } from "@tauri-apps/api/event";
import { useReminderStore } from "../reminderStore";

export default function ReminderAlert() {
  const { pendingAlert, markSent, dismissAlert, update } = useReminderStore();
  const openRef = useRef(false);

  useEffect(() => {
    if (!pendingAlert || openRef.current) return;
    openRef.current = true;

    const r = pendingAlert;

    const win = new WebviewWindow("reminder-overlay", {
      url: `index.html?reminderOverlay=1&text=${encodeURIComponent(r.text)}`,
      width: window.screen.width,
      height: window.screen.height,
      x: 0,
      y: 0,
      transparent: true,
      decorations: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      focus: true,
      resizable: false,
    });

    const unlistenDone = listen("reminder-done", async () => {
      await markSent(r.id);
      dismissAlert();
      openRef.current = false;
      unlistenDone.then((fn) => fn());
      unlistenReschedule.then((fn) => fn());
    });

    const unlistenReschedule = listen<{ date: string; time: string }>("reminder-reschedule", async (e) => {
      const { date, time } = e.payload;
      await update(r.id, r.text, `${date}T${time}:00`);
      dismissAlert();
      openRef.current = false;
      unlistenDone.then((fn) => fn());
      unlistenReschedule.then((fn) => fn());
    });

    win.onCloseRequested(() => {
      openRef.current = false;
      unlistenDone.then((fn) => fn());
      unlistenReschedule.then((fn) => fn());
    });
  }, [pendingAlert]);

  return null;
}
