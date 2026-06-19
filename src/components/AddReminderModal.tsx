import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
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
      await add(text.trim(), `${date}T${time}:00`);
      onSaved();
    } catch {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.45)" }}>
      <div className="dropdown rounded-lg flex flex-col overflow-hidden" style={{ width: 320, border: "1px solid var(--c-border)", boxShadow: "0 16px 48px rgba(0,0,0,0.4)" }}>
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid var(--c-border-subtle)" }}>
          <span className="text-[13px] font-semibold text-t1">New Reminder</span>
          <button onClick={onClose} className="text-t4 hover:text-t2 transition-colors"><X size={14} /></button>
        </div>
        <div className="flex flex-col gap-3 px-4 py-4">
          <input
            ref={textRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !saving) handleSave(); if (e.key === "Escape") onClose(); e.stopPropagation(); }}
            placeholder="Reminder text…"
            className="w-full px-3 py-2 rounded-lg text-[13px] text-t1 outline-none placeholder:text-t5"
            style={{ background: "var(--c-surface-2)", border: "1px solid var(--c-border)" }}
          />
          <div className="flex gap-2">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !saving) handleSave(); if (e.key === "Escape") onClose(); e.stopPropagation(); }}
              className="flex-1 px-3 py-2 rounded-lg text-[13px] text-t1 outline-none"
              style={{ background: "var(--c-surface-2)", border: "1px solid var(--c-border)" }}
            />
            <input
              ref={timeRef}
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !saving) handleSave(); if (e.key === "Escape") onClose(); e.stopPropagation(); }}
              className="px-3 py-2 rounded-lg text-[13px] text-t1 outline-none"
              style={{ background: "var(--c-surface-2)", border: "1px solid var(--c-border)", width: 100 }}
            />
          </div>
        </div>
        <div className="flex gap-2 justify-end px-4 pb-4">
          <button onClick={onClose} className="px-3 py-1.5 rounded-lg text-[12px] text-t3 hover:text-t2 transition-colors" style={{ background: "var(--c-surface-2)" }}>Cancel</button>
          <button onClick={handleSave} disabled={!text.trim() || saving} className="px-3 py-1.5 rounded-lg text-[12px] text-indigo-400 hover:text-indigo-300 disabled:opacity-40 disabled:pointer-events-none transition-colors" style={{ background: "rgba(99,102,241,0.15)" }}>{saving ? "Adding…" : "Add Reminder"}</button>
        </div>
      </div>
    </div>
  );
}
