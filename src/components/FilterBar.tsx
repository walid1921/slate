import { useState, useRef, useEffect } from "react";
import { SlidersHorizontal, ChevronDown, RefreshCw } from "lucide-react";

export type TodoFilter = "all" | "active" | "done";
export type TodoSort = "manual" | "due" | "priority" | "az";
export type ReminderFilter = "all" | "upcoming" | "sent";
export type ReminderSort = "time" | "az";

interface FilterBarProps {
  page: "todos";
  filter: TodoFilter;
  sort: TodoSort;
  onFilter: (f: TodoFilter) => void;
  onSort: (s: TodoSort) => void;
}

interface ReminderFilterBarProps {
  page: "reminders";
  filter: ReminderFilter;
  sort: ReminderSort;
  onFilter: (f: ReminderFilter) => void;
  onSort: (s: ReminderSort) => void;
  onRefresh?: () => void;
}

type Props = FilterBarProps | ReminderFilterBarProps;

const SORT_LABELS: Record<string, string> = {
  manual: "Manual",
  due: "Due date",
  priority: "Priority",
  az: "A–Z",
  time: "Time",
};

const TODO_FILTERS: { value: TodoFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "done", label: "Done" },
];

const REMINDER_FILTERS: { value: ReminderFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "upcoming", label: "Upcoming" },
  { value: "sent", label: "Sent" },
];

function SortMenu({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] transition-colors ${open ? "text-t2 hover:bg-s2" : "text-t4 hover:text-t3 hover:bg-s1"}`}
        style={open ? { background: "var(--c-surface-2)" } : {}}
      >
        <SlidersHorizontal size={11} />
        <span>{SORT_LABELS[value]}</span>
        <ChevronDown size={8} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="dropdown absolute right-0 top-full mt-1 z-50 py-0.5 min-w-[110px]" style={{ borderRadius: 8 }}>
          {options.map((opt) => (
            <button
              key={opt}
              onMouseDown={(e) => { e.preventDefault(); onChange(opt); setOpen(false); }}
              className={`w-full text-left px-3 py-1.5 text-[12px] transition-colors ${value === opt ? "text-t1" : "text-t3 hover:text-t2 hover:bg-s1"}`}
            >
              {value === opt && <span className="mr-1.5 text-white/60">✓</span>}
              {SORT_LABELS[opt]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function FilterBar(props: Props) {
  if (props.page === "todos") {
    const { filter, sort, onFilter, onSort } = props;
    return (
      <div className="flex items-center gap-1.5 px-4 py-1.5 border-b border-s shrink-0">
        <div className="flex items-center gap-0.5 flex-1">
          {TODO_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => onFilter(f.value)}
              className={`px-2 py-0.5 rounded text-[11px] transition-colors ${filter === f.value ? "text-t2" : "text-t4 hover:text-t3 hover:bg-s1"}`}
              style={filter === f.value ? { background: "var(--c-surface-3)" } : {}}
            >
              {f.label}
            </button>
          ))}
        </div>
        <SortMenu options={["manual", "due", "priority", "az"]} value={sort} onChange={(v) => onSort(v as TodoSort)} />
      </div>
    );
  }

  if (props.page === "reminders") {
    const { filter, sort, onFilter, onSort, onRefresh } = props;
    const [spinning, setSpinning] = useState(false);
    const [refreshed, setRefreshed] = useState(false);

    const handleRefresh = async () => {
      if (!onRefresh || spinning) return;
      setSpinning(true);
      setRefreshed(false);
      await onRefresh();
      setSpinning(false);
      setRefreshed(true);
      setTimeout(() => setRefreshed(false), 1800);
    };

    return (
      <div className="flex items-center gap-1.5 px-4 py-1.5 border-b border-s shrink-0">
        <div className="flex items-center gap-0.5 flex-1">
          {REMINDER_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => onFilter(f.value)}
              className={`px-2 py-0.5 rounded text-[11px] transition-colors ${filter === f.value ? "text-t2" : "text-t4 hover:text-t3 hover:bg-s1"}`}
              style={filter === f.value ? { background: "var(--c-surface-3)" } : {}}
            >
              {f.label}
            </button>
          ))}
        </div>
        {onRefresh && (
          <div className="flex items-center gap-1.5">
            <span
              className="text-[10px] text-green-400 transition-opacity duration-300"
              style={{ opacity: refreshed ? 1 : 0 }}
            >
              Refreshed
            </span>
            <button
              onClick={handleRefresh}
              className="p-1 rounded text-t4 hover:text-t2 hover:bg-s1 transition-colors"
              title="Refresh"
            >
              <RefreshCw size={12} className={spinning ? "animate-spin" : ""} />
            </button>
          </div>
        )}
        <SortMenu options={["time", "az"]} value={sort} onChange={(v) => onSort(v as ReminderSort)} />
      </div>
    );
  }
}
