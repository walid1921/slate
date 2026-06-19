import { useEffect, useState } from "react";
import { loadActivity } from "../activity";

const WEEKS = 32;
const DAYS = 7;

function getColor(count: number): string {
  if (count === 0) return "var(--c-surface-2)";
  if (count <= 2) return "rgba(99,102,241,0.25)";
  if (count <= 5) return "rgba(99,102,241,0.5)";
  if (count <= 10) return "rgba(99,102,241,0.75)";
  return "rgba(99,102,241,0.95)";
}

function buildGrid(data: Record<string, number>): { date: string; count: number }[][] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  // Align to Sunday of the current week
  const startDay = new Date(today);
  startDay.setDate(today.getDate() - today.getDay() - (WEEKS - 1) * 7);

  const pad = (n: number) => String(n).padStart(2, "0");
  const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  const columns: { date: string; count: number }[][] = [];
  for (let w = 0; w < WEEKS; w++) {
    const col: { date: string; count: number }[] = [];
    for (let d = 0; d < DAYS; d++) {
      const dt = new Date(startDay);
      dt.setDate(startDay.getDate() + w * 7 + d);
      const key = fmt(dt);
      col.push({ date: key, count: data[key] ?? 0 });
    }
    columns.push(col);
  }
  return columns;
}

function getMonthLabels(grid: { date: string; count: number }[][]): { label: string; col: number }[] {
  const labels: { label: string; col: number }[] = [];
  let last = "";
  grid.forEach((col, i) => {
    const d = new Date(col[0].date + "T00:00:00");
    const month = d.toLocaleString("en-US", { month: "short" });
    if (month !== last) { labels.push({ label: month, col: i }); last = month; }
  });
  return labels;
}

function formatDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

export default function ActivityHeatmap() {
  const [data, setData] = useState<Record<string, number>>({});
  const [tooltip, setTooltip] = useState<{ x: number; y: number; date: string; count: number } | null>(null);

  useEffect(() => {
    loadActivity(WEEKS).then(setData);
  }, []);

  const grid = buildGrid(data);
  const monthLabels = getMonthLabels(grid);
  const totalActions = Object.values(data).reduce((a, b) => a + b, 0);
  const activeDays = Object.values(data).filter(v => v > 0).length;

  const CELL = 9;
  const GAP = 2;
  const STEP = CELL + GAP;

  return (
    <div className="rounded-xl p-3 flex flex-col gap-1.5 select-none" style={{ background: "rgba(168,85,247,0.06)", border: "1px solid rgba(168,85,247,0.2)" }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-t5 uppercase tracking-wider">Activity</span>
        <span className="text-[10px] text-t5">{activeDays} active days · {totalActions} actions</span>
      </div>

      {/* Grid */}
      <div className="relative">
        {/* Month labels */}
        <div className="relative h-4" style={{ width: WEEKS * STEP - GAP }}>
          {monthLabels.map(({ label, col }) => (
            <span
              key={label + col}
              className="absolute text-[9px] text-t5"
              style={{ left: col * STEP }}
            >
              {label}
            </span>
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
                    const rect = (e.target as HTMLElement).getBoundingClientRect();
                    setTooltip({ x: rect.left + rect.width / 2, y: rect.top - 6, date, count });
                  }}
                  onMouseLeave={() => setTooltip(null)}
                  className="rounded-[2px] transition-opacity hover:opacity-80 cursor-default"
                  style={{
                    width: CELL,
                    height: CELL,
                    background: getColor(count),
                    border: "1px solid rgba(255,255,255,0.04)",
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 px-2 py-1 rounded text-[10px] text-t2 pointer-events-none"
          style={{
            background: "var(--c-surface-3)",
            border: "1px solid var(--c-border)",
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
            left: tooltip.x,
            top: tooltip.y,
            transform: "translate(-50%, -100%)",
          }}
        >
          <span className="font-medium">{tooltip.count} action{tooltip.count !== 1 ? "s" : ""}</span>
          <span className="text-t5"> · {formatDate(tooltip.date)}</span>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-1.5 justify-end">
        <span className="text-[9px] text-t5">Less</span>
        {[0, 2, 5, 10, 15].map((v) => (
          <div key={v} className="rounded-[2px]" style={{ width: CELL, height: CELL, background: getColor(v), border: "1px solid rgba(255,255,255,0.04)" }} />
        ))}
        <span className="text-[9px] text-t5">More</span>
      </div>
    </div>
  );
}
