import { useEffect, useRef, useState, useCallback } from "react";
import {
  GripVertical,
  Check,
  Pencil,
  X,
  RotateCcw,
  ChevronLeft,
  Home,
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
import AddReminderModal from "./components/AddReminderModal";
import RemindersPage from "./components/RemindersPage";
import NotesPage from "./components/NotesPage";
import ConfirmDialog from "./components/ConfirmDialog";
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
  const { toggle, setPriority, updateText } = useTodoStore();
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

export default function App() {
  const { todos, trash, loading, load, add, loadTrash, restore, deletePermanently, deleteAllPermanently, checkDueTodos, hasUnread: todoHasUnread, clearUnread: clearTodoUnread, setQuery } = useTodoStore();
  const { reminders: allReminders, checkDue, trash: reminderTrash, loadTrash: loadReminderTrash, restore: restoreReminder, deletePermanently: deleteReminderPermanently, hasUnread: reminderHasUnread, clearUnread: clearReminderUnread } = useReminderStore();
  const { notes, add: addNote, trash: noteTrash, loadTrash: loadNoteTrash, restore: restoreNote, deletePermanently: deleteNotePermanently } = useNotesStore();
  const { defaultSort, defaultPriority, theme, textSize, windowMode } = useSettingsStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const [inputVal, setInputVal] = useState("");
  const [focusedIdx, setFocusedIdx] = useState<number>(-1);
  const [visible, setVisible] = useState(false);
  const [preTrashView, setPreTrashView] = useState<View>("main");
  type View = "main" | "todos" | "trash" | "reminders" | "notes" | "settings";
  type NavView = "main" | "todos" | "reminders" | "notes" | "settings";
  const [view, setView] = useState<View>("main");
  const [lastNavView, setLastNavView] = useState<NavView>("main");

  const navigate = useCallback((v: View) => {
    if (v === "main" || v === "todos" || v === "reminders" || v === "notes" || v === "settings") setLastNavView(v);
    setView(v);
  }, []);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [pendingModal, setPendingModal] = useState<{ type: "task" | "reminder"; text: string } | null>(null);
  const [cmdIdx, setCmdIdx] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState<{ title: string; message: string; onConfirm: () => void; confirmLabel?: string; confirmClassName?: string } | null>(null);
  const [todoFilter, setTodoFilter] = useState<TodoFilter>("all");
  const [todoSort, setTodoSort] = useState<TodoSort>("manual");
  const [selectedTodoId, setSelectedTodoId] = useState<number | null>(null);
  const [inputFocused, setInputFocused] = useState(false);

  const askConfirm = useCallback((title: string, message: string, onConfirm: () => void, confirmLabel?: string, confirmClassName?: string) => {
    setConfirmDelete({ title, message, onConfirm, confirmLabel, confirmClassName });
  }, []);

  const COMMANDS = [
    { prefix: "/tm ", label: "/tm", desc: "Add task with deadline" },
    { prefix: "/rm ", label: "/rm", desc: "Add a reminder" },
    { prefix: "/nt ", label: "/nt", desc: "Create a new note" },
  ];

  const showCmdPalette = inputVal === "/" || (inputVal.startsWith("/") && COMMANDS.some(c => c.prefix.startsWith(inputVal)));
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
  useEffect(() => { load(); initNotifications(); }, [load]);

  // Background notification checker — runs every 30s
  useEffect(() => {
    checkDue();
    checkDueTodos();
    const interval = setInterval(() => { checkDue(); checkDueTodos(); }, 30_000);
    return () => clearInterval(interval);
  }, [checkDue, checkDueTodos]);

  const openTrash = useCallback(() => {
    setPreTrashView(view);
    loadTrash();
    loadReminderTrash();
    loadNoteTrash();
    setSelected(new Set());
    navigate("trash");
  }, [view, loadTrash, loadReminderTrash, loadNoteTrash]);

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
      if (e.key === "Escape") { getCurrentWindow().hide(); return; }
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        const tabs: NavView[] = ["main", "todos", "reminders", "notes", "settings"];
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
  }, [filtered, focusedIdx, lastNavView, view]);

  const BackButton = () => (
    <button onClick={() => navigate(preTrashView)} className="text-t3 hover:text-t2 transition-colors mr-3">
      <ChevronLeft size={14} />
    </button>
  );

  const VIEW_TITLE: Record<View, string> = { main: "Slate", todos: "Tasks", trash: "Deleted", reminders: "Reminders", notes: "Notes", settings: "Settings" };

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

          {showCmdPalette && filteredCmds.length > 0 && (
            <div className="absolute left-0 right-0 z-50 py-1" style={{ top: 48, background: "var(--c-surface-1)", borderBottom: "1px solid var(--c-border-subtle)" }}>
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

          <div className="flex-1 flex flex-col items-center justify-center gap-4 select-none">
            <p className="text-t5 text-xs">Type a task and press ↵</p>
            <div className="flex flex-col gap-1.5">
              {[
                { cmd: "/tm", desc: "Add task with deadline" },
                { cmd: "/rm", desc: "Add a reminder" },
                { cmd: "/nt", desc: "Create a new note" },
              ].map(({ cmd, desc }) => (
                <div key={cmd} className="flex items-center gap-3">
                  <span className="text-[12px] font-mono font-medium text-blue-400 w-10 text-right">{cmd}</span>
                  <span className="text-[12px] text-t5">{desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Todos view — task list */}
      {view === "todos" && (
        <div key="todos" className="view-animate flex flex-col flex-1 overflow-hidden">
          <FilterBar
            page="todos"
            filter={todoFilter}
            sort={todoSort}
            onFilter={setTodoFilter}
            onSort={setTodoSort}
          />
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
                    background: lastNavView === "todos" ? "rgba(59,130,246,0.15)" : lastNavView === "reminders" ? "rgba(99,102,241,0.15)" : lastNavView === "notes" ? "rgba(16,185,129,0.15)" : "var(--c-surface-3)",
                    left: "2px",
                    transform: `translateX(${lastNavView === "main" ? "0px" : lastNavView === "todos" ? "32px" : lastNavView === "reminders" ? "64px" : lastNavView === "notes" ? "96px" : "128px"})`,
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
          onConfirm={async (datetime) => {
            const snapshot = pendingModal;
            setPendingModal(null);
            setTimeout(() => inputRef.current?.focus(), 50);
            try {
              const date = datetime.split("T")[0];
              const time = datetime.split("T")[1]?.slice(0, 5);
              await useTodoStore.getState().add(snapshot.text);
              const db = await import("./db").then((m) => m.getDb());
              await db.execute(
                "UPDATE todos SET due_date = ?, due_time = ? WHERE id = (SELECT id FROM todos WHERE text = ? AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 1)",
                [date, time, snapshot.text]
              );
              await load();
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
            navigate("reminders");
          }}
        />
      )}

    </div>
    </div>
  );
}
