import { useState, useEffect } from "react";
import { Bell, Check, Clock } from "lucide-react";
import { Reminder, useReminderStore } from "../reminderStore";

function RescheduleModal({ reminder, onClose }: { reminder: Reminder; onClose: () => void }) {
  const { update, dismissAlert } = useReminderStore();
  const now = new Date();
  now.setMinutes(now.getMinutes() + 15);
  const pad = (n: number) => String(n).padStart(2, "0");
  const defaultDate = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}`;
  const defaultTime = `${pad(now.getHours())}:${pad(now.getMinutes())}`;

  const [date, setDate] = useState(defaultDate);
  const [time, setTime] = useState(defaultTime);

  const handleSave = async () => {
    await update(reminder.id, reminder.text, `${date}T${time}:00`);
    dismissAlert();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[10001] flex items-center justify-center">
      <div
        className="dropdown rounded-2xl p-6 flex flex-col gap-4"
        style={{ width: 300, border: "1px solid var(--c-border)" }}
      >
        <p className="text-[14px] font-semibold text-t1">Reschedule reminder</p>
        <div className="flex flex-col gap-2">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-3 py-2 rounded-lg text-[13px] text-t1 outline-none"
            style={{ background: "var(--c-surface-2)", border: "1px solid var(--c-border)" }}
          />
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="w-full px-3 py-2 rounded-lg text-[13px] text-t1 outline-none"
            style={{ background: "var(--c-surface-2)", border: "1px solid var(--c-border)" }}
          />
        </div>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg text-[12px] text-t3 hover:text-t2 transition-colors"
            style={{ background: "var(--c-surface-2)" }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-3 py-1.5 rounded-lg text-[12px] text-blue-400 hover:text-blue-300 transition-colors"
            style={{ background: "rgba(59,130,246,0.15)" }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ReminderAlert() {
  const { pendingAlert, markSent, dismissAlert } = useReminderStore();
  const [visible, setVisible] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);

  useEffect(() => {
    if (pendingAlert) {
      setVisible(false);
      const t = setTimeout(() => setVisible(true), 10);
      return () => clearTimeout(t);
    } else {
      setVisible(false);
    }
  }, [pendingAlert]);

  if (!pendingAlert) return null;

  const handleDone = async () => {
    setVisible(false);
    setTimeout(async () => {
      await markSent(pendingAlert.id);
      dismissAlert();
    }, 280);
  };

  return (
    <>
      {/* Blur overlay */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9998,
          backdropFilter: `blur(${visible ? 18 : 0}px) brightness(${visible ? 0.55 : 1})`,
          WebkitBackdropFilter: `blur(${visible ? 18 : 0}px) brightness(${visible ? 0.55 : 1})`,
          transition: "backdrop-filter 0.3s ease, -webkit-backdrop-filter 0.3s ease",
          pointerEvents: visible ? "all" : "none",
        }}
      />

      {/* Alert card */}
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: `translate(-50%, calc(-50% + ${visible ? 0 : 24}px))`,
          opacity: visible ? 1 : 0,
          transition: "opacity 0.28s ease, transform 0.28s ease",
          zIndex: 9999,
          width: 320,
        }}
      >
        <div
          className="dropdown rounded-2xl flex flex-col overflow-hidden"
          style={{ border: "1px solid var(--c-border)", boxShadow: "0 24px 64px rgba(0,0,0,0.5)" }}
        >
          {/* Header */}
          <div
            className="flex items-center gap-3 px-5 py-4"
            style={{ borderBottom: "1px solid var(--c-border-subtle)" }}
          >
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
              style={{ background: "rgba(99,102,241,0.18)" }}
            >
              <Bell size={16} className="text-indigo-400" />
            </div>
            <div>
              <p className="text-[11px] text-t4 select-none">Reminder</p>
              <p className="text-[14px] font-semibold text-t1 leading-snug">{pendingAlert.text}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex">
            <button
              onClick={() => setRescheduling(true)}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 text-[13px] text-t3 hover:text-t2 hover:bg-white/5 transition-colors"
              style={{ borderRight: "1px solid var(--c-border-subtle)" }}
            >
              <Clock size={13} />
              Reschedule
            </button>
            <button
              onClick={handleDone}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 text-[13px] font-medium text-indigo-400 hover:text-indigo-300 hover:bg-white/5 transition-colors"
            >
              <Check size={13} />
              Done
            </button>
          </div>
        </div>
      </div>

      {rescheduling && (
        <RescheduleModal reminder={pendingAlert} onClose={() => setRescheduling(false)} />
      )}
    </>
  );
}
