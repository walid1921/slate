import { useState, useEffect } from "react";
import { Bell, Check, Clock } from "lucide-react";
import { emitTo } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";

export default function ReminderOverlay() {
  const params = new URLSearchParams(window.location.search);
  const text = decodeURIComponent(params.get("text") ?? "");
  const [visible, setVisible] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);

  const now = new Date();
  now.setMinutes(now.getMinutes() + 15);
  const pad = (n: number) => String(n).padStart(2, "0");
  const [date, setDate] = useState(`${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}`);
  const [time, setTime] = useState(`${pad(now.getHours())}:${pad(now.getMinutes())}`);

  useEffect(() => {
    document.documentElement.classList.add("dark");
    const t = setTimeout(() => setVisible(true), 30);
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", onKey);
    return () => { clearTimeout(t); window.removeEventListener("keydown", onKey); };
  }, []);

  const close = async () => {
    setVisible(false);
    await new Promise((r) => setTimeout(r, 300));
    await getCurrentWindow().close();
  };

  const handleDone = async () => {
    await emitTo("main", "reminder-done", {});
  };

  const handleReschedule = async () => {
    await emitTo("main", "reminder-reschedule", { date, time });
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: `rgba(0,0,0,${visible ? 0.72 : 0})`,
        transition: "background 0.3s ease",
        WebkitAppRegion: "no-drag",
      } as React.CSSProperties}
    >
      <div
        style={{
          width: 340,
          transform: `translateY(${visible ? 0 : 20}px)`,
          opacity: visible ? 1 : 0,
          transition: "opacity 0.28s ease, transform 0.28s ease",
        }}
      >
        <div
          className="dropdown rounded-lg flex flex-col overflow-hidden"
          style={{ border: "1px solid var(--c-border)", boxShadow: "0 32px 80px rgba(0,0,0,0.6)" }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-5 py-5" style={{ borderBottom: "1px solid var(--c-border-subtle)" }}>
            <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: "rgba(99,102,241,0.2)" }}>
              <Bell size={17} className="text-indigo-400" />
            </div>
            <div>
              <p className="text-[11px] text-t4 select-none mb-0.5">Reminder</p>
              <p className="text-[15px] font-semibold text-t1 leading-snug">{text}</p>
            </div>
          </div>

          {/* Reschedule picker (inline) */}
          {rescheduling && (
            <div className="flex flex-col gap-2 px-5 py-4" style={{ borderBottom: "1px solid var(--c-border-subtle)" }}>
              <p className="text-[11px] text-t4 select-none">Reschedule to</p>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg text-[13px] text-t1 outline-none"
                  style={{ background: "var(--c-surface-2)", border: "1px solid var(--c-border)" }}
                />
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="px-3 py-2 rounded-lg text-[13px] text-t1 outline-none"
                  style={{ background: "var(--c-surface-2)", border: "1px solid var(--c-border)", width: 100 }}
                />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex">
            {!rescheduling ? (
              <button
                onClick={() => setRescheduling(true)}
                className="flex-1 flex items-center justify-center gap-2 py-3 text-[12px] text-t3 hover:text-t2 hover:bg-white/5 transition-colors"
                style={{ borderRight: "1px solid var(--c-border-subtle)" }}
              >
                <Clock size={13} />
                Reschedule
              </button>
            ) : (
              <button
                onClick={() => setRescheduling(false)}
                className="flex-1 flex items-center justify-center gap-2 py-3 text-[12px] text-t3 hover:text-t2 hover:bg-white/5 transition-colors"
                style={{ borderRight: "1px solid var(--c-border-subtle)" }}
              >
                Cancel
              </button>
            )}
            <button
              onClick={rescheduling ? handleReschedule : handleDone}
              className="flex-1 flex items-center justify-center gap-2 py-3 text-[12px] font-medium text-indigo-400 hover:text-indigo-300 hover:bg-white/5 transition-colors"
            >
              <Check size={13} />
              {rescheduling ? "Save" : "Done"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
