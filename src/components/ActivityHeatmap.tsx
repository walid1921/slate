import { useEffect, useRef, useState } from "react";
import { loadActivity } from "../activity";

const WEEKS = 26;
const DAYS = 7;
const ACCENT = "168,85,247"; // violet

function getColor(count: number): string {
  if (count === 0) return "rgba(255,255,255,0.05)";
  if (count <= 2)  return `rgba(${ACCENT},0.25)`;
  if (count <= 5)  return `rgba(${ACCENT},0.5)`;
  if (count <= 10) return `rgba(${ACCENT},0.75)`;
  return `rgba(${ACCENT},1)`;
}

function buildGrid(weeks: number, data: Record<string, number>) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(today);
  start.setDate(today.getDate() - today.getDay() - (weeks - 1) * 7);
  const pad = (n: number) => String(n).padStart(2, "0");
  const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  return Array.from({ length: weeks }, (_, w) =>
    Array.from({ length: DAYS }, (_, d) => {
      const dt = new Date(start);
      dt.setDate(start.getDate() + w * 7 + d);
      const key = fmt(dt);
      return { date: key, count: data[key] ?? 0 };
    })
  );
}

function getMonthLabels(grid: { date: string }[][], step: number) {
  const labels: { label: string; x: number }[] = [];
  let last = "";
  grid.forEach((col, i) => {
    const d = new Date(col[0].date + "T00:00:00");
    const m = d.toLocaleString("en-US", { month: "short" });
    if (m !== last) { labels.push({ label: m, x: i * step }); last = m; }
  });
  return labels;
}

function formatDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

export default function ActivityHeatmap() {
  const [data, setData] = useState<Record<string, number>>({});
  const [tooltip, setTooltip] = useState<{ x: number; y: number; date: string; count: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [cellSize, setCellSize] = useState(9);

  useEffect(() => { loadActivity(WEEKS).then(setData); }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    const update = () => {
      const w = containerRef.current!.clientWidth;
      // w = WEEKS * cell + (WEEKS - 1) * gap  →  cell = (w + gap) / WEEKS - gap
      const gap = 2;
      const cell = Math.floor((w + gap) / WEEKS) - gap;
      setCellSize(Math.min(12, Math.max(6, cell)));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const GAP = 2;
  const STEP = cellSize + GAP;
  const grid = buildGrid(WEEKS, data);
  const monthLabels = getMonthLabels(grid, STEP);
  const totalActions = Object.values(data).reduce((a, b) => a + b, 0);
  const activeDays = Object.values(data).filter(v => v > 0).length;

  return (
    <div
      className="rounded-xl p-3 flex flex-col gap-2.5 select-none"
      style={{ background: `rgba(${ACCENT},0.06)`, border: `1px solid rgba(${ACCENT},0.2)` }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={`rgba(${ACCENT},0.9)`} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
          </svg>
          <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: `rgba(${ACCENT},0.9)` }}>Activity</span>
        </div>
        <span className="text-[10px] text-t5">{activeDays} days · {totalActions} actions</span>
      </div>

      {/* Grid */}
      <div ref={containerRef} className="flex flex-col gap-[3px]">
        {/* Month labels */}
        <div className="relative" style={{ height: 12 }}>
          {monthLabels.map(({ label, x }) => (
            <span key={label + x} className="absolute text-[9px] text-t5" style={{ left: x }}>{label}</span>
          ))}
        </div>

        {/* Cells */}
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
                  className="rounded-[2px] hover:opacity-75 cursor-default transition-opacity"
                  style={{ width: cellSize, height: cellSize, background: getColor(count) }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-1.5 justify-end">
        <span className="text-[9px] text-t5">Less</span>
        {[0, 2, 5, 10, 15].map((v) => (
          <div key={v} className="rounded-[2px]" style={{ width: cellSize, height: cellSize, background: getColor(v) }} />
        ))}
        <span className="text-[9px] text-t5">More</span>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 px-2 py-1 rounded-md text-[10px] text-t2 pointer-events-none whitespace-nowrap"
          style={{
            background: "var(--c-surface-3)",
            border: "1px solid var(--c-border)",
            boxShadow: "0 4px 12px rgba(0,0,0,0.35)",
            left: tooltip.x,
            top: tooltip.y,
            transform: "translate(-50%, -100%)",
          }}
        >
          <span className="font-medium">{tooltip.count} action{tooltip.count !== 1 ? "s" : ""}</span>
          <span className="text-t5"> · {formatDate(tooltip.date)}</span>
        </div>
      )}
    </div>
  );
}
