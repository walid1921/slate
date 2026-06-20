import { useState, useEffect, useRef } from "react";
import { useTodoStore } from "../store";

interface Props {
  title: string;
  subtitle: string;
  showDate: boolean;
  initialCategoryId?: number;
  disableCategory?: boolean;
  onConfirm: (datetime: string, categoryId: number) => void;
  onCancel: () => void;
}

export default function DateTimeModal({ title, subtitle, showDate, initialCategoryId = 1, disableCategory = false, onConfirm, onCancel }: Props) {
  const categories = useTodoStore(s => s.categories);
  const today = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const defaultDate = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
  const defaultTime = `${pad(today.getHours())}:${pad(today.getMinutes())}`;

  const [date, setDate] = useState(defaultDate);
  const [time, setTime] = useState(defaultTime);
  const [selectedCategoryId, setSelectedCategoryId] = useState(initialCategoryId);
  const [catDropOpen, setCatDropOpen] = useState(false);
  const catDropRef = useRef<HTMLDivElement>(null);
  const timeRef = useRef<HTMLInputElement>(null);

  useEffect(() => { timeRef.current?.focus(); }, []);

  useEffect(() => {
    if (!catDropOpen) return;
    const close = (e: MouseEvent) => { if (catDropRef.current && !catDropRef.current.contains(e.target as Node)) setCatDropOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [catDropOpen]);

  const handleConfirm = () => {
    const dateStr = showDate ? date : defaultDate;
    const t = time || defaultTime;
    const localIso = `${dateStr}T${t}:00`;
    if (isNaN(new Date(localIso).getTime())) return;
    onConfirm(localIso, selectedCategoryId);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleConfirm();
    if (e.key === "Escape") onCancel();
    e.stopPropagation();
  };

  return (
    <div
      className="absolute inset-0 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.35)", zIndex: 20, borderRadius: 12 }}
      onKeyDown={(e) => { e.stopPropagation(); handleKey(e); }}
    >
      <div className="dropdown rounded-xl shadow-2xl flex flex-col" style={{ width: 320, border: "1px solid var(--c-border)", overflow: "visible" }}>
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

        {/* Body */}
        <div className="flex flex-col gap-3 px-4 py-4">
          {/* Category dropdown */}
          {categories.length > 0 && (() => {
            const active = categories.find(c => c.id === selectedCategoryId) ?? categories[0];
            return (
              <div ref={catDropRef} className="relative">
                <button
                  type="button"
                  disabled={disableCategory}
                  onMouseDown={e => e.stopPropagation()}
                  onClick={() => !disableCategory && setCatDropOpen(o => !o)}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] text-left"
                  style={{ background: "var(--c-surface-2)", border: `1px solid rgba(${active?.color ?? "99,102,241"},0.4)`, opacity: disableCategory ? 0.6 : 1, cursor: disableCategory ? "default" : "pointer" }}
                >
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: `rgba(${active?.color},0.85)` }} />
                  <span style={{ color: `rgba(${active?.color},0.95)` }}>{active?.name}</span>
                  {!disableCategory && <svg className="ml-auto text-t5" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>}
                </button>
                {catDropOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1 rounded-lg py-1 overflow-y-auto" style={{ zIndex: 200, maxHeight: 200, scrollbarWidth: "none", background: "rgba(20,20,24,0.97)", border: "1px solid var(--c-border)", boxShadow: "0 8px 24px rgba(0,0,0,0.45)" }}>
                    {categories.map(cat => (
                      <button
                        key={cat.id}
                        type="button"
                        onMouseDown={e => e.preventDefault()}
                        onClick={() => { setSelectedCategoryId(cat.id); setCatDropOpen(false); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-left transition-colors hover:bg-s2"
                        style={cat.id === selectedCategoryId ? { background: `rgba(${cat.color},0.1)` } : {}}
                      >
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: `rgba(${cat.color},0.85)` }} />
                        <span style={{ color: cat.id === selectedCategoryId ? `rgba(${cat.color},0.95)` : "var(--c-text-2)" }}>{cat.name}</span>
                        {cat.id === selectedCategoryId && (
                          <svg className="ml-auto" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={`rgba(${cat.color},0.8)`} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}
          {showDate && (
            <input
              type="date"
              value={date}
              min={defaultDate}
              onChange={(e) => setDate(e.target.value)}
              onKeyDown={(e) => { if (e.key !== "Enter" && e.key !== "Escape") e.stopPropagation(); }}
              className="w-full px-3 py-2 rounded-lg text-[13px] text-t1 outline-none"
              style={{ background: "var(--c-surface-2)", border: "1px solid var(--c-border)" }}
            />
          )}
          <input
            ref={timeRef}
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            onKeyDown={(e) => { if (e.key !== "Enter" && e.key !== "Escape") e.stopPropagation(); }}
            className="w-full px-3 py-2 rounded-lg text-[13px] text-t1 outline-none"
            style={{ background: "var(--c-surface-2)", border: "1px solid var(--c-border)" }}
          />
        </div>

        {/* Footer */}
        <div className="flex gap-2 justify-end px-4 pb-4">
          <button
            onMouseDown={(e) => { e.preventDefault(); onCancel(); }}
            className="px-3 py-1.5 rounded-lg text-[12px] text-t3 hover:text-t2 transition-colors"
            style={{ background: "var(--c-surface-2)" }}
          >
            Cancel
          </button>
          <button
            onMouseDown={(e) => { e.preventDefault(); handleConfirm(); }}
            className="px-3 py-1.5 rounded-lg text-[12px] text-blue-400 hover:text-blue-300 transition-colors"
            style={{ background: "rgba(59,130,246,0.15)" }}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
