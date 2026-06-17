import { useState, useRef, useEffect } from "react";
import { SlidersHorizontal, ChevronDown, LayoutList, LayoutGrid } from "lucide-react";
import { ViewMode } from "../settingsStore";

export type TodoFilter = "all" | "active" | "done";
export type TodoSort = "manual" | "due" | "priority" | "az";
export type ReminderFilter = "all" | "upcoming" | "sent";
export type ReminderSort = "time" | "az";
export type NoteSort = "updated" | "created" | "az";

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

interface NoteFilterBarProps {
  page: "notes";
  sort: NoteSort;
  onSort: (s: NoteSort) => void;
}

type Props = FilterBarProps | ReminderFilterBarProps | NoteFilterBarProps;

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
          open ? "text-white/70 bg-white/[0.07]" : "text-white/30 hover:text-white/55 hover:bg-white/[0.05]"
        }`}
      >
        <SlidersHorizontal size={11} />
        <span>{SORT_LABELS[value]}</span>
        <ChevronDown size={8} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-1 z-50 py-0.5 min-w-[110px]"
          style={{ background: "rgba(28,28,32,0.97)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 8 }}
        >
          {options.map((opt) => (
            <button
              key={opt}
              onMouseDown={(e) => { e.preventDefault(); onChange(opt); setOpen(false); }}
              className={`w-full text-left px-3 py-1.5 text-[12px] transition-colors ${
                value === opt ? "text-white/80" : "text-white/40 hover:text-white/65 hover:bg-white/[0.04]"
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
        className={`w-5 h-5 flex items-center justify-center rounded transition-colors ${value === "list" ? "text-white/70 bg-white/10" : "text-white/25 hover:text-white/50"}`}
        title="List view"
      >
        <LayoutList size={12} />
      </button>
      <button
        onClick={() => onChange("cards")}
        className={`w-5 h-5 flex items-center justify-center rounded transition-colors ${value === "cards" ? "text-white/70 bg-white/10" : "text-white/25 hover:text-white/50"}`}
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
      <div className="flex items-center gap-1.5 px-4 py-1.5 border-b border-white/[0.05] shrink-0">
        <div className="flex items-center gap-0.5 flex-1">
          {TODO_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => onFilter(f.value)}
              className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
                filter === f.value
                  ? "bg-white/10 text-white/75"
                  : "text-white/30 hover:text-white/55 hover:bg-white/[0.05]"
              }`}
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
      <div className="flex items-center gap-1.5 px-4 py-1.5 border-b border-white/[0.05] shrink-0">
        <div className="flex items-center gap-0.5 flex-1">
          {REMINDER_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => onFilter(f.value)}
              className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
                filter === f.value
                  ? "bg-white/10 text-white/75"
                  : "text-white/30 hover:text-white/55 hover:bg-white/[0.05]"
              }`}
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

  // notes
  const { sort, onSort } = props;
  return (
    <div className="flex items-center justify-end px-4 py-1.5 border-b border-white/[0.05] shrink-0">
      <SortMenu
        options={["updated", "created", "az"]}
        value={sort}
        onChange={(v) => onSort(v as NoteSort)}
      />
    </div>
  );
}
