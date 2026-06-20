import { useEffect, useRef, useState } from "react";
import { loadActivityForYear, loadActivityYears } from "../activity";

const DAYS = 7;
const ACCENT = "168,85,247";

function getColor(count: number): string {
  if (count === 0) return "var(--c-surface-2)";
  if (count <= 2)  return `rgba(${ACCENT},0.25)`;
  if (count <= 5)  return `rgba(${ACCENT},0.5)`;
  if (count <= 10) return `rgba(${ACCENT},0.75)`;
  return `rgba(${ACCENT},0.95)`;
}

function buildGrid(year: number, data: Record<string, number>) {
  const pad = (n: number) => String(n).padStart(2, "0");
  const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const jan1 = new Date(year, 0, 1);
  const start = new Date(jan1);
  start.setDate(jan1.getDate() - jan1.getDay());
  const dec31 = new Date(year, 11, 31);
  const end = new Date(dec31);
  end.setDate(dec31.getDate() + (6 - dec31.getDay()));
  const weeks = Math.ceil((end.getTime() - start.getTime()) / (7 * 86400000)) + 1;
  return Array.from({ length: weeks }, (_, w) =>
    Array.from({ length: DAYS }, (_, d) => {
      const dt = new Date(start);
      dt.setDate(start.getDate() + w * 7 + d);
      const key = fmt(dt);
      return { date: key, count: data[key] ?? 0 };
    })
  );
}

function getMonthLabels(grid: { date: string }[][], step: number, year: number) {
  const labels: { label: string; x: number }[] = [];
  let last = "";
  grid.forEach((col, i) => {
    const d = new Date(col[0].date + "T00:00:00");
    if (d.getFullYear() !== year) return;
    const m = d.toLocaleString("en-US", { month: "short" });
    if (m !== last) { labels.push({ label: m, x: i * step }); last = m; }
  });
  return labels;
}

function formatDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

export default function ActivityHeatmap() {
  const currentYear = new Date().getFullYear();
  const [years, setYears] = useState<number[]>([currentYear]);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [data, setData] = useState<Record<string, number>>({});
  const [tooltip, setTooltip] = useState<{ x: number; y: number; date: string; count: number } | null>(null);
  const [dropOpen, setDropOpen] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => { loadActivityYears().then(setYears); }, []);
  useEffect(() => { loadActivityForYear(selectedYear).then(setData); }, [selectedYear]);

  useEffect(() => {
    if (!dropOpen) return;
    const close = (e: MouseEvent) => { if (dropRef.current && !dropRef.current.contains(e.target as Node)) setDropOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [dropOpen]);

  const grid = buildGrid(selectedYear, data);
  const CELL = 9, GAP = 2, STEP = CELL + GAP;
  const monthLabels = getMonthLabels(grid, STEP, selectedYear);
  const pad = (n: number) => String(n).padStart(2, "0");
  const d = new Date();
  const todayKey = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const todayCount = data[todayKey] ?? 0;

  return (
    <div className="rounded-xl p-4 flex flex-col gap-3 select-none h-full justify-between" style={{ background: `rgba(${ACCENT},0.06)`, border: `1px solid rgba(${ACCENT},0.2)`, minWidth: "max-content" }}>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={`rgba(${ACCENT},0.9)`} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
          </svg>
          <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: `rgba(${ACCENT},0.9)` }}>Activity</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-t5">today · {todayCount} action{todayCount !== 1 ? "s" : ""}</span>
          {/* Year picker */}
          {years.length > 1 && (
            <div ref={dropRef} className="relative">
              <button
                onClick={() => setDropOpen(o => !o)}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] text-t3 hover:text-t2 transition-colors"
                style={{ background: `rgba(${ACCENT},0.12)`, border: `1px solid rgba(${ACCENT},0.25)` }}
              >
                <span>{selectedYear}</span>
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>
              </button>
              {dropOpen && (
                <div className="absolute right-0 top-full mt-1 dropdown rounded-lg py-1 z-50 overflow-hidden" style={{ minWidth: 72, border: "1px solid var(--c-border)", boxShadow: "0 8px 20px rgba(0,0,0,0.3)" }}>
                  {years.map(y => (
                    <button
                      key={y}
                      onClick={() => { setSelectedYear(y); setDropOpen(false); }}
                      className="w-full text-left px-3 py-1.5 text-[11px] hover:bg-s2 transition-colors"
                      style={{ color: y === selectedYear ? `rgba(${ACCENT},0.9)` : "var(--c-text-3)" }}
                    >
                      {y}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Grid */}
      <div className="relative">
        <div className="relative h-4" style={{ width: grid.length * STEP - GAP }}>
          {monthLabels.map(({ label, x }) => (
            <span key={label + x} className="absolute text-[9px] text-t5" style={{ left: x }}>{label}</span>
          ))}
        </div>
        <div className="flex gap-[2px]">
          {grid.map((col, wi) => (
            <div key={wi} className="flex flex-col gap-[2px]">
              {col.map(({ date, count }) => (
                <div
                  key={date}
                  onMouseEnter={(e) => {
                    const r = (e.target as HTMLElement).getBoundingClientRect();
                    setTooltip({ x: r.left + r.width / 2, y: r.top - 6, date, count });
                  }}
                  onMouseLeave={() => setTooltip(null)}
                  className="rounded-[2px] transition-opacity hover:opacity-80 cursor-default"
                  style={{ width: CELL, height: CELL, background: getColor(count), border: "1px solid rgba(255,255,255,0.04)" }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-1.5 justify-end">
        <span className="text-[9px] text-t5">Less</span>
        {[0, 2, 5, 10, 15].map(v => (
          <div key={v} className="rounded-[2px]" style={{ width: CELL, height: CELL, background: getColor(v), border: "1px solid rgba(255,255,255,0.04)" }} />
        ))}
        <span className="text-[9px] text-t5">More</span>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 px-2 py-1 rounded text-[10px] text-t2 pointer-events-none whitespace-nowrap"
          style={{ background: "rgba(15,15,18,0.97)", border: "1px solid rgba(255,255,255,0.12)", boxShadow: "0 4px 16px rgba(0,0,0,0.6)", left: tooltip.x, top: tooltip.y, transform: "translate(-50%, -100%)" }}
        >
          <span className="font-medium">{tooltip.count} action{tooltip.count !== 1 ? "s" : ""}</span>
          <span className="text-t5"> · {formatDate(tooltip.date)}</span>
        </div>
      )}
    </div>
  );
}
