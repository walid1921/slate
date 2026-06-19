import { useEffect, useRef, useState } from "react";
import { useReminderStore } from "../reminderStore";

interface Props {
  initialText?: string;
  onClose: () => void;
  onSaved: () => void;
}

export default function AddReminderModal({ initialText = "", onClose, onSaved }: Props) {
  const { add } = useReminderStore();
  const [text, setText] = useState(initialText);
  const [saving, setSaving] = useState(false);
  const today = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const [date, setDate] = useState(`${today.getFullYear()}-${pad(today.getMonth()+1)}-${pad(today.getDate())}`);
  const [time, setTime] = useState(`${pad(today.getHours())}:${pad(today.getMinutes())}`);
  const textRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => textRef.current?.focus(), 10);
  }, []);

  const handleSave = async () => {
    if (!text.trim() || saving) return;
    setSaving(true);
    try {
      await add(text.trim(), `${date}T${time}:00`);
      onSaved();
    } catch {
      setSaving(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !saving) handleSave();
    if (e.key === "Escape") onClose();
    e.stopPropagation();
  };

  const inputClass = "w-full rounded-lg px-3 py-2 text-sm text-t1 outline-none";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.45)" }}>
      <div className="dropdown w-72 rounded-xl shadow-2xl overflow-hidden flex flex-col" style={{ border: "1px solid var(--c-border)" }}>
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: "1px solid var(--c-border-subtle)" }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(99,102,241,0.15)" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(99,102,241,0.9)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>
          <div>
            <p className="text-[11px] text-t4 select-none">New reminder</p>
            <input
              ref={textRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Reminder text…"
              className="text-[14px] font-semibold text-t1 leading-snug bg-transparent outline-none placeholder:text-t5 w-full"
            />
          </div>
        </div>

        {/* Fields */}
        <div className="flex flex-col gap-3 px-5 py-4" style={{ borderBottom: "1px solid var(--c-border-subtle)" }}>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] text-t4 uppercase tracking-wider">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              onKeyDown={handleKey}
              className={inputClass}
              style={{ background: "var(--c-surface-2)", border: "1px solid var(--c-border)" }}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] text-t4 uppercase tracking-wider">Time</label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              onKeyDown={handleKey}
              className={inputClass}
              style={{ background: "var(--c-surface-2)", border: "1px solid var(--c-border)" }}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex">
          <button
            onClick={onClose}
            className="flex-1 py-3 text-sm text-t3 hover:text-t2 hover:bg-white/5 transition-colors"
            style={{ borderRight: "1px solid var(--c-border-subtle)" }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!text.trim() || saving}
            className="flex-1 py-3 text-sm font-medium hover:bg-white/5 disabled:opacity-40 disabled:pointer-events-none transition-colors"
            style={{ color: "rgba(99,102,241,0.9)" }}
          >
            {saving ? "Adding…" : "Add Reminder"}
          </button>
        </div>
      </div>
    </div>
  );
}
