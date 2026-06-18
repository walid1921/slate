import { useState, useEffect, useRef } from "react";

interface Props {
  title: string;
  subtitle: string;
  showDate: boolean;
  onConfirm: (datetime: string) => void;
  onCancel: () => void;
}

export default function DateTimeModal({ title, subtitle, showDate, onConfirm, onCancel }: Props) {
  const today = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const defaultDate = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
  const defaultTime = `${pad(today.getHours())}:${pad(today.getMinutes())}`;

  const [date, setDate] = useState(defaultDate);
  const [time, setTime] = useState(defaultTime);
  const timeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    timeRef.current?.focus();
  }, []);

  const handleConfirm = () => {
    const dateStr = showDate ? date : defaultDate;
    const t = time || defaultTime;
    const localIso = `${dateStr}T${t}:00`;
    const d = new Date(localIso);
    if (isNaN(d.getTime())) return;
    onConfirm(localIso);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleConfirm();
    if (e.key === "Escape") onCancel();
  };

  const inputClass = "w-full rounded-lg px-3 py-2 text-sm text-t1 outline-none transition-colors placeholder-themed";

  return (
    <div
      className="absolute inset-0 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.35)", zIndex: 20, borderRadius: 12 }}
      onKeyDown={(e) => { e.stopPropagation(); handleKey(e); }}
    >
      <div className="dropdown w-72 rounded-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: "1px solid var(--c-border-subtle)" }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(59,130,246,0.15)" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(59,130,246,0.9)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          </div>
          <div>
            <p className="text-[11px] text-t4 select-none">{title}</p>
            <p className="text-[14px] font-semibold text-t1 leading-snug truncate">{subtitle}</p>
          </div>
        </div>

        {/* Fields */}
        <div className="flex flex-col gap-3 px-5 py-4" style={{ borderBottom: "1px solid var(--c-border-subtle)" }}>
          {showDate && (
            <div className="flex flex-col gap-1">
              <label className="text-[11px] text-t4 uppercase tracking-wider">Date</label>
              <input
                type="date"
                value={date}
                min={defaultDate}
                onChange={(e) => setDate(e.target.value)}
                onKeyDown={(e) => { if (e.key !== "Enter" && e.key !== "Escape") e.stopPropagation(); }}
                className={inputClass}
                style={{ background: "var(--c-surface-2)", border: "1px solid var(--c-border)" }}
              />
            </div>
          )}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] text-t4 uppercase tracking-wider">Time</label>
            <input
              ref={timeRef}
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              onKeyDown={(e) => { if (e.key !== "Enter" && e.key !== "Escape") e.stopPropagation(); }}
              className={inputClass}
              style={{ background: "var(--c-surface-2)", border: "1px solid var(--c-border)" }}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex">
          <button
            onMouseDown={(e) => { e.preventDefault(); onCancel(); }}
            className="flex-1 py-3 text-sm text-t3 hover:text-t2 hover:bg-white/5 transition-colors"
            style={{ borderRight: "1px solid var(--c-border-subtle)" }}
          >
            Cancel
          </button>
          <button
            onMouseDown={(e) => { e.preventDefault(); handleConfirm(); }}
            className="flex-1 py-3 text-sm font-medium transition-colors hover:bg-white/5"
            style={{ color: "rgba(59,130,246,0.9)" }}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
