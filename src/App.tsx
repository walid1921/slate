import { useEffect, useRef, useState, useCallback } from "react";
import {
  GripVertical,
  Check,
  Pencil,
  X,
  Plus,
  RotateCcw,
  ChevronLeft,
  Home,
  CheckSquare,
  Clock,
  FileText,
  Settings as SettingsIcon,
  Settings,
  ChevronDown,
  Trash2,
  CheckCheck,
  Zap,
  CalendarDays,
  BookOpen,
} from "lucide-react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { listen } from "@tauri-apps/api/event";
import { useTodoStore, Priority, Todo, TaskCategory } from "./store";
import { useReminderStore } from "./reminderStore";
import { useNotesStore } from "./notesStore";
import { initNotifications } from "./notifications";
import DateTimeModal from "./components/DateTimeModal";
import AddReminderModal from "./components/AddReminderModal";
import RemindersPage from "./components/RemindersPage";
import NotesPage from "./components/NotesPage";
import IHKPage from "./components/IHKPage";
import SearchModal from "./components/SearchModal";
import { useIHKStore } from "./ihkStore";
import ConfirmDialog from "./components/ConfirmDialog";
import ActivityHeatmap from "./components/ActivityHeatmap";
import { logActivity, loadAllActivityDates } from "./activity";
import FilterBar, { TodoFilter, TodoSort } from "./components/FilterBar";
import SettingsPage from "./components/SettingsPage";
import ReminderAlert from "./components/ReminderAlert";
import { useSettingsStore } from "./settingsStore";
import logoMarkLight from "./assets/logo-light.png";
import logoMarkDark from "./assets/logo-dark.png";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";


const PRIORITY_DOT: Record<Priority, string> = {
  none: "bg-t5",
  low: "bg-blue-400",
  medium: "bg-yellow-400",
  high: "bg-red-400",
};

function buildDueDate(dueDate: string, dueTime: string | null): Date {
  if (dueTime) return new Date(`${dueDate}T${dueTime}`);
  // no time: treat as end of day so countdown shows days until midnight
  return new Date(`${dueDate}T23:59:59`);
}

function formatCountdown(dueDate: string, dueTime: string | null, now: Date): { label: string; overdue: boolean } {
  const target = buildDueDate(dueDate, dueTime);
  const diffMs = target.getTime() - now.getTime();
  const overdue = diffMs < 0;
  const abs = Math.abs(diffMs);

  const totalSecs = Math.floor(abs / 1000);
  const secs = totalSecs % 60;
  const mins = Math.floor(totalSecs / 60) % 60;
  const hours = Math.floor(totalSecs / 3600) % 24;
  const days = Math.floor(totalSecs / 86400);
  const months = Math.floor(days / 30);

  if (overdue) {
    return { label: "overdue", overdue: true };
  }

  let label: string;
  if (months >= 2) {
    label = `${months}mo`;
  } else if (days >= 2) {
    label = `${days}d`;
  } else if (days === 1) {
    label = "tomorrow";
  } else if (hours > 0) {
    label = `${hours}h ${mins}m`;
  } else if (mins > 0) {
    label = `${mins}m ${secs}s`;
  } else {
    label = totalSecs <= 0 ? "now" : `${secs}s`;
  }

  return { label, overdue };
}

function useNow(dueDate: string | null, dueTime: string | null): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    if (!dueDate) return;
    const target = buildDueDate(dueDate, dueTime);
    const diffMs = target.getTime() - Date.now();
    const absDiff = Math.abs(diffMs);
    // tick every second if within 1 hour, else every minute
    const interval = absDiff < 3600_000 ? 1000 : 60_000;
    const id = setInterval(() => setNow(new Date()), interval);
    return () => clearInterval(id);
  }, [dueDate, dueTime]);
  return now;
}


function TaskDetail({ todo, onClose: _onClose }: { todo: Todo; onClose: () => void }) {
  const { updateText, setPriority, setDescription } = useTodoStore();
  const [title, setTitle] = useState(todo.text);
  const [desc, setDesc] = useState(todo.description);

  useEffect(() => { setTitle(todo.text); setDesc(todo.description); }, [todo.id]);

  const saveTitle = () => { if (title.trim() && title.trim() !== todo.text) updateText(todo.id, title.trim()); };
  const saveDesc = () => { if (desc !== todo.description) setDescription(todo.id, desc); };

  const PRIORITY_LABELS: Record<Priority, string> = { none: "None", low: "Low", medium: "Medium", high: "High" };
  const PRIORITY_DOT_DETAIL: Record<Priority, string> = { none: "bg-t5", low: "bg-blue-400", medium: "bg-yellow-400", high: "bg-red-400" };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Title */}
      <div className="px-4 pt-4 pb-2 border-b border-s shrink-0">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={saveTitle}
          onKeyDown={(e) => { if (e.key === "Enter") { saveTitle(); e.currentTarget.blur(); } }}
          className="w-full text-[15px] font-medium text-t1 bg-transparent outline-none"
          placeholder="Task title"
        />
      </div>
      {/* Priority row */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-s shrink-0">
        <span className="text-[11px] text-t4 w-16 shrink-0">Priority</span>
        <div className="flex gap-2">
          {(["none", "low", "medium", "high"] as Priority[]).map((p) => (
            <button key={p} onClick={() => setPriority(todo.id, p)}
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] transition-colors ${todo.priority === p ? "text-t1" : "text-t4 hover:text-t2"}`}
              style={todo.priority === p ? { background: "var(--c-surface-3)" } : {}}
            >
              <span className={`w-2 h-2 rounded-full shrink-0 ${PRIORITY_DOT_DETAIL[p]}`} />
              {PRIORITY_LABELS[p]}
            </button>
          ))}
        </div>
      </div>
      {/* Description */}
      <div className="flex flex-col flex-1 overflow-hidden px-4 py-3">
        <span className="text-[11px] text-t4 mb-2 shrink-0">Notes</span>
        <textarea
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          onBlur={saveDesc}
          placeholder="Add notes…"
          className="flex-1 bg-transparent text-[13px] text-t2 outline-none resize-none placeholder-themed leading-relaxed"
        />
      </div>
    </div>
  );
}

function AddTaskModal({ onClose, withDeadline = false, categoryId = 1 }: { onClose: () => void; withDeadline?: boolean; categoryId?: number }) {
  const { add, categories } = useTodoStore();
  const { defaultPriority } = useSettingsStore();
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState(categoryId);
  const [catDropOpen, setCatDropOpen] = useState(false);
  const catDropRef = useRef<HTMLDivElement>(null);
  const today = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const [date, setDate] = useState(`${today.getFullYear()}-${pad(today.getMonth()+1)}-${pad(today.getDate())}`);
  const [time, setTime] = useState(`${pad(today.getHours())}:${pad(today.getMinutes())}`);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 10); }, []);

  useEffect(() => {
    if (!catDropOpen) return;
    const close = (e: MouseEvent) => { if (catDropRef.current && !catDropRef.current.contains(e.target as Node)) setCatDropOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [catDropOpen]);
  const handleSave = async () => {
    if (!text.trim() || saving) return;
    setSaving(true);
    try {
      await add(text.trim(), defaultPriority, withDeadline ? date : null, withDeadline ? time : null, selectedCategoryId);
      onClose();
    } catch {
      setSaving(false);
    }
  };
  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !saving) handleSave();
    if (e.key === "Escape") onClose();
    e.stopPropagation();
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.45)" }}>
      <div className="dropdown rounded-xl shadow-2xl flex flex-col" style={{ width: 320, border: "1px solid var(--c-border)", overflow: "visible" }}>
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: "1px solid var(--c-border-subtle)" }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(59,130,246,0.15)" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(59,130,246,0.9)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
            </svg>
          </div>
          <span className="text-[14px] font-semibold text-t1">{withDeadline ? "New Task with Deadline" : "New Task"}</span>
        </div>
        {/* Body */}
        <div className="flex flex-col gap-3 px-4 py-4">
          <input
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Task name…"
            className="w-full px-3 py-2 rounded-lg text-[13px] text-t1 outline-none placeholder:text-t5"
            style={{ background: "var(--c-surface-2)", border: "1px solid var(--c-border)" }}
          />
          {/* Category selector */}
          {(() => {
            const active = categories.find(c => c.id === selectedCategoryId) ?? categories[0];
            return (
              <div ref={catDropRef} className="relative">
                <button
                  type="button"
                  onClick={() => setCatDropOpen(o => !o)}
                  onKeyDown={e => e.stopPropagation()}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] text-left transition-colors hover:opacity-90"
                  style={{ background: "var(--c-surface-2)", border: `1px solid rgba(${active?.color ?? "99,102,241"},0.4)` }}
                >
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: `rgba(${active?.color},0.85)` }} />
                  <span style={{ color: `rgba(${active?.color},0.95)` }}>{active?.name}</span>
                  <ChevronDown size={11} className="ml-auto text-t5" />
                </button>
                {catDropOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1 rounded-lg py-1 overflow-y-auto" style={{ zIndex: 200, maxHeight: 200, scrollbarWidth: "none", background: "rgba(20,20,24,0.97)", border: "1px solid var(--c-border)", boxShadow: "0 8px 24px rgba(0,0,0,0.45)" }}>
                    {categories.map(cat => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => { setSelectedCategoryId(cat.id); setCatDropOpen(false); }}
                        onKeyDown={e => e.stopPropagation()}
                        className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-left transition-colors hover:bg-s2"
                        style={cat.id === selectedCategoryId ? { background: `rgba(${cat.color},0.1)` } : {}}
                      >
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: `rgba(${cat.color},0.85)` }} />
                        <span style={{ color: cat.id === selectedCategoryId ? `rgba(${cat.color},0.95)` : "var(--c-text-2)" }}>{cat.name}</span>
                        {cat.id === selectedCategoryId && <Check size={11} className="ml-auto" style={{ color: `rgba(${cat.color},0.8)` }} />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}
          {withDeadline && (
            <div className="flex gap-2">
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} onKeyDown={handleKey} className="flex-1 px-3 py-2 rounded-lg text-[13px] text-t1 outline-none" style={{ background: "var(--c-surface-2)", border: "1px solid var(--c-border)" }} />
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)} onKeyDown={handleKey} className="px-3 py-2 rounded-lg text-[13px] text-t1 outline-none" style={{ background: "var(--c-surface-2)", border: "1px solid var(--c-border)", width: 110 }} />
            </div>
          )}
        </div>
        {/* Footer */}
        <div className="flex gap-2 justify-end px-4 pb-4">
          <button onClick={onClose} className="px-3 py-1.5 rounded-lg text-[12px] text-t3 hover:text-t2 transition-colors" style={{ background: "var(--c-surface-2)" }}>Cancel</button>
          <button onClick={handleSave} disabled={!text.trim() || saving} className="px-3 py-1.5 rounded-lg text-[12px] text-blue-400 hover:text-blue-300 disabled:opacity-40 disabled:pointer-events-none transition-colors" style={{ background: "rgba(59,130,246,0.15)" }}>{saving ? "Adding…" : "Add Task"}</button>
        </div>
      </div>
    </div>
  );
}

function EmptyTaskDetail() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-t5 text-[12px] select-none gap-1">
      <span>Select a task to view details</span>
    </div>
  );
}

function TodoRow({
  todo,
  focused,
  onFocus,
  onDeleteRequest,
  onSelect,
}: {
  todo: Todo;
  focused: boolean;
  onFocus: () => void;
  onDeleteRequest: () => void;
  onSelect?: () => void;
}) {
  const { toggle, setPriority, updateText, setDeadline } = useTodoStore();
  const [showMeta, setShowMeta] = useState(false);
  const [editingText, setEditingText] = useState(false);
  const [editVal, setEditVal] = useState(todo.text);
  const [showDeadlinePicker, setShowDeadlinePicker] = useState(false);
  const textRef = useRef<HTMLInputElement>(null);
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menu) return;
    const close = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenu(null); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menu]);

  useEffect(() => {
    if (editingText) {
      setEditVal(todo.text);
      setTimeout(() => { textRef.current?.select(); }, 10);
    }
  }, [editingText]);

  const commitText = () => {
    const trimmed = editVal.trim();
    if (trimmed && trimmed !== todo.text) updateText(todo.id, trimmed);
    setEditingText(false);
  };

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: todo.id });

  const now = useNow(todo.due_date, todo.due_time);
  const countdown = todo.due_date ? formatCountdown(todo.due_date, todo.due_time, now) : null;



  return (
    <div
      ref={setNodeRef}
      tabIndex={-1}
      onFocus={onFocus}
      onMouseEnter={() => setShowMeta(true)}
      onMouseLeave={() => setShowMeta(false)}
      style={{
        minHeight: 52,
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 50 : "auto",
        background: focused ? "var(--c-surface-2)" : undefined,
        borderLeft: focused ? "2px solid rgba(59,130,246,0.6)" : "2px solid transparent",
      }}
      onContextMenu={(e) => { e.preventDefault(); setMenu({ x: e.clientX, y: e.clientY }); }}
      className={`group relative flex items-center gap-3 px-5 cursor-default transition-colors border-b border-s ${focused ? "" : "hover:bg-s1"}`}
    >
      {menu && (
        <div ref={menuRef} className="dropdown fixed z-50 rounded-lg shadow-xl py-1 min-w-[170px]" style={{ left: menu.x, top: menu.y }}>
          <button onClick={() => { setEditingText(true); setMenu(null); }} className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[13px] text-t1 hover:bg-s2 transition-colors">
            <Pencil size={12} className="text-t4" /><span>Edit task</span>
          </button>
          <div className="flex items-center gap-2 px-3 py-1.5">
            {(["none", "low", "medium", "high"] as Priority[]).map((p) => (
              <div key={p} className="group/dot relative">
                <button
                  onClick={() => { setPriority(todo.id, p); setMenu(null); }}
                  className="rounded-full transition-opacity hover:opacity-80"
                >
                  <span
                    className={`block w-3 h-3 rounded-full ${PRIORITY_DOT[p]}`}
                    style={todo.priority === p ? { outline: "1px solid rgba(255,255,255,0.7)", outlineOffset: "1px" } : {}}
                  />
                </button>
                <span className="pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded text-[10px] text-t2 whitespace-nowrap opacity-0 group-hover/dot:opacity-100 transition-opacity duration-150 capitalize" style={{ background: "var(--c-tooltip)", border: "1px solid var(--c-border)" }}>
                  {p === "none" ? "No priority" : p}
                </span>
              </div>
            ))}
          </div>
          <div style={{ height: 1, background: "var(--c-border-subtle)", margin: "4px 0" }} />
          <button onClick={() => { setShowDeadlinePicker(true); setMenu(null); }} className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[13px] text-t1 hover:bg-s2 transition-colors">
            <CalendarDays size={12} className="text-t4" /><span>{todo.due_date ? "Edit deadline" : "Set deadline"}</span>
          </button>
          <div style={{ height: 1, background: "var(--c-border-subtle)", margin: "4px 0" }} />
          <button onClick={() => { onDeleteRequest(); setMenu(null); }} className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[13px] text-red-400 hover:bg-s2 transition-colors">
            <X size={12} /><span>Delete</span>
          </button>
        </div>
      )}
      {showDeadlinePicker && (
        <DateTimeModal
          title="Set deadline"
          subtitle={todo.text}
          showDate={true}
          onCancel={() => setShowDeadlinePicker(false)}
          onConfirm={(iso) => {
            const [datePart, timePart] = iso.split("T");
            setDeadline(todo.id, datePart, timePart?.slice(0, 5) ?? null);
            setShowDeadlinePicker(false);
          }}

        />
      )}
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className={`shrink-0 cursor-grab active:cursor-grabbing text-t5 hover:text-t2 transition-opacity ${
          showMeta || focused ? "opacity-100" : "opacity-0"
        }`}
      >
        <GripVertical size={12} />
      </div>

      {/* Checkbox */}
      <button
        onClick={() => toggle(todo.id)}
        className="mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors"
        style={todo.done ? { background: "rgba(59,130,246,0.75)", borderColor: "transparent" } : { borderColor: "var(--c-border)" }}
      >
        {todo.done && (
          <Check size={8} stroke="white" />
        )}
      </button>

      {/* Text + meta */}
      <div className="flex-1 min-w-0 py-3" onClick={() => { if (!editingText) onSelect?.(); }}>
        {editingText ? (
          <input
            ref={textRef}
            value={editVal}
            onChange={(e) => setEditVal(e.target.value)}
            onBlur={commitText}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); commitText(); }
              if (e.key === "Escape") { setEditingText(false); }
              e.stopPropagation();
            }}
            className="w-full text-[14px] leading-snug text-t1 bg-transparent outline-none border-b" style={{ borderColor: "var(--c-border)" }}
          />
        ) : (
          <span
            onDoubleClick={() => !todo.done && setEditingText(true)}
            className={`text-[14px] leading-snug block truncate transition-colors ${
              todo.done ? "line-through text-t4" : "text-t1"
            }`}
          >
            {todo.text}
          </span>
        )}

        {/* Due date / priority row */}
        <div className="flex items-center gap-2 mt-0.5">
          {countdown && (
            <span className={`text-xs ${countdown.overdue && !todo.done ? "text-red-400" : "text-t4"}`}>
              {countdown.label}
            </span>
          )}
          {todo.priority !== "none" && (
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${todo.done ? "bg-t6" : PRIORITY_DOT[todo.priority]}`} />
          )}
        </div>
      </div>

    </div>
  );
}

function CategoryManagerPanel({ categories, onAdd, onRemove, onClose }: {
  categories: TaskCategory[];
  onAdd: (name: string) => Promise<void>;
  onRemove: (id: number) => Promise<void>;
  onClose: () => void;
}) {
  const [newName, setNewName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 50); }, []);

  const submit = async () => {
    const n = newName.trim();
    if (!n) return;
    await onAdd(n);
    setNewName("");
  };

  return (
    <div className="px-4 py-3 flex flex-col gap-3 shrink-0" style={{ background: "var(--c-surface-1)", borderBottom: "1px solid var(--c-border-subtle)" }}>
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-t3 uppercase tracking-wider">Categories</span>
        <button onClick={onClose} className="text-t5 hover:text-t3 transition-colors"><X size={11} /></button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {categories.map(cat => (
          <div key={cat.id} className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px]"
            style={{ background: `rgba(${cat.color},0.12)`, border: `1px solid rgba(${cat.color},0.3)`, color: `rgba(${cat.color},0.9)` }}>
            {cat.name}
            {cat.id !== 1 && (
              <button onClick={() => onRemove(cat.id)} className="ml-0.5 hover:opacity-70 transition-opacity"><X size={9} /></button>
            )}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); submit(); } e.stopPropagation(); }}
          placeholder="New category name…"
          className="flex-1 px-2 py-1 rounded text-[12px] text-t1 outline-none"
          style={{ background: "var(--c-surface-2)", border: "1px solid var(--c-border)" }}
        />
        <button onClick={submit} className="px-2 py-1 rounded text-[11px] text-blue-400 hover:text-blue-300 transition-colors" style={{ background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.25)" }}>
          <Plus size={11} />
        </button>
      </div>
    </div>
  );
}

function StreakWidget() {
  const [current, setCurrent] = useState(0);
  const [longest, setLongest] = useState(0);

  useEffect(() => {
    loadAllActivityDates().then(dates => {
      if (!dates.length) return;
      const set = new Set(dates);
      const pad = (n: number) => String(n).padStart(2, "0");
      const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
      const today = new Date(); today.setHours(0,0,0,0);

      // current streak: walk backwards from today (or yesterday if today has no activity)
      let cur = 0;
      const start = set.has(fmt(today)) ? new Date(today) : (() => { const y = new Date(today); y.setDate(y.getDate()-1); return y; })();
      if (set.has(fmt(start))) {
        const d = new Date(start);
        while (set.has(fmt(d))) { cur++; d.setDate(d.getDate()-1); }
      }

      // longest streak
      let max = 0, run = 0;
      const sorted = [...set].sort();
      for (let i = 0; i < sorted.length; i++) {
        if (i === 0) { run = 1; }
        else {
          const prev = new Date(sorted[i-1]+"T00:00:00");
          prev.setDate(prev.getDate()+1);
          run = prev.toISOString().slice(0,10) === sorted[i] ? run+1 : 1;
        }
        if (run > max) max = run;
      }

      setCurrent(cur);
      setLongest(max);
    });
  }, []);

  const FLAME = "251,146,60";

  return (
    <div className="rounded-xl p-3 flex flex-col gap-3 select-none" style={{ background: `rgba(${FLAME},0.06)`, border: `1px solid rgba(${FLAME},0.2)` }}>
      <div className="flex items-center gap-1.5">
        <svg width="11" height="11" viewBox="0 0 24 24" fill={`rgba(${FLAME},0.9)`} stroke="none"><path d="M12 2C9 7 6 8.5 6 13a6 6 0 0012 0c0-4.5-3-6-6-11zm0 17a4 4 0 01-2.83-6.83C10 13 11 14.5 12 15c1-0.5 2-2 2.83-2.83A4 4 0 0112 19z"/></svg>
        <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: `rgba(${FLAME},0.9)` }}>Streak</span>
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex flex-col">
          <span className="text-[28px] font-bold leading-none" style={{ color: current > 0 ? `rgba(${FLAME},0.95)` : "var(--c-text-5)" }}>{current}</span>
          <span className="text-[10px] text-t5 mt-0.5">day{current !== 1 ? "s" : ""} current</span>
        </div>
        <div className="w-full h-px" style={{ background: `rgba(${FLAME},0.15)` }} />
        <div className="flex flex-col">
          <span className="text-[18px] font-semibold leading-none text-t3">{longest}</span>
          <span className="text-[10px] text-t5 mt-0.5">day{longest !== 1 ? "s" : ""} best</span>
        </div>
      </div>
    </div>
  );
}

function IHKCard({ onNavigate }: { onNavigate: () => void }) {
  const { entries } = useIHKStore();
  const pad = (n: number) => String(n).padStart(2, "0");
  const todayStr = (() => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; })();
  const getWeek = (s: string) => { const d = new Date(s+"T00:00:00"); const t = new Date(d); t.setHours(0,0,0,0); t.setDate(t.getDate()+3-((t.getDay()+6)%7)); const j = new Date(t.getFullYear(),0,4); return { kw: 1+Math.round(((t.getTime()-j.getTime())/86400000-3+((j.getDay()+6)%7))/7), year: t.getFullYear() }; };
  const { kw, year } = getWeek(todayStr);
  const weekKey = `${year}-${String(kw).padStart(2,"0")}`;
  const weekEntries = entries.filter(e => { const w = getWeek(e.date); return `${w.year}-${String(w.kw).padStart(2,"0")}` === weekKey; });
  const catCounts = [0,1,2].map(cat => weekEntries.filter(e => e.category === cat).length);
  const CAT_RGB = ["59,130,246","99,102,241","16,185,129"];
  const AMBER = "251,191,36";
  const { sentWeeks } = useIHKStore();
  const isSent = sentWeeks.has(weekKey);
  const dotColor = isSent ? "rgba(16,185,129,0.9)" : (weekEntries.some(e=>e.category===0)||weekEntries.some(e=>e.category===2)) ? "rgba(251,191,36,0.9)" : "rgba(239,68,68,0.7)";

  return (
    <button onClick={onNavigate} className="text-left rounded-xl p-3 flex flex-col gap-2 transition-opacity hover:opacity-90" style={{ background: `rgba(${AMBER},0.07)`, border: `1px solid rgba(${AMBER},0.25)` }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <BookOpen size={11} className="text-amber-400 shrink-0" />
          <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider">IHK</span>
        </div>
        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: dotColor }} />
      </div>
      <p className="text-[13px] font-medium text-t2">KW {kw}</p>
      <div className="flex flex-col gap-1">
        {[0,1,2].map(cat => (
          <div key={cat} className="flex items-center gap-1.5">
            <span className="w-1 h-1 rounded-full shrink-0" style={{ background: `rgba(${CAT_RGB[cat]},${catCounts[cat]>0?"0.8":"0.25"})` }} />
            <span className="text-[10px] text-t5 truncate">{catCounts[cat]} {cat===0?"Betrieb":cat===1?"Schulung":"Berufsschule"}</span>
          </div>
        ))}
      </div>
    </button>
  );
}

export default function App() {
  const { todos, trash, categories, loading, load, add, loadCategories, addCategory, removeCategory, loadTrash, restore, deletePermanently, deleteAllPermanently, checkDueTodos, hasUnread: todoHasUnread, clearUnread: clearTodoUnread, setQuery } = useTodoStore();
  const { reminders: allReminders, checkDue, load: loadReminders, trash: reminderTrash, loadTrash: loadReminderTrash, restore: restoreReminder, deletePermanently: deleteReminderPermanently, deleteAllPermanently: deleteAllRemindersPermanently, hasUnread: reminderHasUnread, clearUnread: clearReminderUnread } = useReminderStore();
  const { notes, add: addNote, load: loadNotes, trash: noteTrash, loadTrash: loadNoteTrash, restore: restoreNote, deletePermanently: deleteNotePermanently, deleteAllPermanently: deleteAllNotesPermanently } = useNotesStore();
  const { entries: ihkEntries, load: loadIHK, modules: ihkModules } = useIHKStore();
  const { defaultSort, defaultPriority, theme, textSize, windowMode } = useSettingsStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const [inputVal, setInputVal] = useState("");
  const [focusedIdx, setFocusedIdx] = useState<number>(-1);
  const [visible, setVisible] = useState(false);
  const [preTrashView, setPreTrashView] = useState<View>("main");
  type View = "main" | "todos" | "trash" | "reminders" | "notes" | "ihk" | "settings";
  type NavView = "main" | "todos" | "reminders" | "notes" | "ihk" | "settings";
  const [view, setView] = useState<View>("main");
  const [lastNavView, setLastNavView] = useState<NavView>("main");

  const navigate = useCallback((v: View) => {
    if (v === "main" || v === "todos" || v === "reminders" || v === "notes" || v === "ihk" || v === "settings") setLastNavView(v);
    setView(v);
  }, []);
  const [addTaskOpen, setAddTaskOpen] = useState<false | "quick" | "deadline">(false);
  const [addTaskMenuOpen, setAddTaskMenuOpen] = useState(false);
  const addTaskBtnRef = useRef<HTMLButtonElement>(null);
  const [pendingModal, setPendingModal] = useState<{ type: "task" | "reminder"; text: string } | null>(null);
  const [cmdIdx, setCmdIdx] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState<{ title: string; message: string; onConfirm: () => void; confirmLabel?: string; confirmClassName?: string } | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [todoFilter, setTodoFilter] = useState<TodoFilter>("all");
  const [todoSort, setTodoSort] = useState<TodoSort>("manual");
  const [selectedTodoId, setSelectedTodoId] = useState<number | null>(null);
  const [activeCategoryId, setActiveCategoryId] = useState<number>(1);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);

  const askConfirm = useCallback((title: string, message: string, onConfirm: () => void, confirmLabel?: string, confirmClassName?: string) => {
    setConfirmDelete({ title, message, onConfirm, confirmLabel, confirmClassName });
  }, []);

  const COMMANDS = [
    { prefix: "/tm ", label: "/tm", desc: "Add task with deadline" },
    { prefix: "/rm ", label: "/rm", desc: "Add a reminder" },
    { prefix: "/nt ", label: "/nt", desc: "Create a new note" },
    { prefix: "/i",   label: "/i",  desc: "Quick IHK entry" },
    { prefix: "/t",   label: "/t",  desc: "Add task to category" },
  ];

  // Category picker: /t followed by optional filter, no space yet
  const showCategoryPicker = inputVal.length >= 2 && inputVal.startsWith("/t") && !inputVal.startsWith("/tm") && !inputVal.slice(2).includes(" ");
  const categoryQuery = inputVal.slice(2).toLowerCase();
  const filteredCategories = categories.filter(c => !categoryQuery || c.name.toLowerCase().startsWith(categoryQuery));

  // Module picker: /i followed by optional filter letters, no space yet
  const showModulePicker = inputVal.length >= 2 && inputVal.startsWith("/i") && !inputVal.slice(2).includes(" ");
  const moduleQuery = inputVal.slice(2).toLowerCase();
  const FIXED_PICKER = [
    { name: "Company", rgb: "59,130,246",  category: 0 as const },
    { name: "Meeting", rgb: "99,102,241",  category: 1 as const },
  ];
  const allPickerItems = showModulePicker ? [
    ...FIXED_PICKER.filter(f => !moduleQuery || f.name.toLowerCase().startsWith(moduleQuery)),
    ...ihkModules.filter(m => !moduleQuery || m.name.toLowerCase().startsWith(moduleQuery)).map(m => ({ name: m.name, rgb: "16,185,129", category: 2 as const })),
  ] : [];

  const showCmdPalette = !showModulePicker && !showCategoryPicker && (inputVal === "/" || (inputVal.startsWith("/") && COMMANDS.some(c => c.prefix.startsWith(inputVal))));
  const filteredCmds = inputVal === "/" ? COMMANDS : COMMANDS.filter(c => c.prefix.startsWith(inputVal));

  // Apply theme and text size to document root
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const textScale = textSize === "small" ? 0.88 : textSize === "large" ? 1.12 : 1;

  useEffect(() => {
    const win = getCurrentWindow();
    if (windowMode === "compact") {
      win.setSize({ type: "Logical", width: 640, height: 480 } as any);
    } else {
      win.setSize({ type: "Logical", width: 860, height: 560 } as any);
    }
  }, [windowMode]);

  // Load todos on mount + request notification permission early
  useEffect(() => { load(); loadReminders(); loadNotes(); loadIHK(); loadCategories(); initNotifications(); logActivity(); }, [load, loadReminders, loadNotes, loadIHK, loadCategories]);

  // Background notification checker — runs every 30s
  useEffect(() => {
    checkDue();
    checkDueTodos();
    const interval = setInterval(() => { checkDue(); checkDueTodos(); }, 30_000);
    return () => clearInterval(interval);
  }, [checkDue, checkDueTodos]);

  // Check immediately when window is shown (JS timers pause while window is hidden)
  useEffect(() => {
    const unlisten = listen("window-shown", () => {
      checkDue();
      checkDueTodos();
    });
    return () => { unlisten.then(fn => fn()); };
  }, [checkDue, checkDueTodos]);

  const openTrash = useCallback(() => {
    setPreTrashView(view);
    loadTrash();
    loadReminderTrash();
    loadNoteTrash();
    navigate("trash");
  }, [view, loadTrash, loadReminderTrash, loadNoteTrash]);


  // Listen for window-shown event to auto-focus input + animate in
  useEffect(() => {
    const unlisten = listen("window-shown", () => {
      setVisible(true);
      navigate("main");
      setInputVal("");
      setQuery("");
      setTimeout(() => inputRef.current?.focus(), 50);
    });
    // Also trigger on initial mount (first open)
    setVisible(true);
    setTimeout(() => inputRef.current?.focus(), 100);
    return () => { unlisten.then((fn) => fn()); };
  }, []);

  const PRIORITY_ORDER: Record<Priority, number> = { high: 0, medium: 1, low: 2, none: 3 };

  const activeSort = todoSort === "manual" ? defaultSort : todoSort;

  const filtered = todos
    .filter((t) => {
      if (t.category_id !== activeCategoryId) return false;
      if (todoFilter === "active") return !t.done;
      if (todoFilter === "done") return t.done;
      return true;
    })
    .sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      if (activeSort === "manual") return 0;
      if (activeSort === "az") return a.text.localeCompare(b.text);
      if (activeSort === "priority") return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
      if (activeSort === "due") {
        const da = a.due_date ? new Date(`${a.due_date}T${a.due_time ?? "23:59:59"}`) : null;
        const db = b.due_date ? new Date(`${b.due_date}T${b.due_time ?? "23:59:59"}`) : null;
        if (!da && !db) return 0;
        if (!da) return 1;
        if (!db) return -1;
        return da.getTime() - db.getTime();
      }
      return 0;
    });

  const selectedTodo = todos.find(t => t.id === selectedTodoId) ?? null;

  useEffect(() => {
    if (selectedTodoId && !todos.find(t => t.id === selectedTodoId)) setSelectedTodoId(null);
  }, [todos, selectedTodoId]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const oldIndex = todos.findIndex((t) => t.id === active.id);
      const newIndex = todos.findIndex((t) => t.id === over.id);
      const newOrder = arrayMove(todos, oldIndex, newIndex);
      useTodoStore.getState().reorder(newOrder.map((t) => t.id));
    },
    [todos]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (showModulePicker && allPickerItems.length > 0) {
        if (e.key === "ArrowDown") { e.preventDefault(); setCmdIdx(i => (i + 1) % allPickerItems.length); return; }
        if (e.key === "ArrowUp")   { e.preventDefault(); setCmdIdx(i => (i - 1 + allPickerItems.length) % allPickerItems.length); return; }
        if (e.key === "Tab" || e.key === "Enter") {
          e.preventDefault();
          const m = allPickerItems[cmdIdx] ?? allPickerItems[0];
          if (m) { const v = `/i ${m.name} `; setInputVal(v); setQuery(v); setCmdIdx(0); }
          return;
        }
        if (e.key === "Escape") { setInputVal(""); setQuery(""); return; }
      }
      if (showCategoryPicker && filteredCategories.length > 0) {
        if (e.key === "ArrowDown") { e.preventDefault(); setCmdIdx(i => (i + 1) % filteredCategories.length); return; }
        if (e.key === "ArrowUp")   { e.preventDefault(); setCmdIdx(i => (i - 1 + filteredCategories.length) % filteredCategories.length); return; }
        if (e.key === "Tab" || e.key === "Enter") {
          e.preventDefault();
          const c = filteredCategories[cmdIdx] ?? filteredCategories[0];
          if (c) { const v = `/t ${c.name} `; setInputVal(v); setQuery(v); setCmdIdx(0); }
          return;
        }
        if (e.key === "Escape") { setInputVal(""); setQuery(""); return; }
      }
      // /t CategoryName text → save as task in that category
      if (e.key === "Enter" && inputVal.startsWith("/t ")) {
        const rest = inputVal.slice(3).trim();
        const catMatch = categories.find(c => rest.toLowerCase().startsWith(c.name.toLowerCase() + " "));
        if (catMatch) {
          const text = rest.slice(catMatch.name.length).trim();
          if (text) {
            add(text, defaultPriority, null, null, catMatch.id);
            setInputVal(""); setQuery("");
            return;
          }
        }
      }
      if (showCmdPalette && filteredCmds.length > 0) {
        if (e.key === "ArrowDown") { e.preventDefault(); setCmdIdx(i => (i + 1) % filteredCmds.length); return; }
        if (e.key === "ArrowUp")   { e.preventDefault(); setCmdIdx(i => (i - 1 + filteredCmds.length) % filteredCmds.length); return; }
        if (e.key === "Tab" || (e.key === "Enter" && inputVal === "/")) {
          e.preventDefault();
          setInputVal(filteredCmds[cmdIdx].prefix);
          setQuery(filteredCmds[cmdIdx].prefix);
          return;
        }
        if (e.key === "Escape") {
          if (inputVal.trim()) { setInputVal(""); setQuery(""); }
          else { getCurrentWindow().hide(); }
          return;
        }
      }
      // IHK quick entry: /i ModuleName text → save to current week
      if (e.key === "Enter" && inputVal.startsWith("/i ")) {
        const rest = inputVal.slice(3).trim();
        const fixedMatch = FIXED_PICKER.find(f => rest.toLowerCase().startsWith(f.name.toLowerCase() + " "));
        const modMatch = ihkModules.find(m => rest.toLowerCase().startsWith(m.name.toLowerCase() + " "));
        const matched = fixedMatch ?? (modMatch ? { name: modMatch.name, category: 2 as const } : null);
        if (matched) {
          const text = rest.slice(matched.name.length).trim();
          if (text) {
            const d = new Date(); const p = (n: number) => String(n).padStart(2, "0");
            const todayStr = `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`;
            useIHKStore.getState().add(text, matched.category, todayStr);
            setInputVal(""); setQuery("");
            return;
          }
        }
      }
      if (e.key === "Enter" && inputVal.trim()) {
        const val = inputVal.trim();
        if (val.startsWith("/tm ") || val === "/tm") {
          const text = val.slice(4).trim();
          if (text) { setPendingModal({ type: "task", text }); setInputVal(""); setQuery(""); }
          return;
        }
        if (val.startsWith("/rm ") || val === "/rm") {
          const text = val.slice(4).trim();
          if (text) { setPendingModal({ type: "reminder", text }); setInputVal(""); setQuery(""); }
          return;
        }
        if (val.startsWith("/nt ") || val === "/nt") {
          const title = val.slice(4).trim();
          addNote(title || "Untitled", "");
          navigate("notes");
          setInputVal("");
          setQuery("");
          return;
        }
        add(val, defaultPriority);
        setInputVal("");
        setQuery("");
        navigate("todos");
        return;
      }
      if (e.key === "Escape") {
        if (inputVal.trim()) { setInputVal(""); setQuery(""); return; }
        getCurrentWindow().hide();
      }
    },
    [inputVal, showCmdPalette, filteredCmds, cmdIdx, add, addNote, defaultPriority, setQuery]
  );

  // Global keydown
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { if (searchOpen) { setSearchOpen(false); return; } getCurrentWindow().hide(); return; }
      if ((e.metaKey || e.ctrlKey) && e.key === "f") { e.preventDefault(); setSearchOpen(o => !o); return; }
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        const tabs: NavView[] = ["main", "todos", "reminders", "notes", "ihk", "settings"];
        const cur = tabs.indexOf(lastNavView);
        const next = e.key === "ArrowRight"
          ? tabs[(cur + 1) % tabs.length]
          : tabs[(cur - 1 + tabs.length) % tabs.length];
        navigate(next);
        return;
      }
      if (document.activeElement === inputRef.current) return;
      if (view !== "todos") return;
      if (e.key === " ") {
        const todo = filtered[focusedIdx];
        if (todo) { e.preventDefault(); useTodoStore.getState().toggle(todo.id); }
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setFocusedIdx((i) => Math.min(i + 1, filtered.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setFocusedIdx((i) => {
          if (i <= 0) { return -1; }
          return i - 1;
        });
        return;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [filtered, focusedIdx, lastNavView, view, searchOpen]);

  const BackButton = () => (
    <button onClick={() => navigate(preTrashView)} className="text-t3 hover:text-t2 transition-colors mr-3">
      <ChevronLeft size={14} />
    </button>
  );

  const VIEW_TITLE: Record<View, string> = { main: "Slate", todos: "Tasks", trash: "Deleted", reminders: "Reminders", notes: "Notes", ihk: "IHK Records", settings: "Settings" };

  return (
    <div style={{ width: "100%", height: "100%", overflow: "hidden" }}>
    <ReminderAlert />
    <div
      className={`relative flex flex-col overflow-hidden transition-opacity duration-200 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
      style={{
        width: `${100 / textScale}%`,
        height: `${100 / textScale}%`,
        transform: `scale(${textScale})`,
        transformOrigin: "top left",
      }}
    >
      {/* Header */}
      <div
        data-tauri-drag-region
        className="flex items-center px-5 shrink-0 select-none cursor-default border-b border-s"
        style={{ height: 38, background: "var(--c-nav)" }}
      >
        {view === "trash" && <BackButton />}
        {view === "main" ? (
          <div className="flex items-center gap-1.5">
            <img src={theme === "dark" ? logoMarkDark : logoMarkLight} alt="Slate" className="w-4 h-4 opacity-70" />
            <span className="text-[11px] font-semibold text-t3 tracking-widest uppercase">Slate</span>
          </div>
        ) : (
          <span className="text-[11px] font-semibold text-t3 tracking-widest uppercase">{VIEW_TITLE[view]}</span>
        )}
        <div className="ml-auto flex items-center gap-3">
          {view === "main" && <span className="text-[11px] text-t5">⌥S</span>}
        </div>
      </div>

      {/* Main view — quick capture input */}
      {view === "main" && (
        <div key="main" className="view-animate relative flex flex-col flex-1 overflow-hidden">
          <div
            className="flex items-center gap-3 px-5 shrink-0 border-b transition-colors"
            style={{
              height: 48,
              borderBottomColor: inputFocused ? "rgba(180,180,190,0.35)" : "var(--c-border-subtle)",
              boxShadow: inputFocused ? "0 1px 0 0 rgba(180,180,190,0.1)" : "none",
            }}
          >
            <input
              ref={inputRef}
              type="text"
              value={inputVal}
              onChange={(e) => { setInputVal(e.target.value); setQuery(e.target.value); setCmdIdx(0); }}
              onKeyDown={handleKeyDown}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              placeholder="Add task · /tm deadline · /rm reminder…"
              className="flex-1 bg-transparent text-t1 placeholder-themed text-sm outline-none"
            />
            {inputVal && (
              <button
                onClick={() => { setInputVal(""); setQuery(""); inputRef.current?.focus(); }}
                className="text-t4 hover:text-t2 transition-colors shrink-0"
              >
                <X size={11} />
              </button>
            )}
          </div>

          {showModulePicker && (
            <div className="absolute left-0 right-0 z-50 py-1" style={{ top: 48, background: "rgba(20,20,24,0.55)", backdropFilter: "blur(12px)", borderBottom: "1px solid var(--c-border-subtle)" }}>
              {allPickerItems.length === 0 ? (
                <div className="px-5 py-2 text-[12px] text-t5">No match — add modules in the IHK page</div>
              ) : allPickerItems.map((item, i) => {
                const CAT_LABEL: Record<number, string> = { 0: "Betrieb", 1: "Schulung", 2: "Berufsschule" };
                return (
                  <button key={item.name}
                    onMouseDown={e => { e.preventDefault(); const v = `/i ${item.name} `; setInputVal(v); setQuery(v); setCmdIdx(0); inputRef.current?.focus(); }}
                    className={`w-full flex items-center gap-3 px-5 py-2 text-left transition-colors ${i === cmdIdx ? "" : "hover:bg-s1"}`}
                    style={i === cmdIdx ? { background: "var(--c-surface-2)" } : {}}
                  >
                    <span className="text-[13px] font-mono font-medium" style={{ color: `rgba(${item.rgb},0.9)` }}>{item.name}</span>
                    <span className="text-[11px] text-t4">{CAT_LABEL[item.category]}</span>
                    {i === cmdIdx && <span className="ml-auto text-[10px] text-t5">Tab or ↵</span>}
                  </button>
                );
              })}
            </div>
          )}
          {showCategoryPicker && (
            <div className="absolute left-0 right-0 z-50 py-1" style={{ top: 48, background: "rgba(20,20,24,0.55)", backdropFilter: "blur(12px)", borderBottom: "1px solid var(--c-border-subtle)" }}>
              {filteredCategories.length === 0 ? (
                <div className="px-5 py-2 text-[12px] text-t5">No match — add categories in the Tasks page</div>
              ) : filteredCategories.map((cat, i) => (
                <button key={cat.id}
                  onMouseDown={e => { e.preventDefault(); const v = `/t ${cat.name} `; setInputVal(v); setQuery(v); setCmdIdx(0); inputRef.current?.focus(); }}
                  className={`w-full flex items-center gap-3 px-5 py-2 text-left transition-colors ${i === cmdIdx ? "" : "hover:bg-s1"}`}
                  style={i === cmdIdx ? { background: "var(--c-surface-2)" } : {}}
                >
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: `rgba(${cat.color},0.8)` }} />
                  <span className="text-[13px] font-medium text-t1">{cat.name}</span>
                  {i === cmdIdx && <span className="ml-auto text-[10px] text-t5">Tab or ↵</span>}
                </button>
              ))}
            </div>
          )}
          {showCmdPalette && filteredCmds.length > 0 && (
            <div className="absolute left-0 right-0 z-50 py-1" style={{ top: 48, background: "rgba(20,20,24,0.55)", backdropFilter: "blur(12px)", borderBottom: "1px solid var(--c-border-subtle)" }}>
              {filteredCmds.map((cmd, i) => (
                <button
                  key={cmd.prefix}
                  onMouseDown={(e) => { e.preventDefault(); setInputVal(cmd.prefix); setQuery(cmd.prefix); setCmdIdx(i); inputRef.current?.focus(); }}
                  className={`w-full flex items-center gap-3 px-5 py-2 text-left transition-colors ${i === cmdIdx ? "" : "hover:bg-s1"}`}
                  style={i === cmdIdx ? { background: "var(--c-surface-2)" } : {}}
                >
                  <span className="text-[13px] font-mono font-medium text-blue-400">{cmd.label}</span>
                  <span className="text-[12px] text-t3">{cmd.desc}</span>
                  {i === cmdIdx && <span className="ml-auto text-[10px] text-t5">↵ or Tab</span>}
                </button>
              ))}
            </div>
          )}

          <div className="flex-1 flex flex-col justify-between px-5 py-5 gap-4 select-none">
            {/* Hint */}
            <div className="flex-1 flex flex-col justify-center gap-3">
              <p className="text-t5 text-xs">Type a task and press ↵</p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
                {[
                  { cmd: "/tm", desc: "Add task with deadline" },
                  { cmd: "/t",  desc: "Task in category" },
                  { cmd: "/rm", desc: "Add a reminder" },
                  { cmd: "/nt", desc: "Create a new note" },
                  { cmd: "/i",  desc: "Quick IHK entry" },
                ].map(({ cmd, desc }) => (
                  <div key={cmd} className="flex items-center gap-2">
                    <span className="text-[12px] font-mono font-medium text-blue-400 shrink-0">{cmd}</span>
                    <span className="text-[12px] text-t5">{desc}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Activity heatmap + streak */}
            <div className="flex gap-3 items-stretch">
              <div className="flex-1 min-w-0 overflow-x-auto"><ActivityHeatmap /></div>
              <div className="shrink-0 w-28"><StreakWidget /></div>
            </div>

            {/* Preview cards */}
            <div className="grid grid-cols-4 gap-3">
                {/* Tasks */}
                {(() => {
                  const total = todos.length;
                  const done = todos.filter(t => t.done).length;
                  const active = total - done;
                  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
                  return (
                    <button onClick={() => navigate("todos")} className="text-left rounded-xl p-3 flex flex-col gap-2 transition-opacity hover:opacity-90" style={{ background: "rgba(59,130,246,0.07)", border: "1px solid rgba(59,130,246,0.25)" }}>
                      <div className="flex items-center gap-1.5">
                        <CheckSquare size={11} className="text-blue-400 shrink-0" />
                        <span className="text-[11px] font-semibold text-blue-400 uppercase tracking-wider">Tasks</span>
                      </div>
                      <p className="text-[13px] font-medium text-t2">{active} remaining</p>
                      {total > 0 ? (
                        <div className="flex flex-col gap-1">
                          <div className="w-full rounded-full overflow-hidden" style={{ height: 4, background: "rgba(59,130,246,0.15)" }}>
                            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: "rgba(59,130,246,0.8)" }} />
                          </div>
                          <span className="text-[10px] text-t5">{done} of {total} done</span>
                        </div>
                      ) : (
                        <p className="text-[11px] text-t5">No tasks yet</p>
                      )}
                    </button>
                  );
                })()}

                {/* Reminders */}
                <button onClick={() => navigate("reminders")} className="text-left rounded-xl p-3 flex flex-col gap-2 transition-opacity hover:opacity-90" style={{ background: "rgba(99,102,241,0.07)", border: "1px solid rgba(99,102,241,0.25)" }}>
                  <div className="flex items-center gap-1.5">
                    <Clock size={11} className="text-indigo-400 shrink-0" />
                    <span className="text-[11px] font-semibold text-indigo-400 uppercase tracking-wider">Reminders</span>
                  </div>
                  <p className="text-[13px] font-medium text-t2">{allReminders.filter(r => !r.notified).length} upcoming</p>
                  <div className="flex flex-col gap-0.5">
                    {allReminders.filter(r => !r.notified).slice(0, 2).map(r => (
                      <p key={r.id} className="text-[11px] text-t4 truncate">· {r.text}</p>
                    ))}
                    {allReminders.filter(r => !r.notified).length === 0 && <p className="text-[11px] text-t5">No upcoming</p>}
                  </div>
                </button>

                {/* Notes */}
                <button onClick={() => navigate("notes")} className="text-left rounded-xl p-3 flex flex-col gap-2 transition-opacity hover:opacity-90" style={{ background: "rgba(16,185,129,0.07)", border: "1px solid rgba(16,185,129,0.25)" }}>
                  <div className="flex items-center gap-1.5">
                    <FileText size={11} className="text-emerald-400 shrink-0" />
                    <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">Notes</span>
                  </div>
                  <p className="text-[13px] font-medium text-t2">{notes.length} note{notes.length !== 1 ? "s" : ""}</p>
                  <div className="flex flex-col gap-0.5">
                    {notes.slice(0, 2).map(n => (
                      <p key={n.id} className="text-[11px] text-t4 truncate">· {n.title}</p>
                    ))}
                    {notes.length === 0 && <p className="text-[11px] text-t5">No notes yet</p>}
                  </div>
                </button>

                {/* IHK */}
                <IHKCard onNavigate={() => navigate("ihk")} />
            </div>
          </div>
        </div>
      )}

      {/* Todos view — task list */}
      {view === "todos" && (
        <div key="todos" className="view-animate flex flex-col flex-1 overflow-hidden">
          {addTaskOpen && <AddTaskModal withDeadline={addTaskOpen === "deadline"} categoryId={activeCategoryId} onClose={() => setAddTaskOpen(false)} />}

          {/* Category tabs row */}
          <div className="flex items-center gap-0 px-2 pt-1.5 shrink-0" style={{ borderBottom: "1px solid var(--c-border-subtle)" }}>
            <div className="flex items-center gap-0.5 flex-1 overflow-x-auto category-tabs-scroll">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategoryId(cat.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-t text-[12px] shrink-0 transition-colors"
                  style={activeCategoryId === cat.id
                    ? { color: `rgba(${cat.color},1)`, borderBottom: `2px solid rgba(${cat.color},0.8)`, marginBottom: -1 }
                    : { color: "var(--c-text-4)", borderBottom: "2px solid transparent", marginBottom: -1 }}
                >
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: `rgba(${cat.color},${activeCategoryId === cat.id ? "0.9" : "0.4"})` }} />
                  {cat.name}
                  <span className="text-[10px] opacity-60">{todos.filter(t => t.category_id === cat.id && !t.done).length}</span>
                </button>
              ))}
            </div>
            {/* Manage categories */}
            <button
              onClick={() => setShowCategoryManager(o => !o)}
              className="p-1.5 rounded text-t5 hover:text-t3 hover:bg-s1 transition-colors shrink-0 mr-1"
              title="Manage categories"
            >
              <Settings size={11} />
            </button>
            <div className="relative shrink-0 mr-2">
              <button
                ref={addTaskBtnRef}
                onClick={() => setAddTaskMenuOpen((o) => !o)}
                className="p-1 rounded text-blue-400 hover:text-blue-300 hover:bg-s1 transition-colors"
                title="Add task"
              >
                <Plus size={12} />
              </button>
              {addTaskMenuOpen && (
                <div
                  className="absolute right-0 top-full mt-1 dropdown rounded-lg overflow-hidden z-50"
                  style={{ width: 180, border: "1px solid var(--c-border)", boxShadow: "0 8px 24px rgba(0,0,0,0.35)" }}
                  onMouseLeave={() => setAddTaskMenuOpen(false)}
                >
                  <button
                    className="w-full text-left px-3 py-2 text-[12px] text-t2 hover:bg-s2 transition-colors flex items-center gap-2"
                    onClick={() => { setAddTaskMenuOpen(false); setAddTaskOpen("quick"); }}
                  >
                    <Zap size={12} className="text-blue-400" />
                    Quick task
                  </button>
                  <button
                    className="w-full text-left px-3 py-2 text-[12px] text-t2 hover:bg-s2 transition-colors flex items-center gap-2"
                    onClick={() => { setAddTaskMenuOpen(false); setAddTaskOpen("deadline"); }}
                  >
                    <CalendarDays size={12} className="text-blue-400" />
                    With deadline
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Category manager panel */}
          {showCategoryManager && (
            <CategoryManagerPanel
              categories={categories}
              onAdd={addCategory}
              onRemove={removeCategory}
              onClose={() => setShowCategoryManager(false)}
            />
          )}

          {/* FilterBar */}
          <div className="flex items-center" style={{ borderBottom: "1px solid var(--c-border-subtle)" }}>
            <div className="flex-1 overflow-hidden">
              <FilterBar
                page="todos"
                filter={todoFilter}
                sort={todoSort}
                onFilter={setTodoFilter}
                onSort={setTodoSort}
                onRefresh={async () => { await load(); }}
              />
            </div>
          </div>
          {/* Split panel */}
          <div className="flex flex-row flex-1 overflow-hidden">
            {/* Left: list */}
            <div className="flex flex-col overflow-hidden border-r border-s" style={{ width: 300 }}>
              <div className="overflow-y-auto flex-1 py-1.5">
                {loading ? (
                  <div className="px-5 py-10 text-center text-t5 text-sm select-none">Loading…</div>
                ) : filtered.length === 0 ? (
                  <div className="px-5 py-10 text-center text-t5 text-sm select-none">No tasks yet</div>
                ) : (
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={filtered.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                      {filtered.map((todo, i) => (
                        <TodoRow key={todo.id} todo={todo} focused={focusedIdx === i} onFocus={() => setFocusedIdx(i)} onDeleteRequest={() => askConfirm("Delete task?", `"${todo.text}" will be moved to trash.`, () => useTodoStore.getState().remove(todo.id))} onSelect={() => setSelectedTodoId(todo.id)} />
                      ))}
                    </SortableContext>
                  </DndContext>
                )}
              </div>
            </div>
            {/* Right: task detail */}
            <div className="flex flex-col flex-1 overflow-hidden">
              {selectedTodo ? <TaskDetail todo={selectedTodo} onClose={() => setSelectedTodoId(null)} /> : <EmptyTaskDetail />}
            </div>
          </div>
        </div>
      )}

      {/* Trash view — contextual per originating page */}
      {view === "trash" && (
        <div key="trash" className="view-animate overflow-y-auto flex-1 py-1.5">
          {preTrashView === "todos" && (
            trash.length === 0
              ? <div className="px-5 py-10 text-center text-t5 text-sm select-none">No deleted tasks</div>
              : <>
                  <div className="flex items-center justify-between px-5 py-1.5">
                    <span className="text-[10px] text-t5 uppercase tracking-wider">{trash.length} deleted</span>
                    <button onClick={() => askConfirm("Delete all tasks?", "All deleted tasks will be permanently removed.", () => deleteAllPermanently())} className="text-[10px] text-red-400/60 hover:text-red-400 transition-colors">Delete all</button>
                  </div>
                  {trash.map((todo) => (
                    <div key={todo.id} className="group flex items-center gap-3 px-5 border-b border-s hover:bg-s1 transition-colors" style={{ minHeight: 48 }}>
                      <span className="flex-1 text-[14px] text-t3 line-through truncate">{todo.text}</span>
                      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => restore(todo.id)} title="Restore" className="w-6 h-6 flex items-center justify-center rounded hover:bg-s3 transition-colors text-t4 hover:text-green-400"><RotateCcw size={12} /></button>
                        <button onClick={() => askConfirm("Delete permanently?", "This cannot be undone.", () => deletePermanently(todo.id))} className="w-6 h-6 flex items-center justify-center rounded hover:bg-s3 transition-colors text-t4 hover:text-red-400"><X size={10} /></button>
                      </div>
                    </div>
                  ))}
                </>
          )}
          {preTrashView === "reminders" && (
            reminderTrash.length === 0
              ? <div className="px-5 py-10 text-center text-t5 text-sm select-none">No deleted reminders</div>
              : <>
                  <div className="flex items-center justify-between px-5 py-1.5">
                    <span className="text-[10px] text-t5 uppercase tracking-wider">{reminderTrash.length} deleted</span>
                    <button onClick={() => askConfirm("Delete all reminders?", "All deleted reminders will be permanently removed.", () => deleteAllRemindersPermanently())} className="text-[10px] text-red-400/60 hover:text-red-400 transition-colors">Delete all</button>
                  </div>
                  {reminderTrash.map((r) => (
                    <div key={r.id} className="group flex items-center gap-3 px-5 border-b border-s hover:bg-s1 transition-colors" style={{ minHeight: 48 }}>
                      <span className="flex-1 text-[14px] text-t3 line-through truncate">{r.text}</span>
                      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => restoreReminder(r.id)} title="Restore" className="w-6 h-6 flex items-center justify-center rounded hover:bg-s3 transition-colors text-t4 hover:text-green-400"><RotateCcw size={12} /></button>
                        <button onClick={() => askConfirm("Delete permanently?", "This cannot be undone.", () => deleteReminderPermanently(r.id))} className="w-6 h-6 flex items-center justify-center rounded hover:bg-s3 transition-colors text-t4 hover:text-red-400"><X size={10} /></button>
                      </div>
                    </div>
                  ))}
                </>
          )}
          {preTrashView === "notes" && (
            noteTrash.length === 0
              ? <div className="px-5 py-10 text-center text-t5 text-sm select-none">No deleted notes</div>
              : <>
                  <div className="flex items-center justify-between px-5 py-1.5">
                    <span className="text-[10px] text-t5 uppercase tracking-wider">{noteTrash.length} deleted</span>
                    <button onClick={() => askConfirm("Delete all notes?", "All deleted notes will be permanently removed.", () => deleteAllNotesPermanently())} className="text-[10px] text-red-400/60 hover:text-red-400 transition-colors">Delete all</button>
                  </div>
                  {noteTrash.map((n) => (
                    <div key={n.id} className="group flex items-center gap-3 px-5 border-b border-s hover:bg-s1 transition-colors" style={{ minHeight: 48 }}>
                      <span className="flex-1 text-[14px] text-t3 line-through truncate">{n.title}</span>
                      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => restoreNote(n.id)} title="Restore" className="w-6 h-6 flex items-center justify-center rounded hover:bg-s3 transition-colors text-t4 hover:text-green-400"><RotateCcw size={12} /></button>
                        <button onClick={() => askConfirm("Delete permanently?", "This cannot be undone.", () => deleteNotePermanently(n.id))} className="w-6 h-6 flex items-center justify-center rounded hover:bg-s3 transition-colors text-t4 hover:text-red-400"><X size={10} /></button>
                      </div>
                    </div>
                  ))}
                </>
          )}
        </div>
      )}

      {/* Reminders view */}
      {view === "reminders" && <RemindersPage key="reminders" onDeleteRequest={(id) => { const r = useReminderStore.getState().reminders.find(r => r.id === id); askConfirm("Delete reminder?", `"${r?.text ?? "This reminder"}" will be deleted.`, () => useReminderStore.getState().remove(id)); }} onConfirm={askConfirm} />}

      {/* Notes view */}
      {view === "notes" && <NotesPage onDeleteRequest={(id) => { const n = useNotesStore.getState().notes.find(n => n.id === id); askConfirm("Delete note?", `"${n?.title ?? "This note"}" will be permanently deleted.`, () => useNotesStore.getState().remove(id)); }} />}
      {view === "ihk" && <IHKPage />}
      {view === "settings" && <SettingsPage />}

      {/* Footer — all views */}
      {true && (
        <>
          <div data-tauri-drag-region className="flex items-center px-5 shrink-0 select-none" style={{ height: 36, background: "var(--c-nav)", borderTop: "1px solid var(--c-border-subtle)" }}>
            <span className="text-[11px] text-t4">
              {view === "reminders"
                ? `${allReminders.filter((r) => !r.notified).length} upcoming`
                : view === "notes"
                ? `${notes.length} note${notes.length !== 1 ? "s" : ""}`
                : view === "ihk"
                ? `${ihkEntries.length} IHK ${ihkEntries.length === 1 ? "entry" : "entries"}`
                : view === "trash"
                ? `${trash.length} deleted`
                : view === "settings"
                ? "Settings"
                : view === "todos"
                ? `${todos.filter((t) => !t.done).length} task${todos.filter((t) => !t.done).length !== 1 ? "s" : ""} remaining`
                : ""}
            </span>
            <div className="absolute left-1/2 -translate-x-1/2">
              <div
                className="relative flex items-center gap-1 px-0.5 py-0.5"
                style={{ borderRadius: 6, background: "var(--c-surface-2)", border: "1px solid var(--c-border)" }}
              >
                {/* Sliding active indicator */}
                <div
                  className="absolute top-0.5 h-5 w-7 transition-transform duration-200 ease-out"
                  style={{
                    borderRadius: 5,
                    background: lastNavView === "todos" ? "rgba(59,130,246,0.15)" : lastNavView === "reminders" ? "rgba(99,102,241,0.15)" : lastNavView === "notes" ? "rgba(16,185,129,0.15)" : lastNavView === "ihk" ? "rgba(251,191,36,0.15)" : "var(--c-surface-3)",
                    left: "2px",
                    transform: `translateX(${lastNavView === "main" ? "0px" : lastNavView === "todos" ? "32px" : lastNavView === "reminders" ? "64px" : lastNavView === "notes" ? "96px" : lastNavView === "ihk" ? "128px" : "160px"})`,
                    transition: "transform 0.2s ease-out, background 0.2s ease-out",
                  }}
                />
                <button
                  onClick={() => navigate("main")}
                  className={`group/btn relative z-10 w-7 h-5 flex items-center justify-center transition-colors duration-200 ${lastNavView === "main" ? "text-t1" : "text-t4 hover:text-t2"}`}
                >
                  <span className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded text-[10px] text-t2 whitespace-nowrap opacity-0 group-hover/btn:opacity-100 transition-opacity duration-150" style={{ background: "var(--c-tooltip)", border: "1px solid var(--c-border)" }}>Home</span>
                  <Home size={13} />
                </button>
                <button
                  onClick={() => { navigate("todos"); clearTodoUnread(); }}
                  className={`group/btn relative z-10 w-7 h-5 flex items-center justify-center transition-colors duration-200 nav-todo ${lastNavView === "todos" ? "text-blue-400" : "text-t4"}`}
                >
                  <span className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded text-[10px] text-t2 whitespace-nowrap opacity-0 group-hover/btn:opacity-100 transition-opacity duration-150" style={{ background: "var(--c-tooltip)", border: "1px solid var(--c-border)" }}>Tasks</span>
                  <CheckSquare size={14} />
                  {todoHasUnread && <span className="absolute top-0 right-0 w-1.5 h-1.5 rounded-full bg-red-500" />}
                </button>
                <button
                  onClick={() => { navigate("reminders"); clearReminderUnread(); }}
                  className={`group/btn relative z-10 w-7 h-5 flex items-center justify-center transition-colors duration-200 nav-reminders ${lastNavView === "reminders" ? "text-indigo-400" : "text-t4"}`}
                >
                  <span className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded text-[10px] text-t2 whitespace-nowrap opacity-0 group-hover/btn:opacity-100 transition-opacity duration-150" style={{ background: "var(--c-tooltip)", border: "1px solid var(--c-border)" }}>Reminders</span>
                  <Clock size={14} />
                  {reminderHasUnread && <span className="absolute top-0 right-0 w-1.5 h-1.5 rounded-full bg-red-500" />}
                </button>
                <button
                  onClick={() => navigate("notes")}
                  className={`group/btn relative z-10 w-7 h-5 flex items-center justify-center transition-colors duration-200 nav-notes ${lastNavView === "notes" ? "text-emerald-400" : "text-t4"}`}
                >
                  <span className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded text-[10px] text-t2 whitespace-nowrap opacity-0 group-hover/btn:opacity-100 transition-opacity duration-150" style={{ background: "var(--c-tooltip)", border: "1px solid var(--c-border)" }}>Notes</span>
                  <FileText size={14} />
                </button>
                <button
                  onClick={() => navigate("ihk")}
                  className={`group/btn relative z-10 w-7 h-5 flex items-center justify-center transition-colors duration-200 ${lastNavView === "ihk" ? "text-amber-400" : "text-t4 hover:text-t2"}`}
                >
                  <span className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded text-[10px] text-t2 whitespace-nowrap opacity-0 group-hover/btn:opacity-100 transition-opacity duration-150" style={{ background: "var(--c-tooltip)", border: "1px solid var(--c-border)" }}>IHK</span>
                  <BookOpen size={14} />
                </button>
                <button
                  onClick={() => navigate("settings")}
                  className={`group/btn relative z-10 w-7 h-5 flex items-center justify-center transition-colors duration-200 ${lastNavView === "settings" ? "text-t1" : "text-t4 hover:text-t2"}`}
                >
                  <span className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded text-[10px] text-t2 whitespace-nowrap opacity-0 group-hover/btn:opacity-100 transition-opacity duration-150" style={{ background: "var(--c-tooltip)", border: "1px solid var(--c-border)" }}>Settings</span>
                  <SettingsIcon size={13} />
                </button>
              </div>
            </div>
            <div className="ml-auto flex items-center gap-2">
              {view === "todos" && todos.some((t) => t.done) && (
                <div className="group/clear relative">
                  <button
                    onClick={() => askConfirm("Clear completed?", "All done tasks will be moved to trash.", () => todos.filter((t) => t.done).forEach((t) => useTodoStore.getState().remove(t.id)))}
                    className="w-7 h-5 flex items-center justify-center text-t4 hover:text-t2 transition-colors"
                  >
                    <CheckCheck size={13} />
                  </button>
                  <span className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded text-[10px] text-t2 whitespace-nowrap opacity-0 group-hover/clear:opacity-100 transition-opacity duration-150" style={{ background: "var(--c-tooltip)", border: "1px solid var(--c-border)" }}>Clear done</span>
                </div>
              )}
              {view === "reminders" && allReminders.some((r) => r.notified) && (
                <div className="group/clearsent relative">
                  <button
                    onClick={() => askConfirm("Clear sent?", "All sent reminders will be deleted.", () => allReminders.filter((r) => r.notified).forEach((r) => useReminderStore.getState().remove(r.id)))}
                    className="w-7 h-5 flex items-center justify-center text-t4 hover:text-t2 transition-colors"
                  >
                    <CheckCheck size={13} />
                  </button>
                  <span className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded text-[10px] text-t2 whitespace-nowrap opacity-0 group-hover/clearsent:opacity-100 transition-opacity duration-150" style={{ background: "var(--c-tooltip)", border: "1px solid var(--c-border)" }}>Clear sent</span>
                </div>
              )}
              {(view === "todos" || view === "reminders" || view === "notes") && (
                <div className="group/trash relative">
                  <button
                    onClick={openTrash}
                    className="w-7 h-5 flex items-center justify-center text-t4 hover:text-t2 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                  <span className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded text-[10px] text-t2 whitespace-nowrap opacity-0 group-hover/trash:opacity-100 transition-opacity duration-150" style={{ background: "var(--c-tooltip)", border: "1px solid var(--c-border)" }}>Deleted</span>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {searchOpen && (
        <SearchModal
          onClose={() => setSearchOpen(false)}
          onNavigate={(v) => { navigate(v); setSearchOpen(false); }}
        />
      )}

      {confirmDelete && (
        <ConfirmDialog
          title={confirmDelete.title}
          message={confirmDelete.message}
          onConfirm={() => { confirmDelete.onConfirm(); setConfirmDelete(null); }}
          onCancel={() => setConfirmDelete(null)}
          confirmLabel={confirmDelete.confirmLabel}
          confirmClassName={confirmDelete.confirmClassName}
        />
      )}

      {pendingModal?.type === "task" && (
        <DateTimeModal
          title="Set deadline"
          subtitle={pendingModal.text}
          showDate={true}
          initialCategoryId={activeCategoryId}
          onConfirm={async (datetime, categoryId) => {
            const snapshot = pendingModal;
            setPendingModal(null);
            setTimeout(() => inputRef.current?.focus(), 50);
            try {
              const date = datetime.split("T")[0];
              const time = datetime.split("T")[1]?.slice(0, 5);
              await useTodoStore.getState().add(snapshot.text, "none", null, null, categoryId);
              const db = await import("./db").then((m) => m.getDb());
              await db.execute(
                "UPDATE todos SET due_date = ?, due_time = ? WHERE id = (SELECT id FROM todos WHERE text = ? AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 1)",
                [date, time, snapshot.text]
              );
              await load();
              navigate("todos");
            } catch (e) {
              console.error("confirm failed", e);
            }
          }}
          onCancel={() => {
            setPendingModal(null);
            setTimeout(() => inputRef.current?.focus(), 50);
          }}
        />
      )}
      {pendingModal?.type === "reminder" && (
        <AddReminderModal
          initialText={pendingModal.text}
          onClose={() => {
            setPendingModal(null);
            setTimeout(() => inputRef.current?.focus(), 50);
          }}
          onSaved={() => {
            setPendingModal(null);
            navigate("reminders");
          }}
        />
      )}

    </div>
    </div>
  );
}
