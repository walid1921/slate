import { useEffect, useRef, useState, useCallback } from "react";
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
  none: "bg-white/10 text-white/40",
  low: "bg-blue-500/20 text-blue-400",
  medium: "bg-yellow-500/20 text-yellow-400",
  high: "bg-red-500/20 text-red-400",
};

const PRIORITY_DOT: Record<Priority, string> = {
  none: "bg-white/20",
  low: "bg-blue-400",
  medium: "bg-yellow-400",
  high: "bg-red-400",
};

function isOverdue(due: string | null): boolean {
  if (!due) return false;
  return new Date(due) < new Date(new Date().toDateString());
}

function formatDue(due: string | null): string {
  if (!due) return "";
  const d = new Date(due);
  const today = new Date(new Date().toDateString());
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return "today";
  if (diff === 1) return "tomorrow";
  if (diff === -1) return "yesterday";
  if (diff < 0) return `${Math.abs(diff)}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
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
  const { toggle, setPriority, setDueDate } = useTodoStore();
  const [showMeta, setShowMeta] = useState(false);
  const [editingDate, setEditingDate] = useState(false);
  const dateRef = useRef<HTMLInputElement>(null);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: todo.id });

  useEffect(() => {
    if (editingDate && dateRef.current) dateRef.current.focus();
  }, [editingDate]);

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
        minHeight: 52,
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 50 : "auto",
      }}
      className={`group flex items-center gap-3 px-5 cursor-default transition-colors rounded-lg mx-1.5 ${
        focused ? "bg-white/[0.07]" : "hover:bg-white/[0.04]"
      }`}
    >
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className={`shrink-0 cursor-grab active:cursor-grabbing text-white/20 hover:text-white/50 transition-opacity ${
          showMeta || focused ? "opacity-100" : "opacity-0"
        }`}
      >
        <svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor">
          <circle cx="3" cy="2.5" r="1.2" /><circle cx="7" cy="2.5" r="1.2" />
          <circle cx="3" cy="7" r="1.2" /><circle cx="7" cy="7" r="1.2" />
          <circle cx="3" cy="11.5" r="1.2" /><circle cx="7" cy="11.5" r="1.2" />
        </svg>
      </div>

      {/* Checkbox */}
      <button
        onClick={() => toggle(todo.id)}
        className="mt-0.5 w-4 h-4 rounded-full border border-white/20 flex items-center justify-center shrink-0 transition-colors hover:border-white/50"
        style={todo.done ? { background: "rgba(255,255,255,0.15)", borderColor: "transparent" } : {}}
      >
        {todo.done && (
          <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
            <path d="M1 4l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      {/* Text + meta */}
      <div className="flex-1 min-w-0 py-3">
        <span
          className={`text-[14px] leading-snug block truncate transition-colors ${
            todo.done ? "line-through text-white/25" : "text-white/88"
          }`}
        >
          {todo.text}
        </span>

        {/* Due date / priority row */}
        <div className="flex items-center gap-2 mt-0.5">
          {todo.due_date && (
            <span
              className={`text-xs ${
                isOverdue(todo.due_date) && !todo.done ? "text-red-400" : "text-white/35"
              }`}
            >
              {formatDue(todo.due_date)}
              {todo.due_time && (
                <span className="ml-1 opacity-70">
                  {new Date(`2000-01-01T${todo.due_time}`).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                </span>
              )}
            </span>
          )}
          {todo.priority !== "none" && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${PRIORITY_COLOR[todo.priority]}`}>
              {todo.priority}
            </span>
          )}
        </div>
      </div>

      {/* Action buttons — appear on hover / focus */}
      <div
        className={`flex items-center gap-1 shrink-0 transition-opacity ${
          showMeta || focused ? "opacity-100" : "opacity-0"
        }`}
      >
        {/* Priority cycle */}
        <button
          onClick={cycleP}
          title="Cycle priority"
          className="w-5 h-5 flex items-center justify-center rounded hover:bg-white/10 transition-colors"
        >
          <span className={`w-2 h-2 rounded-full ${PRIORITY_DOT[todo.priority]}`} />
        </button>

        {/* Due date */}
        <button
          onClick={(e) => { e.stopPropagation(); setEditingDate(true); }}
          title="Set due date"
          className="w-5 h-5 flex items-center justify-center rounded hover:bg-white/10 transition-colors text-white/30 hover:text-white/60 text-[11px]"
        >
          {editingDate ? (
            <input
              ref={dateRef}
              type="date"
              defaultValue={todo.due_date ?? ""}
              className="absolute opacity-0 pointer-events-none w-0"
              onChange={(e) => {
                setDueDate(todo.id, e.target.value || null);
                setEditingDate(false);
              }}
              onBlur={() => setEditingDate(false)}
            />
          ) : null}
          📅
        </button>

        {/* Delete */}
        <button
          onClick={(e) => { e.stopPropagation(); onDeleteRequest(); }}
          title="Delete"
          className="w-5 h-5 flex items-center justify-center rounded hover:bg-white/10 transition-colors text-white/30 hover:text-red-400"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M2 2l6 6M8 2l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const { todos, trash, query, loading, setQuery, load, add, loadTrash, restore, deletePermanently, deleteAllPermanently } = useTodoStore();
  const { reminders: allReminders, add: addReminder, checkDue } = useReminderStore();
  const { notes, add: addNote } = useNotesStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const [inputVal, setInputVal] = useState("");
  const [focusedIdx, setFocusedIdx] = useState<number>(-1);
  const [visible, setVisible] = useState(false);
  type View = "main" | "trash" | "reminders" | "guide" | "notes";
  const [view, setView] = useState<View>("main");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  // Pending modal state: type + text extracted from /tm or /rm
  const [pendingModal, setPendingModal] = useState<{ type: "task" | "reminder"; text: string } | null>(null);
  const [cmdIdx, setCmdIdx] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);

  const askConfirm = useCallback((title: string, message: string, onConfirm: () => void) => {
    setConfirmDelete({ title, message, onConfirm });
  }, []);

  const COMMANDS = [
    { prefix: "/tm ", label: "/tm", desc: "Add task with deadline" },
    { prefix: "/rm ", label: "/rm", desc: "Add a reminder" },
    { prefix: "/nt ", label: "/nt", desc: "Create a new note" },
  ];

  const showCmdPalette = inputVal === "/" || inputVal.startsWith("/") && COMMANDS.some(c => c.prefix.startsWith(inputVal));
  const filteredCmds = inputVal === "/" ? COMMANDS : COMMANDS.filter(c => c.prefix.startsWith(inputVal));

  // Load todos on mount + request notification permission early
  useEffect(() => { load(); initNotifications(); }, [load]);

  // Background notification checker — runs every 30s
  useEffect(() => {
    checkDue();
    const interval = setInterval(checkDue, 30_000);
    return () => clearInterval(interval);
  }, [checkDue]);

  const openTrash = useCallback(() => {
    loadTrash();
    setSelected(new Set());
    setView("trash");
  }, [loadTrash]);

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

  const filtered = todos.filter((t) =>
    query ? t.text.toLowerCase().includes(query.toLowerCase()) : true
  );

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
        if (e.key === "Escape") { setInputVal(""); setQuery(""); return; }
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
          setView("notes");
          setInputVal("");
          setQuery("");
          return;
        }
        add(val);
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
      if (document.activeElement === inputRef.current) return;
      if (e.key === "Escape") { getCurrentWindow().hide(); return; }
      if (e.key === "Backspace" || e.key === "Delete") {
        const todo = filtered[focusedIdx];
        if (todo) useTodoStore.getState().remove(todo.id);
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
      // Any printable char → focus input
      if (e.key.length === 1 && !e.metaKey && !e.ctrlKey) {
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [filtered, focusedIdx]);

  const BackButton = () => (
    <button onClick={() => setView("main")} className="text-white/40 hover:text-white/70 transition-colors mr-3">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );

  const VIEW_TITLE: Record<View, string> = { main: "Slate", trash: "Trash", reminders: "Reminders", guide: "Guide", notes: "Notes" };

  return (
    <div
      className={`relative w-full h-full flex flex-col overflow-hidden transition-opacity duration-200 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      {/* Header */}
      <div
        data-tauri-drag-region
        className="flex items-center px-5 shrink-0 select-none cursor-default border-b border-white/[0.06]"
        style={{ height: 38 }}
      >
        {view !== "main" && <BackButton />}
        <span className="text-[11px] font-semibold text-white/40 tracking-widest uppercase">{VIEW_TITLE[view]}</span>
        <div className="ml-auto flex items-center gap-3">
          {view === "main" && (
            <button
              onClick={() => setView("guide")}
              className="text-white/20 hover:text-white/50 transition-colors text-[11px] w-4 h-4 rounded-full border border-white/15 flex items-center justify-center hover:border-white/35"
            >
              ?
            </button>
          )}
          {view === "trash" && trash.length > 0 && (
            <>
              <button
                onClick={selected.size === trash.length ? () => setSelected(new Set()) : selectAll}
                className="text-[11px] text-white/35 hover:text-white/60 transition-colors"
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
          {view === "main" && <span className="text-[11px] text-white/20">⌥S</span>}
        </div>
      </div>

      {/* Main view: search input + command palette + todo list */}
      {view === "main" && (
        <div key="main" className="view-animate flex flex-col flex-1 overflow-hidden">
          <div className="flex items-center gap-3 px-5 shrink-0 border-b border-white/[0.06]" style={{ height: 48 }}>
            <svg className="text-white/30 shrink-0" width="15" height="15" viewBox="0 0 15 15" fill="none">
              <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.5" />
              <path d="M11 11l2.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
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
              className="flex-1 bg-transparent text-white/88 placeholder-white/25 text-sm outline-none"
            />
            {inputVal && (
              <button
                onClick={() => { setInputVal(""); setQuery(""); inputRef.current?.focus(); }}
                className="text-white/25 hover:text-white/50 transition-colors text-xs shrink-0"
              >
                ✕
              </button>
            )}
          </div>

          {showCmdPalette && filteredCmds.length > 0 && (
            <div className="shrink-0 border-b border-white/[0.06] py-1">
              {filteredCmds.map((cmd, i) => (
                <button
                  key={cmd.prefix}
                  onMouseDown={(e) => { e.preventDefault(); setInputVal(cmd.prefix); setQuery(cmd.prefix); setCmdIdx(i); inputRef.current?.focus(); }}
                  className={`w-full flex items-center gap-3 px-5 py-2 text-left transition-colors ${
                    i === cmdIdx ? "bg-white/[0.07]" : "hover:bg-white/[0.04]"
                  }`}
                >
                  <span className="text-[13px] font-mono font-medium text-blue-400">{cmd.label}</span>
                  <span className="text-[12px] text-white/40">{cmd.desc}</span>
                  {i === cmdIdx && <span className="ml-auto text-[10px] text-white/20">↵ or Tab</span>}
                </button>
              ))}
            </div>
          )}

          <div className="overflow-y-auto flex-1 py-1.5">
            {loading ? (
              <div className="px-5 py-10 text-center text-white/20 text-sm select-none">Loading…</div>
            ) : filtered.length === 0 ? (
              <div className="px-5 py-10 text-center text-white/20 text-sm select-none">
                {query ? `No results for "${query}"` : "No tasks yet — type above and press ↵"}
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
          {trash.length === 0 ? (
            <div className="px-5 py-10 text-center text-white/20 text-sm select-none">Trash is empty</div>
          ) : (
            trash.map((todo) => (
              <div
                key={todo.id}
                className="flex items-center gap-3 px-5 rounded-lg mx-1.5 hover:bg-white/[0.04] transition-colors"
                style={{ minHeight: 48 }}
              >
                <button
                  onClick={() => toggleSelect(todo.id)}
                  className="w-4 h-4 rounded border border-white/20 flex items-center justify-center shrink-0 transition-colors hover:border-white/50"
                  style={selected.has(todo.id) ? { background: "rgba(255,255,255,0.15)", borderColor: "transparent" } : {}}
                >
                  {selected.has(todo.id) && (
                    <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                      <path d="M1 4l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>
                <span className="flex-1 text-[14px] text-white/40 line-through truncate">{todo.text}</span>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => restore(todo.id)} title="Restore" className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/10 transition-colors text-white/30 hover:text-green-400">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6a4 4 0 1 0 1-2.5L1 2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M1 2v2.5h2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  <button onClick={() => askConfirm("Delete permanently?", "This cannot be undone.", () => deletePermanently(todo.id))} title="Delete permanently" className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/10 transition-colors text-white/30 hover:text-red-400">
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M2 2l6 6M8 2l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Reminders view */}
      {view === "reminders" && <RemindersPage key="reminders" onDeleteRequest={(id) => askConfirm("Delete reminder?", "This reminder will be deleted.", () => useReminderStore.getState().remove(id))} />}

      {/* Guide view */}
      {view === "guide" && <GuidePage />}

      {/* Notes view */}
      {view === "notes" && <NotesPage onDeleteRequest={(id) => askConfirm("Delete note?", "This note will be permanently deleted.", () => useNotesStore.getState().remove(id))} />}

      {/* Footer — all views */}
      {true && (
        <>
          <div className="shrink-0 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
          <div data-tauri-drag-region className="flex items-center px-5 shrink-0 select-none" style={{ height: 36 }}>
            <span className="text-[11px] text-white/25">
              {view === "reminders"
                ? `${allReminders.filter((r) => !r.notified).length} upcoming`
                : view === "notes"
                ? `${notes.length} note${notes.length !== 1 ? "s" : ""}`
                : view === "trash"
                ? `${trash.length} deleted`
                : view === "guide"
                ? "Guide"
                : `${todos.filter((t) => !t.done).length} task${todos.filter((t) => !t.done).length !== 1 ? "s" : ""} remaining`}
            </span>
            <div className="absolute left-1/2 -translate-x-1/2">
              <div
                className="relative flex items-center gap-1 px-0.5 py-0.5"
                style={{ borderRadius: 6, background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.09)" }}
              >
                {/* Sliding active indicator */}
                <div
                  className="absolute top-0.5 h-5 w-7 transition-transform duration-200 ease-out"
                  style={{
                    borderRadius: 5,
                    background: "rgba(255,255,255,0.12)",
                    left: "2px",
                    transform: `translateX(${view === "main" ? "0px" : view === "reminders" ? "32px" : "64px"})`,
                  }}
                />
                <button
                  onClick={() => setView("main")}
                  className={`group/btn relative z-10 w-7 h-5 flex items-center justify-center transition-colors duration-200 ${view === "main" ? "text-white/80" : "text-white/30 hover:text-white/55"}`}
                >
                  <span className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded text-[10px] text-white/70 whitespace-nowrap opacity-0 group-hover/btn:opacity-100 transition-opacity duration-150" style={{ background: "rgba(30,30,34,0.95)", border: "1px solid rgba(255,255,255,0.08)" }}>Tasks</span>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <rect x="1" y="2" width="12" height="1.5" rx="0.75" fill="currentColor" />
                    <rect x="1" y="6" width="12" height="1.5" rx="0.75" fill="currentColor" />
                    <rect x="1" y="10" width="12" height="1.5" rx="0.75" fill="currentColor" />
                  </svg>
                </button>
                <button
                  onClick={() => setView("reminders")}
                  className={`group/btn relative z-10 w-7 h-5 flex items-center justify-center transition-colors duration-200 ${view === "reminders" ? "text-white/80" : "text-white/30 hover:text-white/55"}`}
                >
                  <span className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded text-[10px] text-white/70 whitespace-nowrap opacity-0 group-hover/btn:opacity-100 transition-opacity duration-150" style={{ background: "rgba(30,30,34,0.95)", border: "1px solid rgba(255,255,255,0.08)" }}>Reminders</span>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.3" />
                    <path d="M7 4v3.2l2 2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                <button
                  onClick={() => setView("notes")}
                  className={`group/btn relative z-10 w-7 h-5 flex items-center justify-center transition-colors duration-200 ${view === "notes" ? "text-white/80" : "text-white/30 hover:text-white/55"}`}
                >
                  <span className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded text-[10px] text-white/70 whitespace-nowrap opacity-0 group-hover/btn:opacity-100 transition-opacity duration-150" style={{ background: "rgba(30,30,34,0.95)", border: "1px solid rgba(255,255,255,0.08)" }}>Notes</span>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <rect x="2" y="1" width="10" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
                    <path d="M4.5 5h5M4.5 7.5h5M4.5 10h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="ml-auto">
              <button
                onClick={openTrash}
                title="Trash"
                className="flex items-center gap-1.5 text-white/25 hover:text-white/50 transition-colors"
              >
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                  <circle cx="6.5" cy="6.5" r="5.5" stroke="currentColor" strokeWidth="1.2" />
                  <path d="M6.5 3.5v3l2 1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M2.5 2L1 0.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                  <path d="M1 0.5h2.5v2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="text-[11px]">Trash</span>
              </button>
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
