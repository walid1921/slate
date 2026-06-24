import { useEffect, useRef, useState } from "react";
import { useReminderStore } from "../reminderStore";

interface Props {
  initialText?: string;
  taskId?: number | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function AddReminderModal({ initialText = "", taskId = null, onClose, onSaved }: Props) {
  const { add } = useReminderStore();
  const [text, setText] = useState(initialText);
  const [saving, setSaving] = useState(false);
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const [date, setDate] = useState(`${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}`);
  const [time, setTime] = useState(`${pad(now.getHours())}:${pad(now.getMinutes())}`);
  const textRef = useRef<HTMLInputElement>(null);
  const timeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => {
      if (initialText) timeRef.current?.focus();
      else textRef.current?.focus();
    }, 10);
  }, []);

  const handleSave = async () => {
    if (!text.trim() || saving) return;
    setSaving(true);
    try {
      await add(text.trim(), `${date}T${time}:00`, taskId);
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.45)" }}>
      <div className="dropdown rounded-xl shadow-2xl overflow-hidden flex flex-col" style={{ width: 320, border: "1px solid var(--c-border)" }}>

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: "1px solid var(--c-border-subtle)" }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(99,102,241,0.15)" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(99,102,241,0.9)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>
          <span className="text-[14px] font-semibold text-t1">New Reminder</span>
        </div>

        {/* Body */}
        <div className="flex flex-col gap-3 px-4 py-4">
          <input
            ref={textRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Reminder text…"
            className="w-full px-3 py-2 rounded-lg text-[13px] text-t1 outline-none placeholder:text-t5"
            style={{ background: "var(--c-surface-2)", border: "1px solid var(--c-border)" }}
          />
          <div className="flex gap-2">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              onKeyDown={handleKey}
              className="flex-1 px-3 py-2 rounded-lg text-[13px] text-t1 outline-none"
              style={{ background: "var(--c-surface-2)", border: "1px solid var(--c-border)" }}
            />
            <input
              ref={timeRef}
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              onKeyDown={handleKey}
              className="px-3 py-2 rounded-lg text-[13px] text-t1 outline-none"
              style={{ background: "var(--c-surface-2)", border: "1px solid var(--c-border)", width: 110 }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 justify-end px-4 pb-4">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg text-[12px] text-t3 hover:text-t2 transition-colors"
            style={{ background: "var(--c-surface-2)" }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!text.trim() || saving}
            className="px-3 py-1.5 rounded-lg text-[12px] text-indigo-400 hover:text-indigo-300 disabled:opacity-40 disabled:pointer-events-none transition-colors"
            style={{ background: "rgba(99,102,241,0.15)" }}
          >
            {saving ? "Adding…" : "Add Reminder"}
          </button>
        </div>
      </div>
    </div>
  );
}
