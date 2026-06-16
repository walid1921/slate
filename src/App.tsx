import { useEffect, useRef, useState, useCallback } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { listen } from "@tauri-apps/api/event";
import { useTodoStore, Priority, Todo } from "./store";

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
}: {
  todo: Todo;
  focused: boolean;
  onFocus: () => void;
}) {
  const { toggle, remove, setPriority, setDueDate } = useTodoStore();
  const [showMeta, setShowMeta] = useState(false);
  const [editingDate, setEditingDate] = useState(false);
  const dateRef = useRef<HTMLInputElement>(null);

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
      tabIndex={-1}
      onFocus={onFocus}
      onMouseEnter={() => setShowMeta(true)}
      onMouseLeave={() => setShowMeta(false)}
      className={`group flex items-center gap-3 px-5 cursor-default transition-colors rounded-lg mx-1.5 ${
        focused ? "bg-white/[0.07]" : "hover:bg-white/[0.04]"
      }`}
      style={{ minHeight: 52 }}
    >
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
                isOverdue(todo.due_date) && !todo.done
                  ? "text-red-400"
                  : "text-white/35"
              }`}
            >
              {formatDue(todo.due_date)}
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
          onClick={(e) => { e.stopPropagation(); remove(todo.id); }}
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
  const { todos, query, loading, setQuery, load, add } = useTodoStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const [inputVal, setInputVal] = useState("");
  const [focusedIdx, setFocusedIdx] = useState<number>(-1);
  const [visible, setVisible] = useState(false);

  // Load todos on mount
  useEffect(() => {
    load();
  }, [load]);

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

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && inputVal.trim()) {
        add(inputVal.trim());
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

  return (
    <div
      className={`w-full h-full flex flex-col overflow-hidden transition-opacity duration-200 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      {/* Header drag region */}
      <div
        data-tauri-drag-region
        className="flex items-center px-5 shrink-0 select-none cursor-default border-b border-white/[0.06]"
        style={{ height: 38 }}
      >
        <span className="text-[11px] font-semibold text-white/40 tracking-widest uppercase">Slate</span>
        <span className="ml-auto text-[11px] text-white/20">⌥S</span>
      </div>

      {/* Search / add input */}
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
          }}
          onKeyDown={handleKeyDown}
          placeholder="Search or add a task…"
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

      {/* Divider */}
      <div className="shrink-0 h-px mx-0" style={{ background: "rgba(255,255,255,0.06)" }} />

      {/* Todo list */}
      <div className="overflow-y-auto flex-1 py-1.5">
        {loading ? (
          <div className="px-5 py-10 text-center text-white/20 text-sm select-none">
            Loading…
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-5 py-10 text-center text-white/20 text-sm select-none">
            {query ? `No results for "${query}"` : "No tasks yet — type above and press ↵"}
          </div>
        ) : (
          filtered.map((todo, i) => (
            <TodoRow
              key={todo.id}
              todo={todo}
              focused={focusedIdx === i}
              onFocus={() => setFocusedIdx(i)}
            />
          ))
        )}
      </div>

      {/* Footer */}
      <div className="shrink-0 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
      <div
        data-tauri-drag-region
        className="flex items-center px-5 shrink-0 select-none"
        style={{ height: 36 }}
      >
        <span className="text-[11px] text-white/25">
          {todos.filter((t) => !t.done).length} task{todos.filter((t) => !t.done).length !== 1 ? "s" : ""} remaining
        </span>
        <span className="ml-auto text-[11px] text-white/15">↑↓ · ␣ toggle · ⌫ delete · ⎋ close</span>
      </div>
    </div>
  );
}
