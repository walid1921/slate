import { useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useReminderStore } from "../reminderStore";

export default function ReminderAlert() {
  const { pendingAlert, markSent, dismissAlert, update } = useReminderStore();
  const openRef = useRef(false);

  useEffect(() => {
    if (!pendingAlert || openRef.current) return;
    openRef.current = true;

    const r = pendingAlert;

    invoke("show_reminder_overlay", { text: r.text }).catch(console.error);

    const cleanup = () => {
      openRef.current = false;
      unlistenDone.then((fn) => fn());
      unlistenReschedule.then((fn) => fn());
    };

    const unlistenDone = listen("reminder-done", async () => {
      await markSent(r.id);
      dismissAlert();
      await invoke("close_reminder_overlay").catch(() => {});
      cleanup();
    });

    const unlistenReschedule = listen<{ date: string; time: string }>("reminder-reschedule", async (e) => {
      const { date, time } = e.payload;
      await update(r.id, r.text, `${date}T${time}:00`);
      dismissAlert();
      await invoke("close_reminder_overlay").catch(() => {});
      cleanup();
    });
  }, [pendingAlert]);

  return null;
}
