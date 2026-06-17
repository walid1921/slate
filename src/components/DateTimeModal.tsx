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
  const defaultTime = `${pad((today.getHours() + 1) % 24)}:00`;

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
      <div
        className="dropdown w-72 rounded-xl shadow-2xl p-5 flex flex-col gap-4"
      >
        <div>
          <p className="text-t1 text-sm font-medium truncate">{title}</p>
          <p className="text-t4 text-xs mt-0.5 truncate">{subtitle}</p>
        </div>

        <div className="flex flex-col gap-2">
          {showDate && (
            <div className="flex flex-col gap-1">
              <label className="text-[11px] text-t4 uppercase tracking-wide">Date</label>
              <input
                type="date"
                value={date}
                min={defaultDate}
                onChange={(e) => setDate(e.target.value)}
                onKeyDown={(e) => { if (e.key !== "Enter" && e.key !== "Escape") e.stopPropagation(); }}
                className={inputClass}
                style={{ background: "var(--c-surface-1)", border: "1px solid var(--c-border)" }}
              />
            </div>
          )}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] text-t4 uppercase tracking-wide">Time</label>
            <input
              ref={timeRef}
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              onKeyDown={(e) => { if (e.key !== "Enter" && e.key !== "Escape") e.stopPropagation(); }}
              className={inputClass}
              style={{ background: "var(--c-surface-1)", border: "1px solid var(--c-border)" }}
            />
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onMouseDown={(e) => { e.preventDefault(); onCancel(); }}
            className="flex-1 py-2 rounded-lg text-sm text-t3 hover:text-t2 hover:bg-s1 transition-colors"
          >
            Cancel
          </button>
          <button
            onMouseDown={(e) => { e.preventDefault(); handleConfirm(); }}
            className="flex-1 py-2 rounded-lg text-sm font-medium text-t1 transition-colors"
            style={{ background: "var(--c-surface-3)" }}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
