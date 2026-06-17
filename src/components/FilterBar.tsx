import { useState, useRef, useEffect } from "react";
import { SlidersHorizontal, ChevronDown, LayoutList, LayoutGrid } from "lucide-react";
import { ViewMode } from "../settingsStore";

export type TodoFilter = "all" | "active" | "done";
export type TodoSort = "manual" | "due" | "priority" | "az";
export type ReminderFilter = "all" | "upcoming" | "sent";
export type ReminderSort = "time" | "az";

interface FilterBarProps {
  page: "todos";
  filter: TodoFilter;
  sort: TodoSort;
  viewMode: ViewMode;
  onFilter: (f: TodoFilter) => void;
  onSort: (s: TodoSort) => void;
  onViewMode: (v: ViewMode) => void;
}

interface ReminderFilterBarProps {
  page: "reminders";
  filter: ReminderFilter;
  sort: ReminderSort;
  viewMode: ViewMode;
  onFilter: (f: ReminderFilter) => void;
  onSort: (s: ReminderSort) => void;
  onViewMode: (v: ViewMode) => void;
}

type Props = FilterBarProps | ReminderFilterBarProps;

const SORT_LABELS: Record<string, string> = {
  manual: "Manual",
  due: "Due date",
  priority: "Priority",
  az: "A–Z",
  time: "Time",
  updated: "Last edited",
  created: "Created",
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

function SortMenu({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
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
        className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] transition-colors ${
          open ? "text-t2 hover:bg-s2" : "text-t4 hover:text-t3 hover:bg-s1"
        }`}
        style={open ? { background: "var(--c-surface-2)" } : {}}
      >
        <SlidersHorizontal size={11} />
        <span>{SORT_LABELS[value]}</span>
        <ChevronDown size={8} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          className="dropdown absolute right-0 top-full mt-1 z-50 py-0.5 min-w-[110px]"
          style={{ borderRadius: 8 }}
        >
          {options.map((opt) => (
            <button
              key={opt}
              onMouseDown={(e) => { e.preventDefault(); onChange(opt); setOpen(false); }}
              className={`w-full text-left px-3 py-1.5 text-[12px] transition-colors ${
                value === opt ? "text-t1" : "text-t3 hover:text-t2 hover:bg-s1"
              }`}
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

function ViewToggle({ value, onChange }: { value: ViewMode; onChange: (v: ViewMode) => void }) {
  return (
    <div className="flex items-center gap-0.5">
      <button
        onClick={() => onChange("list")}
        className={`w-5 h-5 flex items-center justify-center rounded transition-colors ${value === "list" ? "text-t2" : "text-t4 hover:text-t2"}`}
        style={value === "list" ? { background: "var(--c-surface-3)" } : {}}
        title="List view"
      >
        <LayoutList size={12} />
      </button>
      <button
        onClick={() => onChange("cards")}
        className={`w-5 h-5 flex items-center justify-center rounded transition-colors ${value === "cards" ? "text-t2" : "text-t4 hover:text-t2"}`}
        style={value === "cards" ? { background: "var(--c-surface-3)" } : {}}
        title="Card view"
      >
        <LayoutGrid size={12} />
      </button>
    </div>
  );
}

export default function FilterBar(props: Props) {
  if (props.page === "todos") {
    const { filter, sort, viewMode, onFilter, onSort, onViewMode } = props;
    return (
      <div className="flex items-center gap-1.5 px-4 py-1.5 border-b border-s shrink-0">
        <div className="flex items-center gap-0.5 flex-1">
          {TODO_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => onFilter(f.value)}
              className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
                filter === f.value
                  ? "text-t2"
                  : "text-t4 hover:text-t3 hover:bg-s1"
              }`}
              style={filter === f.value ? { background: "var(--c-surface-3)" } : {}}
            >
              {f.label}
            </button>
          ))}
        </div>
        <ViewToggle value={viewMode} onChange={onViewMode} />
        <SortMenu
          options={["manual", "due", "priority", "az"]}
          value={sort}
          onChange={(v) => onSort(v as TodoSort)}
        />
      </div>
    );
  }

  if (props.page === "reminders") {
    const { filter, sort, viewMode, onFilter, onSort, onViewMode } = props;
    return (
      <div className="flex items-center gap-1.5 px-4 py-1.5 border-b border-s shrink-0">
        <div className="flex items-center gap-0.5 flex-1">
          {REMINDER_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => onFilter(f.value)}
              className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
                filter === f.value
                  ? "text-t2"
                  : "text-t4 hover:text-t3 hover:bg-s1"
              }`}
              style={filter === f.value ? { background: "var(--c-surface-3)" } : {}}
            >
              {f.label}
            </button>
          ))}
        </div>
        <ViewToggle value={viewMode} onChange={onViewMode} />
        <SortMenu
          options={["time", "az"]}
          value={sort}
          onChange={(v) => onSort(v as ReminderSort)}
        />
      </div>
    );
  }

}
