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

  return (
    <div
      className="absolute inset-0 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.4)", zIndex: 20, borderRadius: 12 }}
      onKeyDown={(e) => { e.stopPropagation(); handleKey(e); }}
    >
      <div
        className="w-72 rounded-xl border border-white/10 shadow-2xl p-5 flex flex-col gap-4"
        style={{ background: "rgba(28,28,32,0.97)" }}
      >
        {/* Header */}
        <div>
          <p className="text-white/80 text-sm font-medium truncate">{title}</p>
          <p className="text-white/35 text-xs mt-0.5 truncate">{subtitle}</p>
        </div>

        {/* Inputs */}
        <div className="flex flex-col gap-2">
          {showDate && (
            <div className="flex flex-col gap-1">
              <label className="text-[11px] text-white/35 uppercase tracking-wide">Date</label>
              <input
                type="date"
                value={date}
                min={defaultDate}
                onChange={(e) => setDate(e.target.value)}
                onKeyDown={(e) => { if (e.key !== "Enter" && e.key !== "Escape") e.stopPropagation(); }}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/80 outline-none focus:border-white/25 transition-colors"
              />
            </div>
          )}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] text-white/35 uppercase tracking-wide">Time</label>
            <input
              ref={timeRef}
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              onKeyDown={(e) => { if (e.key !== "Enter" && e.key !== "Escape") e.stopPropagation(); }}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/80 outline-none focus:border-white/25 transition-colors"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onMouseDown={(e) => { e.preventDefault(); onCancel(); }}
            className="flex-1 py-2 rounded-lg text-sm text-white/40 hover:text-white/60 hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>
          <button
            onMouseDown={(e) => { e.preventDefault(); handleConfirm(); }}
            className="flex-1 py-2 rounded-lg text-sm font-medium text-white bg-white/10 hover:bg-white/15 transition-colors"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
