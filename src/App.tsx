import { useEffect, useRef, useState, useCallback } from "react";
import {
  GripVertical,
  Check,
  Pencil,
  X,
  RotateCcw,
  Search,
  ChevronLeft,
  CheckSquare,
  Clock,
  FileText,
  Settings as SettingsIcon,
  Trash2,
  CheckCheck,
} from "lucide-react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { listen } from "@tauri-apps/api/event";
import { useTodoStore, Priority, Todo } from "./store";
import { useReminderStore } from "./reminderStore";
import { useNotesStore } from "./notesStore";
import { initNotifications } from "./notifications";
import DateTimeModal from "./components/DateTimeModal";
import RemindersPage from "./components/RemindersPage";
import GuidePage from "./components/GuidePage";
import NotesPage from "./components/NotesPage";
import ConfirmDialog from "./components/ConfirmDialog";
import FilterBar, { TodoFilter, TodoSort } from "./components/FilterBar";
import SettingsPage from "./components/SettingsPage";
import { useSettingsStore } from "./settingsStore";
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

const PRIORITY_COLOR: Record<Priority, string> = {
  none: "bg-white/10 text-t3",
  low: "bg-blue-500/20 text-blue-400",
  medium: "bg-yellow-500/20 text-yellow-400",
  high: "bg-red-500/20 text-red-400",
};

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

function TodoCard({ todo, onDelete }: { todo: Todo; onDelete: () => void }) {
  const now = useNow(todo.due_date, todo.due_time);
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(todo.text);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) { setVal(todo.text); setTimeout(() => inputRef.current?.select(), 10); }
  }, [editing]);

  const commit = () => {
    const trimmed = val.trim();
    if (trimmed && trimmed !== todo.text) useTodoStore.getState().updateText(todo.id, trimmed);
    setEditing(false);
  };

  return (
    <div
      className="rounded-xl p-3 flex flex-col gap-1.5 cursor-default"
      style={{ background: "var(--c-surface-1)", border: "1px solid var(--c-border)" }}
    >
      <div className="flex items-start justify-between gap-2">
        <button
          onClick={() => useTodoStore.getState().toggle(todo.id)}
          className="mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors"
          style={todo.done ? { background: "var(--c-surface-3)", borderColor: "transparent" } : { borderColor: "var(--c-border)" }}
        >
          {todo.done && <Check size={8} stroke="white" />}
        </button>
        <button
          onClick={onDelete}
          className="text-t5 hover:text-red-400 transition-colors shrink-0"
        >
          <X size={10} />
        </button>
      </div>
      {editing ? (
        <input
          ref={inputRef}
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); commit(); }
            if (e.key === "Escape") setEditing(false);
            e.stopPropagation();
          }}
          className="text-[12px] font-medium text-t1 bg-transparent outline-none border-b leading-snug" style={{ borderColor: "var(--c-border)" }}
        />
      ) : (
        <p
          onDoubleClick={() => setEditing(true)}
          className={`text-[12px] leading-snug font-medium ${todo.done ? "line-through text-t4" : "text-t1"}`}
        >
          {todo.text}
        </p>
      )}
      <div className="flex items-center gap-1.5 flex-wrap mt-auto pt-1">
        {todo.due_date && (() => {
          const cd = formatCountdown(todo.due_date, todo.due_time, now);
          return <span className={`text-[10px] ${cd.overdue && !todo.done ? "text-red-400" : "text-t4"}`}>{cd.label}</span>;
        })()}
        {todo.priority !== "none" && (
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${todo.done ? "bg-t6 text-t4" : PRIORITY_COLOR[todo.priority]}`}>{todo.priority}</span>
        )}
      </div>
    </div>
  );
}

function TodoRow({
  todo,
  focused,
  onFocus,
  onDeleteRequest,
}: {
  todo: Todo;
  focused: boolean;
  onFocus: () => void;
  onDeleteRequest: () => void;
}) {
  const { toggle, setPriority, updateText } = useTodoStore();
  const { density } = useSettingsStore();
  const [showMeta, setShowMeta] = useState(false);
  const [editingText, setEditingText] = useState(false);
  const [editVal, setEditVal] = useState(todo.text);
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

  const cycleP = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      const order: Priority[] = ["none", "low", "medium", "high"];
      const next = order[(order.indexOf(todo.priority) + 1) % order.length];
      setPriority(todo.id, next);
    },
    [todo.id, todo.priority, setPriority]
  );

  return (
    <div
      ref={setNodeRef}
      tabIndex={-1}
      onFocus={onFocus}
      onMouseEnter={() => setShowMeta(true)}
      onMouseLeave={() => setShowMeta(false)}
      style={{
        minHeight: density === "compact" ? 40 : density === "comfortable" ? 64 : 52,
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 50 : "auto",
        background: focused ? "var(--c-surface-2)" : undefined,
      }}
      onContextMenu={(e) => { e.preventDefault(); setMenu({ x: e.clientX, y: e.clientY }); }}
      className={`group relative flex items-center gap-3 px-5 cursor-default transition-colors border-b border-s ${focused ? "" : "hover:bg-s1"}`}
    >
      {menu && (
        <div ref={menuRef} className="fixed z-50 rounded-lg shadow-xl py-1 min-w-[170px]" style={{ left: menu.x, top: menu.y, background: "var(--c-dropdown)", border: "1px solid var(--c-border)" }}>
          <button onClick={() => { setEditingText(true); setMenu(null); }} className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[13px] text-t1 hover:bg-s2 transition-colors">
            <Pencil size={12} className="text-t4" /><span>Edit task</span>
          </button>
          <button onClick={(e) => { cycleP(e); setMenu(null); }} className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[13px] text-t1 hover:bg-s2 transition-colors">
            <span className={`w-2.5 h-2.5 rounded-full ${PRIORITY_DOT[todo.priority]}`} /><span>Cycle priority</span>
          </button>
          <div style={{ height: 1, background: "var(--c-border-subtle)", margin: "4px 0" }} />
          <button onClick={() => { onDeleteRequest(); setMenu(null); }} className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[13px] text-red-400 hover:bg-s2 transition-colors">
            <X size={12} /><span>Delete</span>
          </button>
        </div>
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
        style={todo.done ? { background: "var(--c-surface-3)", borderColor: "transparent" } : { borderColor: "var(--c-border)" }}
      >
        {todo.done && (
          <Check size={8} stroke="white" />
        )}
      </button>

      {/* Text + meta */}
      <div className="flex-1 min-w-0 py-3">
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
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${todo.done ? "bg-t6 text-t4" : PRIORITY_COLOR[todo.priority]}`}>
              {todo.priority}
            </span>
          )}
        </div>
      </div>

    </div>
  );
}

export default function App() {
  const { todos, trash, query, loading, setQuery, load, add, loadTrash, restore, deletePermanently, deleteAllPermanently } = useTodoStore();
  const { reminders: allReminders, add: addReminder, checkDue, trash: reminderTrash, loadTrash: loadReminderTrash, restore: restoreReminder, deletePermanently: deleteReminderPermanently } = useReminderStore();
  const { notes, add: addNote, trash: noteTrash, loadTrash: loadNoteTrash, restore: restoreNote, deletePermanently: deleteNotePermanently } = useNotesStore();
  const { showDoneAtBottom, confirmDelete: settingsConfirmDelete, defaultSort, defaultPriority, reminderInterval, tasksViewMode, set: setSetting, theme } = useSettingsStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const [inputVal, setInputVal] = useState("");
  const [focusedIdx, setFocusedIdx] = useState<number>(-1);
  const [visible, setVisible] = useState(false);
  type View = "main" | "trash" | "reminders" | "guide" | "notes" | "settings";
  type NavView = "main" | "reminders" | "notes" | "settings";
  const [view, setView] = useState<View>("main");
  const [lastNavView, setLastNavView] = useState<NavView>("main");

  const navigate = useCallback((v: View) => {
    if (v === "main" || v === "reminders" || v === "notes" || v === "settings") setLastNavView(v);
    setView(v);
  }, []);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  // Pending modal state: type + text extracted from /tm or /rm
  const [pendingModal, setPendingModal] = useState<{ type: "task" | "reminder"; text: string } | null>(null);
  const [cmdIdx, setCmdIdx] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);
  const [todoFilter, setTodoFilter] = useState<TodoFilter>("all");
  const [todoSort, setTodoSort] = useState<TodoSort>("manual");

  const askConfirm = useCallback((title: string, message: string, onConfirm: () => void) => {
    if (!settingsConfirmDelete) { onConfirm(); return; }
    setConfirmDelete({ title, message, onConfirm });
  }, []);

  const COMMANDS = [
    { prefix: "/tm ", label: "/tm", desc: "Add task with deadline" },
    { prefix: "/rm ", label: "/rm", desc: "Add a reminder" },
    { prefix: "/nt ", label: "/nt", desc: "Create a new note" },
  ];

  const showCmdPalette = inputVal === "/" || inputVal.startsWith("/") && COMMANDS.some(c => c.prefix.startsWith(inputVal));
  const filteredCmds = inputVal === "/" ? COMMANDS : COMMANDS.filter(c => c.prefix.startsWith(inputVal));

  // Apply theme to document root
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  // Load todos on mount + request notification permission early
  useEffect(() => { load(); initNotifications(); }, [load]);

  // Background notification checker — runs every 30s
  useEffect(() => {
    checkDue();
    const interval = setInterval(checkDue, reminderInterval * 1000);
    return () => clearInterval(interval);
  }, [checkDue, reminderInterval]);

  const openTrash = useCallback(() => {
    loadTrash();
    loadReminderTrash();
    loadNoteTrash();
    setSelected(new Set());
    navigate("trash");
  }, [loadTrash, loadReminderTrash, loadNoteTrash]);

  const toggleSelect = useCallback((id: number) => {
    setSelected((s) => {
      const next = new Set(s);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelected(new Set(trash.map((t) => t.id)));
  }, [trash]);

  const deleteSelected = useCallback(async () => {
    if (selected.size === trash.length) {
      await deleteAllPermanently();
    } else {
      for (const id of selected) await deletePermanently(id);
    }
    setSelected(new Set());
  }, [selected, trash.length, deletePermanently, deleteAllPermanently]);

  // Listen for window-shown event to auto-focus input + animate in
  useEffect(() => {
    const unlisten = listen("window-shown", () => {
      setVisible(true);
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
    .filter((t) => query ? t.text.toLowerCase().includes(query.toLowerCase()) : true)
    .filter((t) => {
      if (todoFilter === "active") return !t.done;
      if (todoFilter === "done") return t.done;
      return true;
    })
    .sort((a, b) => {
      if (showDoneAtBottom && a.done !== b.done) return a.done ? 1 : -1;
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
      // Command palette navigation
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
        setFocusedIdx(-1);
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setFocusedIdx((i) => Math.min(i + 1, filtered.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setFocusedIdx((i) => Math.max(i - 1, -1));
        if (focusedIdx <= 0) inputRef.current?.focus();
        return;
      }
      if (e.key === "Escape") {
        getCurrentWindow().hide();
      }
    },
    [inputVal, filtered.length, focusedIdx, query, add, setQuery]
  );

  // Global keydown — Delete focused row, ArrowUp/Down when input not focused
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { getCurrentWindow().hide(); return; }
      if (document.activeElement === inputRef.current) return;
      if (view !== "main") return;
      if (e.key === "Backspace" || e.key === "Delete") {
        const todo = filtered[focusedIdx];
        if (todo) askConfirm("Delete task?", `"${todo.text}" will be moved to trash.`, () => useTodoStore.getState().remove(todo.id));
        return;
      }
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
          if (i <= 0) { inputRef.current?.focus(); return -1; }
          return i - 1;
        });
        return;
      }
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        const tabs: NavView[] = ["main", "reminders", "notes", "settings"];
        const cur = tabs.indexOf(lastNavView);
        const next = e.key === "ArrowRight"
          ? tabs[(cur + 1) % tabs.length]
          : tabs[(cur - 1 + tabs.length) % tabs.length];
        navigate(next);
        return;
      }
      // Any printable char → focus input
      if (e.key.length === 1 && !e.metaKey && !e.ctrlKey) {
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [filtered, focusedIdx, lastNavView]);

  const BackButton = () => (
    <button onClick={() => navigate("main")} className="text-t3 hover:text-t2 transition-colors mr-3">
      <ChevronLeft size={14} />
    </button>
  );

  const VIEW_TITLE: Record<View, string> = { main: "Slate", trash: "Deleted", reminders: "Reminders", guide: "Guide", notes: "Notes", settings: "Settings" };

  return (
    <div
      className={`relative w-full h-full flex flex-col overflow-hidden transition-opacity duration-200 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      {/* Header */}
      <div
        data-tauri-drag-region
        className="flex items-center px-5 shrink-0 select-none cursor-default border-b border-s"
        style={{ height: 38, background: "var(--c-nav)" }}
      >
        {view !== "main" && <BackButton />}
        <span className="text-[11px] font-semibold text-t3 tracking-widest uppercase">{VIEW_TITLE[view]}</span>
        <div className="ml-auto flex items-center gap-3">
          {view === "main" && (
            <div className="group/guide relative">
              <button
                onClick={() => navigate("guide")}
                className="text-t5 hover:text-t2 transition-colors text-[11px] w-4 h-4 rounded-full border flex items-center justify-center"
                style={{ borderColor: "var(--c-border-subtle)" }}
              >
                ?
              </button>
              <span className="pointer-events-none absolute -bottom-7 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded text-[10px] text-t2 whitespace-nowrap opacity-0 group-hover/guide:opacity-100 transition-opacity duration-150" style={{ background: "var(--c-tooltip)", border: "1px solid var(--c-border)" }}>Guide</span>
            </div>
          )}
          {view === "trash" && trash.length > 0 && (
            <>
              <button
                onClick={selected.size === trash.length ? () => setSelected(new Set()) : selectAll}
                className="text-[11px] text-t4 hover:text-t2 transition-colors"
              >
                {selected.size === trash.length ? "Deselect all" : "Select all"}
              </button>
              {selected.size > 0 && (
                <button
                  onClick={() => askConfirm(
                    "Delete selected?",
                    `${selected.size} task${selected.size !== 1 ? "s" : ""} will be permanently deleted.`,
                    deleteSelected
                  )}
                  className="text-[11px] text-red-400/70 hover:text-red-400 transition-colors"
                >
                  Delete {selected.size === trash.length ? "all" : `(${selected.size})`}
                </button>
              )}
            </>
          )}
          {view === "main" && <span className="text-[11px] text-t5">⌥S</span>}
        </div>
      </div>

      {/* Main view: search input + command palette + todo list */}
      {view === "main" && (
        <div key="main" className="view-animate flex flex-col flex-1 overflow-hidden">
          <div className="flex items-center gap-3 px-5 shrink-0 border-b border-s" style={{ height: 48 }}>
            <Search size={15} className="text-t4 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={inputVal}
              onChange={(e) => {
                setInputVal(e.target.value);
                setQuery(e.target.value);
                setFocusedIdx(-1);
                setCmdIdx(0);
              }}
              onKeyDown={handleKeyDown}
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

          {showCmdPalette && filteredCmds.length > 0 && (
            <div className="shrink-0 border-b border-s py-1">
              {filteredCmds.map((cmd, i) => (
                <button
                  key={cmd.prefix}
                  onMouseDown={(e) => { e.preventDefault(); setInputVal(cmd.prefix); setQuery(cmd.prefix); setCmdIdx(i); inputRef.current?.focus(); }}
                  className={`w-full flex items-center gap-3 px-5 py-2 text-left transition-colors ${
                    i === cmdIdx ? "" : "hover:bg-s1"
                  }`}
                  style={i === cmdIdx ? { background: "var(--c-surface-2)" } : {}}
                >
                  <span className="text-[13px] font-mono font-medium text-blue-400">{cmd.label}</span>
                  <span className="text-[12px] text-t3">{cmd.desc}</span>
                  {i === cmdIdx && <span className="ml-auto text-[10px] text-t5">↵ or Tab</span>}
                </button>
              ))}
            </div>
          )}

          <FilterBar
            page="todos"
            filter={todoFilter}
            sort={todoSort}
            viewMode={tasksViewMode}
            onFilter={setTodoFilter}
            onSort={setTodoSort}
            onViewMode={(v) => setSetting("tasksViewMode", v)}
          />

          <div className="overflow-y-auto flex-1 py-1.5">
            {loading ? (
              <div className="px-5 py-10 text-center text-t5 text-sm select-none">Loading…</div>
            ) : filtered.length === 0 ? (
              <div className="px-5 py-10 text-center text-t5 text-sm select-none">
                {query ? `No results for "${query}"` : "No tasks yet — type above and press ↵"}
              </div>
            ) : tasksViewMode === "cards" ? (
              <div className="grid grid-cols-2 gap-2 px-3 py-2">
                {filtered.map((todo) => (
                  <TodoCard
                    key={todo.id}
                    todo={todo}
                    onDelete={() => askConfirm("Delete task?", `"${todo.text}" will be moved to trash.`, () => useTodoStore.getState().remove(todo.id))}
                  />
                ))}
              </div>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={filtered.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                  {filtered.map((todo, i) => (
                    <TodoRow key={todo.id} todo={todo} focused={focusedIdx === i} onFocus={() => setFocusedIdx(i)} onDeleteRequest={() => askConfirm("Delete task?", `"${todo.text}" will be moved to trash.`, () => useTodoStore.getState().remove(todo.id))} />
                  ))}
                </SortableContext>
              </DndContext>
            )}
          </div>
        </div>
      )}

      {/* Trash view */}
      {view === "trash" && (
        <div key="trash" className="view-animate overflow-y-auto flex-1 py-1.5">
          {trash.length === 0 && reminderTrash.length === 0 && noteTrash.length === 0 ? (
            <div className="px-5 py-10 text-center text-t5 text-sm select-none">Trash is empty</div>
          ) : (
            <>
              {trash.map((todo) => (
                <div key={`task-${todo.id}`} className="group flex items-center gap-3 px-5 border-b border-s hover:bg-s1 transition-colors" style={{ minHeight: 48 }}>
                  <button onClick={() => toggleSelect(todo.id)} className="w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors" style={selected.has(todo.id) ? { background: "var(--c-surface-3)", borderColor: "transparent" } : { borderColor: "var(--c-border)" }}>
                    {selected.has(todo.id) && <Check size={8} stroke="white" />}
                  </button>
                  <span className="flex-1 text-[14px] text-t3 line-through truncate">{todo.text}</span>
                  <span className="text-[10px] text-t5 shrink-0">Task</span>
                  <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => restore(todo.id)} title="Restore" className="w-6 h-6 flex items-center justify-center rounded hover:bg-s3 transition-colors text-t4 hover:text-green-400"><RotateCcw size={12} /></button>
                    <button onClick={() => askConfirm("Delete permanently?", "This cannot be undone.", () => deletePermanently(todo.id))} className="w-6 h-6 flex items-center justify-center rounded hover:bg-s3 transition-colors text-t4 hover:text-red-400"><X size={10} /></button>
                  </div>
                </div>
              ))}
              {reminderTrash.map((r) => (
                <div key={`reminder-${r.id}`} className="group flex items-center gap-3 px-5 border-b border-s hover:bg-s1 transition-colors" style={{ minHeight: 48 }}>
                  <span className="flex-1 text-[14px] text-t3 line-through truncate">{r.text}</span>
                  <span className="text-[10px] text-t5 shrink-0">Reminder</span>
                  <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => restoreReminder(r.id)} title="Restore" className="w-6 h-6 flex items-center justify-center rounded hover:bg-s3 transition-colors text-t4 hover:text-green-400"><RotateCcw size={12} /></button>
                    <button onClick={() => askConfirm("Delete permanently?", "This cannot be undone.", () => deleteReminderPermanently(r.id))} className="w-6 h-6 flex items-center justify-center rounded hover:bg-s3 transition-colors text-t4 hover:text-red-400"><X size={10} /></button>
                  </div>
                </div>
              ))}
              {noteTrash.map((n) => (
                <div key={`note-${n.id}`} className="group flex items-center gap-3 px-5 border-b border-s hover:bg-s1 transition-colors" style={{ minHeight: 48 }}>
                  <span className="flex-1 text-[14px] text-t3 line-through truncate">{n.title}</span>
                  <span className="text-[10px] text-t5 shrink-0">Note</span>
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

      {/* Guide view */}
      {view === "guide" && <GuidePage />}

      {/* Notes view */}
      {view === "notes" && <NotesPage onDeleteRequest={(id) => { const n = useNotesStore.getState().notes.find(n => n.id === id); askConfirm("Delete note?", `"${n?.title ?? "This note"}" will be permanently deleted.`, () => useNotesStore.getState().remove(id)); }} />}
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
                : view === "trash"
                ? `${trash.length} deleted`
                : view === "guide"
                ? "Guide"
                : view === "settings"
                ? "Settings"
                : `${todos.filter((t) => !t.done).length} task${todos.filter((t) => !t.done).length !== 1 ? "s" : ""} remaining`}
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
                    background: "var(--c-surface-3)",
                    left: "2px",
                    transform: `translateX(${lastNavView === "main" ? "0px" : lastNavView === "reminders" ? "32px" : lastNavView === "notes" ? "64px" : "96px"})`,
                  }}
                />
                <button
                  onClick={() => navigate("main")}
                  className={`group/btn relative z-10 w-7 h-5 flex items-center justify-center transition-colors duration-200 ${lastNavView === "main" ? "text-t1" : "text-t4 hover:text-t2"}`}
                >
                  <span className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded text-[10px] text-t2 whitespace-nowrap opacity-0 group-hover/btn:opacity-100 transition-opacity duration-150" style={{ background: "var(--c-tooltip)", border: "1px solid var(--c-border)" }}>Tasks</span>
                  <CheckSquare size={14} />
                </button>
                <button
                  onClick={() => navigate("reminders")}
                  className={`group/btn relative z-10 w-7 h-5 flex items-center justify-center transition-colors duration-200 ${lastNavView === "reminders" ? "text-t1" : "text-t4 hover:text-t2"}`}
                >
                  <span className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded text-[10px] text-t2 whitespace-nowrap opacity-0 group-hover/btn:opacity-100 transition-opacity duration-150" style={{ background: "var(--c-tooltip)", border: "1px solid var(--c-border)" }}>Reminders</span>
                  <Clock size={14} />
                </button>
                <button
                  onClick={() => navigate("notes")}
                  className={`group/btn relative z-10 w-7 h-5 flex items-center justify-center transition-colors duration-200 ${lastNavView === "notes" ? "text-t1" : "text-t4 hover:text-t2"}`}
                >
                  <span className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded text-[10px] text-t2 whitespace-nowrap opacity-0 group-hover/btn:opacity-100 transition-opacity duration-150" style={{ background: "var(--c-tooltip)", border: "1px solid var(--c-border)" }}>Notes</span>
                  <FileText size={14} />
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
              {view === "main" && todos.some((t) => t.done) && (
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
              <div className="group/trash relative">
                <button
                  onClick={openTrash}
                  className="w-7 h-5 flex items-center justify-center text-t4 hover:text-t2 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
                <span className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded text-[10px] text-t2 whitespace-nowrap opacity-0 group-hover/trash:opacity-100 transition-opacity duration-150" style={{ background: "var(--c-tooltip)", border: "1px solid var(--c-border)" }}>Deleted</span>
              </div>
            </div>
          </div>
        </>
      )}

      {confirmDelete && (
        <ConfirmDialog
          title={confirmDelete.title}
          message={confirmDelete.message}
          onConfirm={() => { confirmDelete.onConfirm(); setConfirmDelete(null); }}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      {/* Date/time picker modal */}
      {pendingModal && (
        <DateTimeModal
          title={pendingModal.type === "task" ? "Set deadline" : "Set reminder"}
          subtitle={pendingModal.text}
          showDate={true}
          onConfirm={async (datetime) => {
            const snapshot = pendingModal;
            setPendingModal(null);
            setTimeout(() => inputRef.current?.focus(), 50);
            try {
              if (snapshot.type === "task") {
                const date = datetime.split("T")[0];
                const time = datetime.split("T")[1]?.slice(0, 5);
                await useTodoStore.getState().add(snapshot.text);
                const db = await import("./db").then((m) => m.getDb());
                await db.execute(
                  "UPDATE todos SET due_date = ?, due_time = ? WHERE id = (SELECT id FROM todos WHERE text = ? AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 1)",
                  [date, time, snapshot.text]
                );
                await load();
              } else {
                await addReminder(snapshot.text, datetime);
                navigate("reminders");
              }
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
    </div>
  );
}
