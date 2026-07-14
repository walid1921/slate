import { useEffect, useRef, useState, useCallback } from "react";
import {
  Check,
  X,
  Plus,
  RotateCcw,
  ChevronLeft,
  Home,
  CheckSquare,
  Clock,
  FileText,
  Settings as SettingsIcon,
  ChevronDown,
  Trash2,
  CheckCheck,
  Zap,
  CalendarDays,
  BookOpen,
  FolderPlus,
  Pencil,
  Play,
  Pause,
  ChevronRight,
  Eye,
  EyeOff,
  Flag,
  Timer,
  Code2,
  Search,
  ImagePlus,
  Images,
  Bell,
  Sparkles,
  Rows2,
  GripVertical,
} from "lucide-react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { invoke } from "@tauri-apps/api/core";
import { open as openFileDialog } from "@tauri-apps/plugin-dialog";
import { readFile } from "@tauri-apps/plugin-fs";
import { saveImageToDir, deleteImageFile, imageToDataUrl, migrateImagesToFilesystem } from "./images";
import { listen } from "@tauri-apps/api/event";
import { useTodoStore, Priority, Todo, TaskCategory, TodoStatus, SubTask } from "./store";
import { useReminderStore } from "./reminderStore";
import { useNotesStore } from "./notesStore";
import { initNotifications, notify } from "./notifications";
import DateTimeModal from "./components/DateTimeModal";
import AddReminderModal from "./components/AddReminderModal";
import AITaskReviewModal from "./components/AITaskReviewModal";
import AISubtasksModal from "./components/AISubtasksModal";
import IdleBanner from "./components/IdleBanner";
import AutoStopOverlay from "./components/AutoStopOverlay";
import RemindersPage from "./components/RemindersPage";
import NotesPage from "./components/NotesPage";
import IHKPage from "./components/IHKPage";
import SearchModal from "./components/SearchModal";
import { useIHKStore } from "./ihkStore";
import ConfirmDialog from "./components/ConfirmDialog";
import ActivityHeatmap from "./components/ActivityHeatmap";
import { logActivity } from "./activity";
import { TodoFilter, TodoSort } from "./components/FilterBar";
import SettingsPage from "./components/SettingsPage";
import DevPage from "./components/DevPage";
import RichTextEditor from "./components/RichTextEditor";
import { useDevStore } from "./devStore";
import { IconDisplay } from "./components/IconPicker";
import CategoryModal from "./components/CategoryModal";
import ReminderAlert from "./components/ReminderAlert";
import { useSettingsStore } from "./settingsStore";
import { useToastStore } from "./toastStore";
import { Toast } from "./components/Toast";
import { useTimerStore, fmtDuration, fmtElapsed, sessionDurationMs, totalDurationMs } from "./timerStore";
import logoMarkLight from "./assets/logo-light.png";
import logoMarkDark from "./assets/logo-dark.png";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  useDroppable,
  useDndContext,
  type CollisionDetection,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  horizontalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";





function buildDueDate(dueDate: string, dueTime: string | null): Date {
  return dueTime ? new Date(`${dueDate}T${dueTime}`) : new Date(`${dueDate}T23:59:59`);
}

type Urgency = "normal" | "warning" | "critical" | "overdue";
function formatCountdown(dueDate: string, dueTime: string | null, now: Date): { label: string; overdue: boolean; urgency: Urgency } {
  const target = buildDueDate(dueDate, dueTime);
  const diffMs = target.getTime() - now.getTime();
  const overdue = diffMs < 0;
  const abs = Math.abs(diffMs);
  const totalSecs = Math.floor(abs / 1000);
  const days = Math.floor(totalSecs / 86400);
  const months = Math.floor(days / 30);
  if (overdue) {
    const d = target;
    const dateStr = d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
    const timeStr = dueTime ? ` ${dueTime}` : "";
    return { label: `overdue · ${dateStr}${timeStr}`, overdue: true, urgency: "overdue" };
  }
  const HOUR = 3600 * 1000;
  const urgency: Urgency = diffMs < 2 * HOUR ? "critical" : diffMs < 24 * HOUR ? "warning" : "normal";
  if (months >= 2) return { label: `${months}mo`, overdue: false, urgency };
  if (days >= 2) return { label: `${days}d`, overdue: false, urgency };
  if (days === 1) return { label: "tomorrow", overdue: false, urgency };
  const hours = Math.floor(totalSecs / 3600) % 24;
  const mins = Math.floor(totalSecs / 60) % 60;
  const secs = totalSecs % 60;
  if (hours > 0) return { label: `${hours}h ${mins}m`, overdue: false, urgency };
  if (mins > 0) return { label: `${mins}m ${secs}s`, overdue: false, urgency };
  return { label: totalSecs <= 0 ? "now" : `${secs}s`, overdue: false, urgency };
}

function useNow(dueDate: string | null, dueTime: string | null): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    if (!dueDate) return;
    const target = buildDueDate(dueDate, dueTime);
    const absDiff = Math.abs(target.getTime() - Date.now());
    const interval = absDiff < 3_600_000 ? 1000 : 60_000;
    const id = setInterval(() => setNow(new Date()), interval);
    return () => clearInterval(id);
  }, [dueDate, dueTime]);
  return now;
}

import { GlobalTooltip, Tooltip, TipBtn } from "./components/Tooltip";
import { runAutoBackup } from "./backup";

function TaskTitleInput({ todo }: { todo: Todo }) {
  const { updateText } = useTodoStore();
  const [title, setTitle] = useState(todo.text);
  useEffect(() => { setTitle(todo.text); }, [todo.id, todo.text]);
  const save = () => { if (title.trim() && title.trim() !== todo.text) updateText(todo.id, title.trim()); };
  return (
    <input
      value={title}
      onChange={e => setTitle(e.target.value)}
      onBlur={save}
      onKeyDown={e => { if (e.key === "Enter") { save(); e.currentTarget.blur(); } }}
      className="flex-1 text-[13px] font-semibold text-t1 bg-transparent outline-none min-w-0"
      placeholder="Task title"
    />
  );
}

function GroupInput({ value, onChange, categoryId }: { value: string | null; onChange: (v: string | null) => void; categoryId?: number }) {
  const allTodos = useTodoStore(s => s.todos);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scopedTodos = categoryId != null ? allTodos.filter(t => t.category_id === categoryId) : allTodos;
  const existingGroups = Array.from(new Set(scopedTodos.map(t => t.group_name).filter(Boolean) as string[])).sort();
  const filtered = draft.trim()
    ? existingGroups.filter(g => g.toLowerCase().includes(draft.toLowerCase()))
    : existingGroups;
  const showCreate = draft.trim() !== "" && !existingGroups.some(g => g.toLowerCase() === draft.trim().toLowerCase());

  useEffect(() => {
    if (!open) return;
    setTimeout(() => inputRef.current?.focus(), 30);
    const handler = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const select = (name: string | null) => { onChange(name); setOpen(false); setDraft(""); };

  const color = value ? getGroupColor(value) : undefined;

  return (
    <div className="relative">
      <button
        onClick={() => { setDraft(""); setOpen(o => !o); }}
        className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] transition-colors hover:bg-s2"
        style={{ color: color ?? "var(--c-text-4)" }}
      >
        <span>{value ?? "—"}</span>
        <ChevronDown size={9} style={{ opacity: 0.5 }} />
      </button>

      {open && (
        <div
          ref={menuRef}
          className="dropdown absolute right-0 top-full mt-1 rounded-lg shadow-xl py-1 z-50"
          style={{ minWidth: 180, border: "1px solid var(--c-border)" }}
        >
          {/* Search / create input */}
          <div className="px-2 pb-1">
            <input
              ref={inputRef}
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && draft.trim()) { e.preventDefault(); select(draft.trim()); }
                if (e.key === "Escape") setOpen(false);
              }}
              placeholder="Search or create…"
              className="w-full px-2 py-1 rounded text-[11px] text-t2 outline-none"
              style={{ background: "var(--c-surface-2)", border: "1px solid var(--c-border)" }}
            />
          </div>

          {/* Existing groups */}
          {filtered.map(g => {
            const c = getGroupColor(g);
            const isActive = g === value;
            return (
              <button
                key={g}
                onMouseDown={e => { e.preventDefault(); select(g); }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] text-left transition-colors hover:bg-s2"
                style={{ color: isActive ? c : "var(--c-text-2)" }}
              >
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: c }} />
                <span className="truncate">{g}</span>
                {isActive && <Check size={10} className="ml-auto shrink-0" />}
              </button>
            );
          })}

          {/* Create new */}
          {showCreate && (
            <button
              onMouseDown={e => { e.preventDefault(); select(draft.trim()); }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] transition-colors hover:bg-s2"
              style={{ color: "var(--c-text-3)" }}
            >
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: getGroupColor(draft.trim()) }} />
              <span className="truncate" style={{ color: getGroupColor(draft.trim()) }}>{draft.trim()}</span>
              <span className="text-[10px] px-1 rounded ml-auto shrink-0" style={{ background: "var(--c-surface-3)", color: "var(--c-text-4)" }}>new</span>
            </button>
          )}

          {/* Remove */}
          {value && (
            <>
              <div style={{ height: 1, background: "var(--c-border-subtle)", margin: "4px 0" }} />
              <button
                onMouseDown={e => { e.preventDefault(); select(null); }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] text-t4 hover:bg-s2 transition-colors"
              >
                <X size={10} />
                <span>No group</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function TaskDetail({ todo, onClose: _onClose, askConfirm }: { todo: Todo; onClose: () => void; askConfirm: (title: string, message: string, onConfirm: () => void, confirmLabel?: string, confirmClassName?: string) => void }) {
  const { setPriority, setDescription, setDeadline, setShowCreatedAt, setShowTimer, setShowSubtaskBar, setStatus, setSubtasks, moveToCategory, setTodoGroup, categories } = useTodoStore();
  const { sessions, start, stop, finish } = useTimerStore();
  const { reminders: allReminders, remove: removeReminder } = useReminderStore();
  const taskReminders = allReminders.filter(r => r.task_id === todo.id);
  const taskSessions = sessions.filter(s => s.task_id === todo.id);
  const activeSession = taskSessions.find(s => !s.ended_at) ?? null;
  const [elapsed, setElapsed] = useState(0);
  const [desc, setDesc] = useState(todo.description);
  const [showCategoryMenu, setShowCategoryMenu] = useState(false);
  const categoryMenuRef = useRef<HTMLDivElement>(null);
  const [showDeadlinePicker, setShowDeadlinePicker] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [breakdownLoading, setBreakdownLoading] = useState(false);
  const [showSubtasksAiModal, setShowSubtasksAiModal] = useState(false);
  const [descGenLoading, setDescGenLoading] = useState(false);
  const subtaskDndSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleGenerateDescription = async () => {
    if (descGenLoading || desc.trim().length > 0) return;
    setDescGenLoading(true);
    try {
      const { generateTaskDescription } = await import("./taskAI");
      const generated = await generateTaskDescription(
        todo.text,
        todo.subtasks.map(s => ({ text: s.text, done: s.done })),
      );
      setDesc(generated);
      setDescription(todo.id, generated);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      useToastStore.getState().show("error", msg);
    } finally {
      setDescGenLoading(false);
    }
  };

  const handleBreakdown = async () => {
    if (breakdownLoading) return;
    // When subtasks already exist, open the refinement modal so the user can
    // describe what to change before regenerating.
    if (todo.subtasks.length > 0) {
      setShowSubtasksAiModal(true);
      return;
    }
    setBreakdownLoading(true);
    try {
      const { breakDownTask } = await import("./taskAI");
      const generated = await breakDownTask(todo.text, todo.description);
      const newSubs: SubTask[] = generated.map((g, i) => ({ id: i + 1, text: g.text, done: false, category: g.category || undefined }));
      await setSubtasks(todo.id, newSubs);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      useToastStore.getState().show("error", msg);
    } finally {
      setBreakdownLoading(false);
    }
  };
  const [notesOpen, setNotesOpen] = useState(false);
  const [openSection, setOpenSection] = useState<"timelog" | "notes" | "subtasks" | "images" | null>(null);
  const [editingLog, setEditingLog] = useState(false);
  const toggleSection = (s: "timelog" | "notes" | "subtasks" | "images") => setOpenSection(v => v === s ? null : s);
  const [taskImages, setTaskImages] = useState<{ id: number; filename: string; path: string; src: string }[]>([]);
  const [lightbox, setLightbox] = useState<{ filename: string; data: string } | null>(null);
  const descTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Close category menu on outside click
  useEffect(() => {
    if (!showCategoryMenu) return;
    const close = (e: MouseEvent) => {
      if (categoryMenuRef.current?.contains(e.target as Node)) return;
      setShowCategoryMenu(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [showCategoryMenu]);

  useEffect(() => {
    if (!activeSession) { setElapsed(0); return; }
    const update = () => setElapsed(Date.now() - new Date(activeSession.started_at).getTime());
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [activeSession?.id]);

  useEffect(() => { setDesc(todo.description); }, [todo.id]);

  useEffect(() => {
    if (desc === todo.description) return;
    if (descTimer.current) clearTimeout(descTimer.current);
    descTimer.current = setTimeout(() => setDescription(todo.id, desc), 400);
    return () => { if (descTimer.current) clearTimeout(descTimer.current); };
  }, [desc]);

  const reloadImages = async () => {
    const db = await import("./db").then(m => m.getDb());
    const rows = await db.select<{ id: number; filename: string; path: string; data: string }[]>(
      "SELECT id, filename, path, data FROM task_images WHERE task_id = ? ORDER BY created_at ASC", [todo.id]
    );
    const results = await Promise.all(rows.map(async img => {
      try {
        const src = img.path
          ? await imageToDataUrl(img.path, img.filename)
          : `data:image/jpeg;base64,${img.data}`;
        return { id: img.id, filename: img.filename, path: img.path, src };
      } catch {
        // file was deleted externally — remove stale DB row silently
        await db.execute("DELETE FROM task_images WHERE id = ?", [img.id]).catch(() => {});
        return null;
      }
    }));
    setTaskImages(results.filter(Boolean) as { id: number; filename: string; path: string; src: string }[]);
  };

  useEffect(() => { reloadImages().catch(() => {}); }, [todo.id]);

  const uploadImage = async () => {
    const win = getCurrentWindow();
    await invoke("set_auto_hide", { enabled: false });
    await win.setAlwaysOnTop(false);
    let pickedPath: string | string[] | null;
    try {
      pickedPath = await openFileDialog({
        filters: [{ name: "Images", extensions: ["png", "jpg", "jpeg", "gif", "webp"] }],
        multiple: false,
      });
    } finally {
      await win.setAlwaysOnTop(true);
      await invoke("set_auto_hide", { enabled: true });
    }
    if (typeof pickedPath !== "string") return;
    const bytes = await readFile(pickedPath);
    if (bytes.length > 10 * 1024 * 1024) { alert("Image must be under 10 MB"); return; }
    const filename = pickedPath.split("/").pop() ?? "image";
    const destPath = await saveImageToDir(bytes, filename, todo.id);
    const db = await import("./db").then(m => m.getDb());
    await db.execute(
      "INSERT INTO task_images (task_id, filename, data, path) VALUES (?, ?, '', ?)",
      [todo.id, filename, destPath]
    );
    await reloadImages();
  };

  const deleteImage = (id: number) => {
    askConfirm("Delete Image", "Are you sure you want to delete this image?", async () => {
      const img = taskImages.find(i => i.id === id);
      if (img?.path) await deleteImageFile(img.path);
      const db = await import("./db").then(m => m.getDb());
      await db.execute("DELETE FROM task_images WHERE id = ?", [id]);
      setTaskImages(imgs => imgs.filter(i => i.id !== id));
    }, "Delete", "bg-red-500 hover:bg-red-600 text-white");
  };

  const saveDesc = () => {
    if (descTimer.current) clearTimeout(descTimer.current);
    if (desc !== todo.description) setDescription(todo.id, desc);
  };

  const now = useNow(todo.due_date, todo.due_time);
  const countdown = todo.due_date ? formatCountdown(todo.due_date, todo.due_time, now) : null;

  const PRIORITY_DOT_DETAIL: Record<Priority, string> = { none: "bg-t5", low: "bg-blue-400", medium: "bg-yellow-400", high: "bg-red-400" };

  return (
    <div className="flex flex-1 min-h-0">
      {showReminderModal && (
        <AddReminderModal
          initialText={`⚠️ Ticket: ${todo.text}`}
          taskId={todo.id}
          onClose={() => setShowReminderModal(false)}
          onSaved={() => setShowReminderModal(false)}
        />
      )}
      {showSubtasksAiModal && (
        <AISubtasksModal
          taskText={todo.text}
          taskDescription={todo.description}
          existing={todo.subtasks}
          onClose={() => setShowSubtasksAiModal(false)}
          onApply={async (subs) => {
            await setSubtasks(todo.id, subs);
            setShowSubtasksAiModal(false);
          }}
        />
      )}
      {showDeadlinePicker && (
        <DateTimeModal
          title="Set deadline"
          subtitle={todo.text}
          showDate={true}
          initialCategoryId={todo.category_id}
          disableCategory={true}
          onCancel={() => setShowDeadlinePicker(false)}
          onConfirm={(iso) => {
            const [datePart, timePart] = iso.split("T");
            setDeadline(todo.id, datePart, timePart?.slice(0, 5) ?? null);
            setShowDeadlinePicker(false);
          }}
        />
      )}

      {/* LEFT COLUMN: Notes, Images, Subtasks — always open */}
      <div className="flex flex-col flex-1 min-w-0 overflow-y-auto overflow-x-hidden border-r border-s" style={{ scrollbarWidth: "none" }}>
        {/* Notes */}
        <div className="flex flex-col shrink-0">
          <button
            onClick={() => setNotesOpen(v => !v)}
            className="flex items-center justify-between px-4 py-3 w-full text-left hover:bg-s1 transition-colors"
          >
            <div className="flex items-center gap-1.5">
              <FileText size={11} className="text-t2 shrink-0" />
              <span className="text-[11px] text-t2 font-semibold uppercase tracking-wider">Notes</span>
              {desc.trim().length > 0 && !notesOpen && (
                <span className="text-[10px] text-t4 font-normal normal-case ml-1">has content</span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              {desc.trim().length === 0 && notesOpen && (
                <TipBtn
                  label={descGenLoading ? "Generating…" : "Generate description (AI)"}
                  side="bottom"
                  onClick={e => { e.stopPropagation(); handleGenerateDescription(); }}
                  className="p-1 rounded text-t5 hover:text-indigo-400 transition-colors hover:bg-s2"
                >
                  <Sparkles size={10} className={descGenLoading ? "animate-pulse text-indigo-400" : ""} />
                </TipBtn>
              )}
              {notesOpen ? <ChevronDown size={11} className="text-t5" /> : <ChevronRight size={11} className="text-t5" />}
            </div>
          </button>
          {notesOpen && (
            <div className="px-4 pb-4">
              <RichTextEditor
                key={todo.id}
                value={desc}
                onChange={setDesc}
                onBlur={saveDesc}
                placeholder="Add notes…"
                minHeight={80}
              />
            </div>
          )}
        </div>

        {/* Subtasks */}
        <div className="flex flex-col border-t border-s shrink-0">
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="flex items-center gap-1.5 shrink-0">
              <CheckSquare size={11} className="text-t2 shrink-0" />
              <span className="text-[11px] text-t2 font-semibold uppercase tracking-wider">Subtasks</span>
            </div>
            {todo.subtasks.length > 0 && (
              <SubtaskProgressBar subtasks={todo.subtasks} showCount className="flex-1 max-w-[180px]" />
            )}
            <div className="flex items-center gap-1.5 ml-auto shrink-0">
              <TipBtn label={breakdownLoading ? "Generating…" : "Break down into subtasks (AI)"} side="bottom" onClick={handleBreakdown} className="p-1 rounded text-t5 hover:text-indigo-400 transition-colors hover:bg-s2 disabled:opacity-40">
                <Sparkles size={10} className={breakdownLoading ? "animate-pulse text-indigo-400" : ""} />
              </TipBtn>
              <TipBtn label={todo.show_subtask_bar ? "Hide bar on card" : "Show bar on card"} side="bottom" onClick={() => setShowSubtaskBar(todo.id, !todo.show_subtask_bar)} className="p-1 rounded text-t5 hover:text-t2 transition-colors hover:bg-s2">
                {todo.show_subtask_bar ? <EyeOff size={9} /> : <Eye size={9} />}
              </TipBtn>
            </div>
          </div>
          <div>
            <div className="px-4 pt-1 pb-2">
              <AddSubtaskRow onAdd={(text) => {
                const newId = todo.subtasks.length > 0 ? Math.max(...todo.subtasks.map(s => s.id)) + 1 : 1;
                setSubtasks(todo.id, [{ id: newId, text, done: false }, ...todo.subtasks]);
              }} />
            </div>
            <div className="overflow-y-auto px-4 pb-3" style={{ maxHeight: "60vh", scrollbarWidth: "none" }}>
              <DndContext
                sensors={subtaskDndSensors}
                collisionDetection={closestCenter}
                onDragEnd={(event: DragEndEvent) => {
                  const { active, over } = event;
                  if (!over || active.id === over.id) return;
                  const oldIdx = todo.subtasks.findIndex(s => s.id === active.id);
                  const newIdx = todo.subtasks.findIndex(s => s.id === over.id);
                  if (oldIdx === -1 || newIdx === -1) return;
                  const reordered = arrayMove(todo.subtasks, oldIdx, newIdx);
                  // auto-adopt category of surrounding items when dropped into a different group
                  const moved = reordered[newIdx];
                  const prev = reordered[newIdx - 1];
                  const next = reordered[newIdx + 1];
                  const neighborCat = prev?.category ?? next?.category;
                  if (neighborCat !== undefined && neighborCat !== moved.category) {
                    reordered[newIdx] = { ...moved, category: neighborCat };
                  }
                  setSubtasks(todo.id, reordered);
                }}
              >
                <SortableContext items={todo.subtasks.map(s => s.id)} strategy={verticalListSortingStrategy}>
                  {todo.subtasks.map((sub, idx) => {
                    const prevCat = idx > 0 ? todo.subtasks[idx - 1].category : undefined;
                    const showHeader = sub.category && sub.category !== prevCat;
                    const catItems = sub.category ? todo.subtasks.filter(s => s.category === sub.category) : [];
                    const catDone = catItems.filter(s => s.done).length;
                    return (
                      <div key={sub.id}>
                        {showHeader && (
                          <SubtaskCategoryHeader
                            name={sub.category!}
                            done={catDone}
                            total={catItems.length}
                            onRename={(newName) => setSubtasks(todo.id, todo.subtasks.map(s =>
                              s.category === sub.category ? { ...s, category: newName || undefined } : s
                            ))}
                          />
                        )}
                        <SubtaskRow
                          sub={sub}
                          onToggle={() => setSubtasks(todo.id, todo.subtasks.map(s => s.id === sub.id ? { ...s, done: !s.done } : s))}
                          onEdit={(text) => setSubtasks(todo.id, todo.subtasks.map(s => s.id === sub.id ? { ...s, text } : s))}
                          onCategoryEdit={(cat) => setSubtasks(todo.id, todo.subtasks.map(s => s.id === sub.id ? { ...s, category: cat || undefined } : s))}
                          onDelete={() => setSubtasks(todo.id, todo.subtasks.filter(s => s.id !== sub.id))}
                        />
                      </div>
                    );
                  })}
                </SortableContext>
              </DndContext>
            </div>
          </div>
        </div>

        {/* Images */}
        <div className="flex flex-col border-t border-s shrink-0">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-1.5">
              <Images size={11} className="text-t2 shrink-0" />
              <span className="text-[11px] text-t2 font-semibold uppercase tracking-wider">Images</span>
            </div>
            <div className="flex items-center gap-1.5">
              {taskImages.length > 0 && <span className="text-[10px] text-t5 font-mono">{taskImages.length}</span>}
              <button
                onMouseDown={e => e.stopPropagation()}
                onClick={e => { e.stopPropagation(); uploadImage(); }}
                className="p-1 rounded text-t5 hover:text-blue-400 transition-colors hover:bg-s2"
              >
                <ImagePlus size={10} />
              </button>
            </div>
          </div>
          <div className="px-4 pb-4">
            {taskImages.length === 0 ? (
              <button onClick={uploadImage} className="flex items-center gap-2 text-[11px] text-t5 hover:text-t3 transition-colors">
                <ImagePlus size={12} /><span>Upload a reference image…</span>
              </button>
            ) : (
              <div className="flex flex-wrap gap-2">
                {taskImages.map(img => (
                    <div key={img.id} className="group relative" style={{ width: 72, height: 72 }}>
                      <img
                        src={img.src}
                        onClick={() => setLightbox({ filename: img.filename, data: img.src })}
                        className="w-full h-full object-cover rounded-lg cursor-pointer"
                        style={{ border: "1px solid var(--c-border)" }}
                      />
                      <button
                        onClick={() => deleteImage(img.id)}
                        className="absolute top-0.5 right-0.5 w-4 h-4 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ background: "rgba(0,0,0,0.7)" }}
                      >
                        <X size={8} className="text-white" />
                      </button>
                    </div>
                ))}
                <button onClick={uploadImage} className="flex items-center justify-center rounded-lg text-t6 hover:text-t4 hover:bg-s2 transition-colors" style={{ width: 72, height: 72, border: "1px dashed var(--c-border)" }}>
                  <ImagePlus size={16} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: meta */}
      <div className="flex flex-col shrink-0 overflow-y-auto overflow-x-hidden" style={{ width: 340, scrollbarWidth: "none" }}>

      {/* Created */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0">
        <div className="flex items-center gap-1.5">
          <Clock size={10} className="text-t4 shrink-0" />
          <span className="text-[10px] text-t4 uppercase tracking-wider">Created</span>
        </div>
        <div className="flex items-center gap-1.5">
          {todo.show_created_at
            ? <span className="text-[11px] text-t3">{new Date(todo.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</span>
            : <span className="text-[11px] text-t5">—</span>
          }
          <TipBtn label={todo.show_created_at ? "Hide" : "Show"} side="bottom" onClick={() => setShowCreatedAt(todo.id, !todo.show_created_at)} className="p-1 rounded text-t5 hover:text-t2 transition-colors hover:bg-s2">
            {todo.show_created_at ? <EyeOff size={9} /> : <Eye size={9} />}
          </TipBtn>
        </div>
      </div>

      {/* Status */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-s shrink-0">
        <div className="flex items-center gap-1.5">
          <CheckSquare size={10} className="text-t4 shrink-0" />
          <span className="text-[10px] text-t4 uppercase tracking-wider">Status</span>
        </div>
        <div className="flex gap-1">
          {KANBAN_COLS.map((c) => (
            <TipBtn
              key={c.id}
              label={c.label}
              side="bottom"
              onClick={() => setStatus(todo.id, c.id)}
              className="px-2 py-0.5 rounded-full text-[10px] font-medium transition-all"
              style={todo.status === c.id
                ? { background: `rgba(${c.color},0.18)`, color: `rgba(${c.color},1)`, border: `1px solid rgba(${c.color},0.45)` }
                : { background: "var(--c-surface-2)", color: "var(--c-text-5)", border: "1px solid var(--c-border-subtle)" }
              }
            >
              {c.label}
            </TipBtn>
          ))}
        </div>
      </div>

      {/* Category */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-s shrink-0 relative">
        <div className="flex items-center gap-1.5">
          <FolderPlus size={10} className="text-t4 shrink-0" />
          <span className="text-[10px] text-t4 uppercase tracking-wider">Category</span>
        </div>
        <div className="relative">
          {(() => {
            const cat = categories.find(c => c.id === todo.category_id);
            return (
              <button
                onClick={() => setShowCategoryMenu(v => !v)}
                className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] transition-colors hover:bg-s2"
                style={{ color: cat ? `rgb(${cat.color})` : "var(--c-text-3)" }}
              >
                <span>{cat?.name ?? "—"}</span>
                <ChevronDown size={9} style={{ opacity: 0.5 }} />
              </button>
            );
          })()}
          {showCategoryMenu && (
            <div
              ref={categoryMenuRef}
              className="dropdown absolute right-0 top-full mt-1 rounded-lg shadow-xl py-1 z-50"
              style={{ minWidth: 160, border: "1px solid var(--c-border)" }}
            >
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => { moveToCategory(todo.id, cat.id); setShowCategoryMenu(false); }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] transition-colors hover:bg-s2"
                  style={{ color: todo.category_id === cat.id ? `rgb(${cat.color})` : "var(--c-text-2)" }}
                >
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: `rgb(${cat.color})` }} />
                  <span className="truncate">{cat.name}</span>
                  {todo.category_id === cat.id && <Check size={10} className="ml-auto shrink-0" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Group */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-s shrink-0">
        <div className="flex items-center gap-1.5 shrink-0">
          <Rows2 size={10} className="text-t4 shrink-0" />
          <span className="text-[10px] text-t4 uppercase tracking-wider">Group</span>
        </div>
        <GroupInput value={todo.group_name ?? null} onChange={v => setTodoGroup(todo.id, v)} categoryId={todo.category_id} />
      </div>

      {/* Priority */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-s shrink-0">
        <div className="flex items-center gap-1.5">
          <Flag size={10} className="text-t4 shrink-0" />
          <span className="text-[10px] text-t4 uppercase tracking-wider">Priority</span>
        </div>
        <div className="flex gap-1.5">
          {(["none", "low", "medium", "high"] as Priority[]).map((p) => (
            <TipBtn key={p} label={p === "none" ? "None" : p.charAt(0).toUpperCase() + p.slice(1)} side="bottom" onClick={() => setPriority(todo.id, p)}
              className="rounded-full transition-all"
              style={todo.priority === p ? { outline: `0.5px solid var(--c-text-3)`, outlineOffset: 0 } : {}}
            >
              <span className={`block w-2.5 h-2.5 rounded-full ${PRIORITY_DOT_DETAIL[p]}`} style={{ opacity: todo.priority === p ? 1 : 0.3 }} />
            </TipBtn>
          ))}
        </div>
      </div>

      {/* Deadline */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-s shrink-0">
        <div className="flex items-center gap-1.5">
          <CalendarDays size={10} className="text-t4 shrink-0" />
          <span className="text-[10px] text-t4 uppercase tracking-wider">Deadline</span>
        </div>
        <div className="flex items-center gap-1">
          {todo.due_date ? (
            <button
              onClick={() => setShowDeadlinePicker(true)}
              className="flex items-center gap-1.5 text-[11px] transition-colors hover:text-t1 rounded px-1.5 py-0.5 hover:bg-s2"
              style={countdown?.overdue ? { color: "rgb(248,113,113)" } : { color: "var(--c-text-2)" }}
            >
              <span>{countdown?.overdue ? countdown.label : `${todo.due_date}${todo.due_time ? ` ${todo.due_time}` : ""}${countdown ? ` · ${countdown.label}` : ""}`}</span>
            </button>
          ) : (
            <button
              onClick={() => setShowDeadlinePicker(true)}
              className="flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors rounded px-1.5 py-0.5 hover:bg-s2"
            >
              <Plus size={10} /><span>Set deadline</span>
            </button>
          )}
          {todo.due_date && (
            <button onClick={() => setDeadline(todo.id, null, null)} className="text-t6 hover:text-red-400 transition-colors"><X size={10} /></button>
          )}
        </div>
      </div>

      {/* Reminder */}
      <div className="flex flex-col border-t border-s shrink-0">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-1.5">
            <Bell size={10} className="text-t4 shrink-0" />
            <span className="text-[10px] text-t4 uppercase tracking-wider">
              Reminder{taskReminders.length > 0 && <span className="text-t5 font-mono normal-case tracking-normal"> ({taskReminders.length})</span>}
            </span>
          </div>
          <button
            onClick={() => setShowReminderModal(true)}
            className="flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors rounded px-1.5 py-0.5 hover:bg-s2"
          >
            <Plus size={10} /><span>Set reminder</span>
          </button>
        </div>
        {taskReminders.length > 0 && (
          <div className="flex flex-col px-4 pb-3 gap-1">
            {taskReminders.map(r => {
              const d = new Date(r.remind_at);
              const fmt = d.toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
              return (
                <div key={r.id} className="flex items-center justify-between gap-2 text-[11px]">
                  <span className={`truncate ${r.notified ? "text-t5 line-through" : "text-t3"}`}>{fmt}</span>
                  <button
                    onClick={() => askConfirm("Delete reminder?", `"${r.text}" will be deleted.`, () => removeReminder(r.id), "Delete", "bg-red-500 hover:bg-red-600 text-white")}
                    className="text-t6 hover:text-red-400 transition-colors shrink-0"
                  >
                    <X size={10} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Timer + Time Log — stacked */}
      <div className="flex flex-col border-t border-s shrink-0">
        {/* Timer — one row */}
        <div className="flex items-center justify-between px-4 py-3 shrink-0">
          <div className="flex items-center gap-1.5">
            <Timer size={10} className="text-t4 shrink-0" />
            <span className="text-[10px] text-t4 uppercase tracking-wider">Timer</span>
          </div>
          <div className="flex items-center gap-1.5">
            {activeSession && <span className="text-[11px] text-t3 font-mono">{fmtElapsed(elapsed)}</span>}
            {activeSession ? (
              <>
                <TipBtn label="Pause" className="p-1 rounded text-t3 hover:text-t1 transition-colors" style={{ background: "var(--c-surface-3)", border: "1px solid var(--c-border)" }} onClick={() => stop(todo.id)}><Pause size={9} /></TipBtn>
                <TipBtn label="Mark done" className="p-1 rounded transition-colors" style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)", color: "rgba(16,185,129,0.9)" }} onClick={() => finish(todo.id, setStatus)}><CheckCheck size={9} /></TipBtn>
              </>
            ) : (
              <>
                <TipBtn label="Start timer" className="p-1 rounded transition-colors" style={{ background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)", color: "rgba(147,150,255,0.9)" }} onClick={() => { start(todo.id); if (todo.status === 'done') setStatus(todo.id, 'in_progress'); }}><Play size={9} /></TipBtn>
                {todo.status !== 'done' && (
                  <TipBtn label="Mark done" className="p-1 rounded transition-colors" style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)", color: "rgba(16,185,129,0.9)" }} onClick={() => finish(todo.id, setStatus)}><CheckCheck size={9} /></TipBtn>
                )}
              </>
            )}
            <TipBtn label={todo.show_timer ? "Hide on card" : "Show on card"} side="bottom" onClick={() => setShowTimer(todo.id, !todo.show_timer)} className="p-1 rounded text-t5 hover:text-t2 transition-colors hover:bg-s2">
              {todo.show_timer ? <EyeOff size={9} /> : <Eye size={9} />}
            </TipBtn>
          </div>
        </div>
        {/* Time Log — one row, below Timer */}
        {taskSessions.length > 0 ? (
          <button onClick={() => toggleSection("timelog")} className="flex items-center justify-between px-4 py-3 text-left hover:bg-s1 transition-colors border-t border-s">
            <div className="flex items-center gap-1.5">
              <Timer size={10} className="text-t4 shrink-0" />
              <span className="text-[10px] text-t4 uppercase tracking-wider">Time log <span className="text-t3 font-mono normal-case tracking-normal">({fmtDuration(totalDurationMs(taskSessions))})</span></span>
            </div>
            <div className="flex items-center gap-1.5">
              <TipBtn label="Edit log" onMouseDown={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); setEditingLog(true); }} className="p-0.5 rounded text-t5 hover:text-t2 transition-colors">
                <Pencil size={9} />
              </TipBtn>
              {openSection === "timelog" ? <ChevronDown size={11} className="text-t5" /> : <ChevronRight size={11} className="text-t5" />}
            </div>
          </button>
        ) : (
          <div className="flex items-center justify-between px-4 py-3 border-t border-s">
            <div className="flex items-center gap-1.5">
              <Timer size={10} className="text-t4 shrink-0" />
              <span className="text-[10px] text-t4 uppercase tracking-wider">Time log</span>
            </div>
            <span className="text-[11px] text-t5">No sessions</span>
          </div>
        )}
        {/* Expanded log — full width below the row */}
        {openSection === "timelog" && taskSessions.length > 0 && (() => {
          const DAY_COLORS = [
            { bg: "rgba(59,130,246,0.08)", border: "rgba(59,130,246,0.4)", text: "rgba(96,165,250,0.9)", bar: "rgba(59,130,246,0.5)" },
            { bg: "rgba(168,85,247,0.08)", border: "rgba(168,85,247,0.4)", text: "rgba(192,132,252,0.9)", bar: "rgba(168,85,247,0.5)" },
            { bg: "rgba(16,185,129,0.08)", border: "rgba(16,185,129,0.4)", text: "rgba(52,211,153,0.9)", bar: "rgba(16,185,129,0.5)" },
            { bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.4)", text: "rgba(251,191,36,0.9)", bar: "rgba(245,158,11,0.5)" },
            { bg: "rgba(236,72,153,0.08)", border: "rgba(236,72,153,0.4)", text: "rgba(244,114,182,0.9)", bar: "rgba(236,72,153,0.5)" },
          ];
          const fmtTime = (d: Date) => d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
          const dayKey = (d: Date) => d.toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short", year: "numeric" });
          const groups: { label: string; sessions: typeof taskSessions }[] = [];
          for (const s of taskSessions) {
            const label = dayKey(new Date(s.started_at));
            const g = groups.find(g => g.label === label);
            if (g) g.sessions.push(s); else groups.push({ label, sessions: [s] });
          }
          return (
            <div className="flex flex-col gap-2 px-4 py-3 border-t border-s overflow-y-auto" style={{ maxHeight: 180, scrollbarGutter: "stable" }}>
              {groups.map((g, i) => {
                const c = DAY_COLORS[i % DAY_COLORS.length];
                return (
                  <div key={g.label} className="px-2 py-1.5">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[9px] font-semibold uppercase tracking-wide" style={{ color: c.text }}>{g.label}</span>
                      <span className="text-[9px]" style={{ color: c.text }}>{fmtDuration(totalDurationMs(g.sessions))}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      {g.sessions.map(s => {
                        const start = new Date(s.started_at);
                        const end = s.ended_at ? new Date(s.ended_at) : null;
                        return (
                          <div key={s.id} className="flex items-center justify-between gap-2 pl-2" style={{ borderLeft: `2px solid ${c.bar}` }}>
                            <span className="text-[10px] text-t3">{fmtTime(start)} → {end ? fmtTime(end) : "running"}</span>
                            <span className="text-[10px] text-t5 shrink-0">{fmtDuration(sessionDurationMs(s))}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>
      {editingLog && <TimeLogEditModal sessions={taskSessions} onClose={() => setEditingLog(false)} />}
      </div>
      {/* /RIGHT COLUMN */}

      {/* Lightbox */}
      {lightbox && (
        <>
          <div
            className="fixed inset-0 z-[200] flex flex-col"
            style={{ background: "rgba(0,0,0,0.88)" }}
            onClick={() => setLightbox(null)}
          >
            <div className="flex justify-end px-3 py-2 shrink-0">
              <button
                onClick={e => { e.stopPropagation(); setLightbox(null); }}
                className="flex items-center justify-center rounded-full text-white"
                style={{ width: 28, height: 28, background: "rgba(255,255,255,0.18)" }}
              >
                <X size={13} />
              </button>
            </div>
            <div className="flex-1 flex items-center justify-center px-4 pb-4 min-h-0">
              <img
                src={lightbox.data}
                className="rounded-lg object-contain max-w-full max-h-full"
                style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}
                onClick={e => e.stopPropagation()}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function SubtaskProgressBar({ subtasks, className, showCount }: { subtasks: SubTask[]; className?: string; showCount?: boolean }) {
  const done = subtasks.filter(s => s.done).length;
  const pct = subtasks.length > 0 ? (done / subtasks.length) * 100 : 0;
  const fill = <div className="h-full rounded-full transition-all duration-300" style={{ width: `${pct}%`, background: pct === 100 ? "rgba(16,185,129,0.8)" : "rgba(16,185,129,0.55)" }} />;
  if (showCount) return (
    <div className={`flex items-center gap-2 ${className ?? ""}`}>
      <div className="flex-1 h-[3px] rounded-full overflow-hidden" style={{ background: "var(--c-border)" }}>{fill}</div>
      <span className="text-[9px] text-t5 shrink-0 font-mono">{done}/{subtasks.length}</span>
    </div>
  );
  return <div className={`h-[3px] rounded-full overflow-hidden ${className ?? ""}`} style={{ background: "var(--c-border)" }}>{fill}</div>;
}

const CAT_COLORS = [
  "rgba(99,102,241,0.85)",   // indigo
  "rgba(16,185,129,0.85)",   // emerald
  "rgba(245,158,11,0.85)",   // amber
  "rgba(59,130,246,0.85)",   // blue
  "rgba(168,85,247,0.85)",   // purple
  "rgba(20,184,166,0.85)",   // teal
  "rgba(251,146,60,0.85)",   // orange
  "rgba(236,72,153,0.85)",   // pink
];
function catColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return CAT_COLORS[h % CAT_COLORS.length];
}

const GROUP_PICKER_COLORS = [
  "rgba(255,255,255,0.80)",  // white (default)
  "rgba(99,102,241,0.85)",   // indigo
  "rgba(16,185,129,0.85)",   // emerald
  "rgba(245,158,11,0.85)",   // amber
  "rgba(59,130,246,0.85)",   // blue
  "rgba(168,85,247,0.85)",   // purple
  "rgba(20,184,166,0.85)",   // teal
  "rgba(251,146,60,0.85)",   // orange
  "rgba(236,72,153,0.85)",   // pink
];
const GROUP_DEFAULT_COLOR = GROUP_PICKER_COLORS[0];

const GROUP_COLOR_LS_KEY = "slate_group_colors";
function loadGroupColors(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(GROUP_COLOR_LS_KEY) || "{}"); } catch { return {}; }
}
function saveGroupColor(name: string, color: string) {
  const map = loadGroupColors();
  map[name] = color;
  localStorage.setItem(GROUP_COLOR_LS_KEY, JSON.stringify(map));
}
function getGroupColor(name: string): string {
  return loadGroupColors()[name] ?? GROUP_DEFAULT_COLOR;
}

function groupTodosForDisplay(todos: Todo[]): Todo[] {
  if (todos.length === 0) return todos;
  const groupMap = new Map<string, Todo[]>();
  const groupFirstIdx = new Map<string, number>();
  const blocks: { idx: number; items: Todo[] }[] = [];
  for (let i = 0; i < todos.length; i++) {
    const t = todos[i];
    const g = t.group_name ?? null;
    if (!g) {
      blocks.push({ idx: i, items: [t] });
    } else {
      if (!groupMap.has(g)) { groupMap.set(g, []); groupFirstIdx.set(g, i); }
      groupMap.get(g)!.push(t);
    }
  }
  for (const [g, members] of groupMap) {
    blocks.push({ idx: groupFirstIdx.get(g)!, items: members });
  }
  blocks.sort((a, b) => a.idx - b.idx);
  return blocks.flatMap(b => b.items);
}

function SubtaskCategoryHeader({ name, done, total, onRename }: { name: string; done: number; total: number; onRename: (n: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(name);
  const color = catColor(name);
  useEffect(() => { if (!editing) setVal(name); }, [name, editing]);
  const commit = () => {
    const trimmed = val.trim();
    if (trimmed && trimmed !== name) onRename(trimmed);
    else setVal(name);
    setEditing(false);
  };
  return (
    <div className="flex items-center gap-2 pt-3 pb-1">
      <div className="w-1 h-3 rounded-full shrink-0" style={{ background: color }} />
      {editing ? (
        <input
          value={val}
          onChange={e => setVal(e.target.value)}
          onBlur={commit}
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); commit(); } if (e.key === "Escape") { setVal(name); setEditing(false); } e.stopPropagation(); }}
          onPointerDown={e => e.stopPropagation()}
          className="text-[10px] font-semibold uppercase tracking-wider bg-transparent outline-none border-b min-w-0 flex-1"
          style={{ borderColor: color, color }}
          autoFocus
        />
      ) : (
        <button
          onPointerDown={e => e.stopPropagation()}
          onClick={e => { e.stopPropagation(); setEditing(true); }}
          className="text-[10px] uppercase tracking-wider font-semibold truncate transition-opacity hover:opacity-70 text-left"
          style={{ color }}
        >
          {name}
        </button>
      )}
      <span className="text-[9px] text-t5 font-mono shrink-0">{done}/{total}</span>
      <div className="flex-1 h-px" style={{ background: color, opacity: 0.25 }} />
    </div>
  );
}

function SubtaskRow({ sub, onToggle, onEdit, onCategoryEdit, onDelete }: {
  sub: SubTask;
  onToggle: () => void;
  onEdit: (text: string) => void;
  onCategoryEdit: (cat: string) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(sub.text);
  const [editingCat, setEditingCat] = useState(false);
  const [catVal, setCatVal] = useState(sub.category ?? "");
  const [hovered, setHovered] = useState(false);
  const dragStarted = useRef(false);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: sub.id });

  useEffect(() => { if (!editing) setVal(sub.text); }, [sub.text, editing]);
  useEffect(() => { if (!editingCat) setCatVal(sub.category ?? ""); }, [sub.category, editingCat]);

  const commit = () => {
    const trimmed = val.trim();
    if (trimmed && trimmed !== sub.text) onEdit(trimmed);
    else setVal(sub.text);
    setEditing(false);
  };

  const commitCat = () => {
    onCategoryEdit(catVal.trim());
    setEditingCat(false);
  };

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1, cursor: isDragging ? "grabbing" : "grab" }}
      className="flex items-start gap-2 py-0.5 min-h-[22px] group/subrow"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      {...attributes}
      {...listeners}
      onPointerDown={(e) => { dragStarted.current = false; if (listeners?.onPointerDown) listeners.onPointerDown(e as any); }}
      onPointerMove={(e) => { if (e.buttons > 0) dragStarted.current = true; if ((listeners as any)?.onPointerMove) (listeners as any).onPointerMove(e); }}
    >
      <button
        onClick={(e) => { e.stopPropagation(); if (!dragStarted.current) onToggle(); dragStarted.current = false; }}
        onPointerDown={(e) => e.stopPropagation()}
        className={`w-3.5 h-3.5 mt-[2px] rounded shrink-0 border flex items-center justify-center transition-colors`}
        style={{ cursor: "pointer", ...(sub.done ? { background: "rgba(16,185,129,0.15)", borderColor: "rgba(16,185,129,0.5)" } : { borderColor: "var(--c-text-3)" }) }}
      >
        {sub.done && <Check size={8} className="text-emerald-400" />}
      </button>
      <div className="flex-1 flex flex-col gap-0.5 min-w-0">
        {editing ? (
          <input
            value={val}
            onChange={(e) => setVal(e.target.value)}
            onBlur={commit}
            onPointerDown={(e) => e.stopPropagation()}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); commit(); } if (e.key === "Escape") { setVal(sub.text); setEditing(false); } e.stopPropagation(); }}
            className="text-[12px] bg-transparent outline-none text-t1 border-b w-full"
            style={{ borderColor: "var(--c-border)" }}
            autoFocus
          />
        ) : (
          <span
            onDoubleClick={() => setEditing(true)}
            className={`text-[12px] cursor-default select-none leading-relaxed ${sub.done ? "line-through text-t5" : "text-t2"}`}
          >
            {sub.text}
          </span>
        )}
        {editingCat ? (
          <input
            value={catVal}
            onChange={(e) => setCatVal(e.target.value)}
            onBlur={commitCat}
            onPointerDown={(e) => e.stopPropagation()}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); commitCat(); } if (e.key === "Escape") { setCatVal(sub.category ?? ""); setEditingCat(false); } e.stopPropagation(); }}
            placeholder="Category name…"
            className="text-[10px] bg-transparent outline-none text-indigo-400 border-b w-full max-w-[140px]"
            style={{ borderColor: "var(--c-border)" }}
            autoFocus
          />
        ) : (sub.category || hovered) ? (
          <button
            onClick={(e) => { e.stopPropagation(); setEditingCat(true); }}
            onPointerDown={(e) => e.stopPropagation()}
            className="text-[10px] text-t5 hover:text-indigo-400 transition-colors text-left w-fit"
            style={{ opacity: hovered ? 1 : 0, cursor: "pointer" }}
          >
            {sub.category ? `# ${sub.category}` : "+ category"}
          </button>
        ) : null}
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        onPointerDown={(e) => e.stopPropagation()}
        className="transition-opacity text-t5 hover:text-red-400 shrink-0 mt-[2px]"
        style={{ opacity: hovered ? 1 : 0, cursor: "pointer" }}
      >
        <X size={9} />
      </button>
    </div>
  );
}

function AddSubtaskRow({ onAdd }: { onAdd: (text: string) => void }) {
  const [active, setActive] = useState(false);
  const [val, setVal] = useState("");

  const submit = () => {
    if (val.trim()) onAdd(val.trim());
    setVal("");
    setActive(false);
  };

  if (!active) return (
    <button onClick={() => setActive(true)} className="flex items-center gap-1.5 mt-1 text-[11px] text-t5 hover:text-t3 transition-colors">
      <Plus size={9} /><span>Add subtask</span>
    </button>
  );

  return (
    <div className="flex items-center gap-2 py-0.5 mt-0.5">
      <div className="w-3.5 h-3.5 rounded border shrink-0" style={{ borderColor: "var(--c-border-subtle)" }} />
      <input
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={submit}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); if (val.trim()) { onAdd(val.trim()); setVal(""); } else setActive(false); }
          if (e.key === "Escape") { setVal(""); setActive(false); }
          e.stopPropagation();
        }}
        placeholder="New subtask…"
        className="flex-1 text-[12px] bg-transparent outline-none text-t1 placeholder-themed"
        autoFocus
      />
    </div>
  );
}

function TimeLogEditModal({ sessions, onClose }: { sessions: import("./timerStore").TaskSession[]; onClose: () => void }) {
  const { updateSession, deleteSession } = useTimerStore();
  const toLocal = (iso: string) => {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };
  const toUtcIso = (local: string) => {
    const d = new Date(local);
    return d.toISOString().slice(0, 19) + "Z";
  };
  type Row = { id: number; start: string; end: string; isRunning: boolean };
  const [rows, setRows] = useState<Row[]>(() =>
    sessions.map(s => ({ id: s.id, start: toLocal(s.started_at), end: s.ended_at ? toLocal(s.ended_at) : "", isRunning: !s.ended_at }))
  );
  const [confirmingId, setConfirmingId] = useState<number | null>(null);
  const update = (id: number, field: "start" | "end", val: string) =>
    setRows(r => r.map(row => row.id === id ? { ...row, [field]: val } : row));
  const save = async () => {
    for (const row of rows) {
      const endIso = row.isRunning || !row.end ? null : toUtcIso(row.end);
      await updateSession(row.id, toUtcIso(row.start), endIso);
    }
    onClose();
  };
  return (
    <div className="absolute inset-0 flex items-center justify-center z-50" style={{ background: "rgba(0,0,0,0.5)", borderRadius: 12 }}>
      <div className="dropdown rounded-xl shadow-2xl flex flex-col" style={{ width: 520, maxHeight: "70vh", border: "1px solid var(--c-border)" }}>
        <div className="flex items-center justify-between px-4 py-3 shrink-0" style={{ borderBottom: "1px solid var(--c-border-subtle)" }}>
          <span className="text-[13px] font-semibold text-t1">Edit Time Log</span>
          <button onClick={onClose} className="text-t4 hover:text-t1 transition-colors"><X size={13} /></button>
        </div>
        <div className="flex flex-col gap-3 px-4 py-3 overflow-y-auto flex-1">
          {(() => {
            const DAY_COLORS = [
              { bg: "rgba(59,130,246,0.08)", border: "rgba(59,130,246,0.4)", text: "rgba(96,165,250,0.9)" },
              { bg: "rgba(168,85,247,0.08)", border: "rgba(168,85,247,0.4)", text: "rgba(192,132,252,0.9)" },
              { bg: "rgba(16,185,129,0.08)", border: "rgba(16,185,129,0.4)", text: "rgba(52,211,153,0.9)" },
              { bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.4)", text: "rgba(251,191,36,0.9)" },
              { bg: "rgba(236,72,153,0.08)", border: "rgba(236,72,153,0.4)", text: "rgba(244,114,182,0.9)" },
            ];
            const dayKey = (localStr: string) => {
              const d = new Date(localStr);
              return d.toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short", year: "numeric" });
            };
            const groups: { label: string; rows: typeof rows }[] = [];
            for (const row of rows) {
              const label = dayKey(row.start);
              const g = groups.find(g => g.label === label);
              if (g) g.rows.push(row); else groups.push({ label, rows: [row] });
            }
            return groups.map((g, i) => {
              const c = DAY_COLORS[i % DAY_COLORS.length];
              return (
                <div key={g.label} className="flex flex-col gap-2 px-3 py-2">
                  <span className="text-[9px] font-semibold uppercase tracking-wide" style={{ color: c.text }}>{g.label}</span>
                  {g.rows.map(row => (
                    <div key={row.id} className="flex items-center gap-2">
                      <div className="flex flex-col gap-1 flex-1">
                        <span className="text-[9px] text-t5 uppercase tracking-wide">Start</span>
                        <input type="datetime-local" value={row.start} onChange={e => update(row.id, "start", e.target.value)}
                          className="w-full px-2 py-1 rounded-lg text-[11px] text-t1 outline-none"
                          style={{ background: "var(--c-surface-2)", border: "1px solid var(--c-border)" }} />
                      </div>
                      <div className="flex flex-col gap-1 flex-1">
                        <span className="text-[9px] text-t5 uppercase tracking-wide">End</span>
                        <input type="datetime-local" value={row.end} onChange={e => update(row.id, "end", e.target.value)}
                          disabled={row.isRunning}
                          className="w-full px-2 py-1 rounded-lg text-[11px] text-t1 outline-none disabled:opacity-40"
                          style={{ background: "var(--c-surface-2)", border: "1px solid var(--c-border)" }} />
                      </div>
                      {confirmingId === row.id ? (
                        <div className="flex items-center gap-2 mt-4 shrink-0">
                          <button onClick={() => { deleteSession(row.id).then(() => { setRows(r => r.filter(r2 => r2.id !== row.id)); setConfirmingId(null); }); }}
                            className="text-[9px] text-red-400 hover:text-red-300 transition-colors font-medium">Delete</button>
                          <button onClick={() => setConfirmingId(null)} className="text-[9px] text-t5 hover:text-t2 transition-colors">Cancel</button>
                        </div>
                      ) : (
                        <button onClick={() => setConfirmingId(row.id)}
                          className="text-t5 hover:text-red-400 transition-colors mt-4 shrink-0"><Trash2 size={10} /></button>
                      )}
                    </div>
                  ))}
                </div>
              );
            });
          })()}
        </div>
        <div className="flex justify-end gap-2 px-4 py-3 shrink-0" style={{ borderTop: "1px solid var(--c-border-subtle)" }}>
          <button onClick={onClose} className="px-3 py-1.5 rounded-lg text-[12px] text-t3 hover:text-t2 transition-colors" style={{ background: "var(--c-surface-2)" }}>Cancel</button>
          <button onClick={save} className="px-3 py-1.5 rounded-lg text-[12px] text-blue-400 hover:text-blue-300 transition-colors" style={{ background: "rgba(59,130,246,0.15)" }}>Save</button>
        </div>
      </div>
    </div>
  );
}

function AddTaskModal({ onClose, withDeadline = false, categoryId = 1, lockedCategoryId, initialStatus }: { onClose: () => void; withDeadline?: boolean; categoryId?: number; lockedCategoryId?: number; initialStatus?: TodoStatus }) {
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
            <div className="flex-1 flex items-center gap-2">
            <span className="text-[14px] font-semibold text-t1">New Task</span>
            {withDeadline && <span className="text-[10px] px-1.5 py-0.5 rounded-full whitespace-nowrap" style={{ background: "rgba(59,130,246,0.12)", color: "rgba(59,130,246,0.9)", border: "1px solid rgba(59,130,246,0.25)" }}>with deadline</span>}
            {initialStatus && (() => {
              const col = KANBAN_COLS.find(c => c.id === initialStatus);
              return col ? <span className="text-[10px] px-1.5 py-0.5 rounded-full whitespace-nowrap" style={{ background: `rgba(${col.color},0.12)`, color: `rgba(${col.color},0.9)`, border: `1px solid rgba(${col.color},0.25)` }}>{col.label}</span> : null;
            })()}
          </div>
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
                  onClick={() => !lockedCategoryId && setCatDropOpen(o => !o)}
                  onKeyDown={e => e.stopPropagation()}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] text-left"
                  style={{ background: "var(--c-surface-2)", border: `1px solid rgba(${active?.color ?? "99,102,241"},0.4)`, opacity: lockedCategoryId ? 0.6 : 1, cursor: lockedCategoryId ? "default" : "pointer" }}
                >
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: `rgba(${active?.color},0.85)` }} />
                  <span style={{ color: `rgba(${active?.color},0.95)` }}>{active?.name}</span>
                  {!lockedCategoryId && <ChevronDown size={11} className="ml-auto text-t5" />}
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



const KANBAN_COLS: { id: TodoStatus; label: string; color: string }[] = [
  { id: 'todo',        label: 'To Do',       color: '156,163,175' },
  { id: 'in_progress', label: 'In Progress', color: '245,158,11'  },
  { id: 'done',        label: 'Done',        color: '16,185,129'  },
];

const PRIORITY_DOT: Record<Priority, string> = { none: "var(--c-text-5)", low: "rgb(96,165,250)", medium: "rgb(250,204,21)", high: "rgb(248,113,113)" };

function KanbanCard({ todo, onOpen, onDelete, suppressSortTransform = false }: { todo: Todo; onOpen: () => void; onDelete: () => void; suppressSortTransform?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: todo.id });
  const now = useNow(todo.due_date, todo.due_time);
  const countdown = todo.due_date ? formatCountdown(todo.due_date, todo.due_time, now) : null;
  const { sessions, start, stop, finish } = useTimerStore();
  const { setStatus } = useTodoStore();
  const taskSessions = sessions.filter(s => s.task_id === todo.id);
  const activeSession = taskSessions.find(s => !s.ended_at) ?? null;
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!activeSession) { setElapsed(0); return; }
    const update = () => setElapsed(Date.now() - new Date(activeSession.started_at).getTime());
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [activeSession?.id]);

  const showTimer = todo.show_timer && todo.status !== 'done';

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className="group rounded-lg px-2.5 py-3 flex flex-col gap-1.5 select-none"
      style={{ background: countdown?.overdue ? "rgba(239,68,68,0.07)" : "var(--c-surface-2)", border: countdown?.overdue ? "1px solid rgba(239,68,68,0.25)" : "1px solid var(--c-border)", transform: suppressSortTransform ? undefined : CSS.Transform.toString(transform), transition: suppressSortTransform ? undefined : transition, opacity: isDragging ? 0.4 : 1, cursor: isDragging ? "grabbing" : "pointer" }}
      onClick={onOpen}
    >
      <div className="flex items-center gap-1.5">
        {todo.priority !== 'none' && (
          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: PRIORITY_DOT[todo.priority] }} />
        )}
        <span className="flex-1 text-[12px] text-t1 leading-snug truncate">{todo.text}</span>
        <button onMouseDown={e => { e.stopPropagation(); onDelete(); }} className="opacity-0 group-hover:opacity-100 text-t5 hover:text-red-400 transition-all shrink-0">
          <X size={10} />
        </button>
      </div>
      {(countdown || todo.show_created_at) && (
        <div className="flex items-center justify-between gap-2">
          {countdown
            ? <span className={`text-[10px] ${countdown.overdue ? "text-red-400" : "text-t5"}`}>{countdown.label}</span>
            : <span />
          }
          {todo.show_created_at && (
            <span className="text-[10px] text-t5">{new Date(todo.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</span>
          )}
        </div>
      )}
      {todo.subtasks.length > 0 && todo.show_subtask_bar && <SubtaskProgressBar subtasks={todo.subtasks} showCount className="mt-2" />}
      {showTimer && (
        <div className="flex items-center justify-between mt-2" onMouseDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()}>
          <span className="text-[10px] text-t3 font-mono">
            {activeSession ? fmtElapsed(elapsed) : (taskSessions.length > 0 ? fmtDuration(totalDurationMs(taskSessions)) : "0s")}
          </span>
          <div className="flex items-center gap-1.5">
            {activeSession ? (
              <>
                <TipBtn label="Pause" className="p-1 rounded text-t3 hover:text-t1 transition-colors" style={{ background: "var(--c-surface-3)", border: "1px solid var(--c-border)" }} onMouseDown={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); stop(todo.id); }}><Pause size={9} /></TipBtn>
                <TipBtn label="Mark done" className="p-1 rounded transition-colors" style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)", color: "rgba(16,185,129,0.9)" }} onMouseDown={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); finish(todo.id, setStatus); }}><CheckCheck size={9} /></TipBtn>
              </>
            ) : (
              <>
                <TipBtn label="Start timer" className="p-1 rounded transition-colors" style={{ background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)", color: "rgba(147,150,255,0.9)" }} onMouseDown={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); start(todo.id); if (todo.status === 'done') setStatus(todo.id, 'in_progress'); }}><Play size={9} /></TipBtn>
                {todo.status !== 'done' && (
                  <TipBtn label="Mark done" className="p-1 rounded transition-colors" style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)", color: "rgba(16,185,129,0.9)" }} onMouseDown={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); finish(todo.id, setStatus); }}><CheckCheck size={9} /></TipBtn>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const GROUP_DRAG_PREFIX = "grp::";

function GroupBlock({ name, todos, onOpen, onDelete, isOpen, onToggle }: {
  name: string;
  todos: Todo[];
  onOpen: (id: number) => void;
  onDelete: (id: number) => void;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const [colorOverride, setColorOverride] = useState(() => getGroupColor(name));
  const color = colorOverride;
  const done = todos.filter(t => t.done).length;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: `${GROUP_DRAG_PREFIX}${name}` });
  const { active } = useDndContext();
  const anyGroupDragged = typeof active?.id === "string" && (active.id as string).startsWith(GROUP_DRAG_PREFIX);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!pickerOpen) return;
    const h = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setPickerOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [pickerOpen]);

  const startEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDraft(name);
    setEditing(true);
    setTimeout(() => nameInputRef.current?.select(), 0);
  };

  const commitEdit = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== name) {
      todos.forEach(t => useTodoStore.getState().setTodoGroup(t.id, trimmed));
    }
    setEditing(false);
  };

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        borderRadius: 6,
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-1 pt-1 select-none cursor-pointer"
        style={{ marginTop: 4, marginBottom: isOpen ? 10 : 4 }}
        onClick={editing ? undefined : onToggle}
        onDoubleClick={editing ? undefined : startEdit}
      >
        <button
          {...attributes}
          {...(editing ? {} : listeners)}
          className="text-t6 hover:text-t3 transition-colors shrink-0"
          style={{ cursor: isDragging ? "grabbing" : "grab", touchAction: "none" }}
          tabIndex={-1}
          onClick={e => e.stopPropagation()}
          onDoubleClick={e => e.stopPropagation()}
        >
          <GripVertical size={10} />
        </button>
        {/* Color bar — click to change color */}
        <div ref={pickerRef} className="relative shrink-0" onClick={e => { e.stopPropagation(); setPickerOpen(o => !o); }}>
          <span className="block w-1 h-3.5 rounded-full cursor-pointer hover:opacity-75 transition-opacity" style={{ background: color }} />
          {pickerOpen && (
            <div
              className="absolute left-3 top-0 z-50 flex gap-1 p-1.5 rounded-lg dropdown"
              style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.4)" }}
              onClick={e => e.stopPropagation()}
            >
              {GROUP_PICKER_COLORS.map(c => (
                <button
                  key={c}
                  className="w-3.5 h-3.5 rounded-full shrink-0 transition-transform hover:scale-125"
                  style={{ background: c, outline: c === color ? "2px solid white" : "none", outlineOffset: 1 }}
                  onClick={() => { saveGroupColor(name, c); setColorOverride(c); setPickerOpen(false); }}
                />
              ))}
            </div>
          )}
        </div>
        {editing ? (
          <input
            ref={nameInputRef}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={e => {
              if (e.key === "Enter") { e.preventDefault(); commitEdit(); }
              if (e.key === "Escape") { e.preventDefault(); setEditing(false); }
            }}
            onPointerDown={e => e.stopPropagation()}
            onClick={e => e.stopPropagation()}
            className="bg-transparent outline-none border-none text-[10px] font-semibold uppercase tracking-wider w-[120px] min-w-0"
            style={{ color, caretColor: color }}
            autoFocus
          />
        ) : (
          <span className="text-[10px] font-semibold uppercase tracking-wider truncate" style={{ color }}>{name}</span>
        )}
        <span className="text-[10px] shrink-0" style={{ color, opacity: 0.55 }}>{done}/{todos.length}</span>
        <div className="flex-1 h-px" style={{ background: color, opacity: 0.2 }} />
        <ChevronDown size={10} style={{ color, opacity: 0.5, flexShrink: 0, transform: isOpen ? "rotate(0deg)" : "rotate(-90deg)", transition: "transform 0.15s" }} />
      </div>
      {/* Cards */}
      {isOpen && (
        <div className="flex flex-col gap-2">
          {todos.map(t => (
            <KanbanCard key={t.id} todo={t} onOpen={() => onOpen(t.id)} onDelete={() => onDelete(t.id)} suppressSortTransform={anyGroupDragged} />
          ))}
        </div>
      )}
    </div>
  );
}

function KanbanColumn({ col, todos, onOpen, onDelete, onAddInline, onClearColumn }: {
  col: typeof KANBAN_COLS[number];
  todos: Todo[];
  onOpen: (id: number) => void;
  onDelete: (id: number) => void;
  onAddInline: (status: TodoStatus, mode: "quick" | "deadline") => void;
  onClearColumn: (status: TodoStatus) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: col.id });
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const toggleGroup = (g: string) => setOpenGroup(prev => prev === g ? null : g);

  // Build ordered group names and ungrouped cards from the pre-grouped todos array
  const orderedGroupNames: string[] = [];
  const seenGroups = new Set<string>();
  for (const t of todos) {
    if (t.group_name && !seenGroups.has(t.group_name)) {
      seenGroups.add(t.group_name);
      orderedGroupNames.push(t.group_name);
    }
  }
  const ungrouped = todos.filter(t => !t.group_name);

  return (
    <div className="flex flex-col flex-1 min-w-0 rounded-xl overflow-visible" style={{ background: "var(--c-surface-0)", border: `1px solid rgba(${col.color},0.25)` }}>
      {/* Column header */}
      <div className="flex items-center gap-2 px-3 py-2.5 shrink-0" style={{ borderBottom: "1px solid var(--c-border-subtle)", background: `rgba(${col.color},0.07)`, borderRadius: "12px 12px 0 0" }}>
        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: `rgba(${col.color},0.8)` }} />
        <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: `rgba(${col.color},0.9)` }}>{col.label}</span>
        <span className="text-[10px] text-t5 ml-1">{todos.length}</span>
        <div className="ml-auto flex items-center gap-3">
          <div className="relative">
            <TipBtn label="Add task" side="bottom" onClick={() => setAddMenuOpen(o => !o)} className="text-t5 hover:text-t2 transition-colors"><Plus size={12} /></TipBtn>
            {addMenuOpen && (
              <div
                className="absolute right-0 top-full mt-1 dropdown rounded-lg overflow-hidden z-50"
                style={{ width: 160, border: "1px solid var(--c-border)", boxShadow: "0 8px 24px rgba(0,0,0,0.35)" }}
                onMouseLeave={() => setAddMenuOpen(false)}
              >
                <button className="w-full text-left px-3 py-2 text-[12px] text-t2 hover:bg-s2 transition-colors flex items-center gap-2"
                  onClick={() => { setAddMenuOpen(false); onAddInline(col.id, "quick"); }}>
                  <Zap size={12} className="text-blue-400" /> Quick task
                </button>
                <button className="w-full text-left px-3 py-2 text-[12px] text-t2 hover:bg-s2 transition-colors flex items-center gap-2"
                  onClick={() => { setAddMenuOpen(false); onAddInline(col.id, "deadline"); }}>
                  <CalendarDays size={12} className="text-blue-400" /> With deadline
                </button>
              </div>
            )}
          </div>
          {todos.length > 0 && (
            <TipBtn label="Clear column" side="bottom" onClick={() => onClearColumn(col.id)} className="text-t6 hover:text-red-400 transition-colors"><Trash2 size={11} /></TipBtn>
          )}
        </div>
      </div>
      {/* Cards */}
      <div
        ref={setNodeRef}
        className="flex flex-col gap-2 p-2 flex-1 overflow-y-auto"
        style={{ minHeight: 60, background: isOver ? `rgba(${col.color},0.07)` : `rgba(${col.color},0.02)`, transition: "background 0.15s", scrollbarWidth: "none", borderRadius: "0 0 12px 12px" }}
      >
        <SortableContext
          items={[
            ...orderedGroupNames.flatMap(g => [
              `${GROUP_DRAG_PREFIX}${g}` as string | number,
              ...todos.filter(t => t.group_name === g).map(t => t.id as string | number),
            ]),
            ...ungrouped.map(t => t.id as string | number),
          ]}
          strategy={verticalListSortingStrategy}
        >
          {orderedGroupNames.map(g => (
            <GroupBlock
              key={g}
              name={g}
              todos={todos.filter(t => t.group_name === g)}
              onOpen={onOpen}
              onDelete={onDelete}
              isOpen={openGroup === g}
              onToggle={() => toggleGroup(g)}
            />
          ))}
          {ungrouped.length > 0 && (
            <GroupBlock
              key="__general__"
              name="General"
              todos={ungrouped}
              onOpen={onOpen}
              onDelete={onDelete}
              isOpen={openGroup === "General"}
              onToggle={() => toggleGroup("General")}
            />
          )}
        </SortableContext>
      </div>
    </div>
  );
}


function SortableCategoryTab({ cat, isActive, pendingCount, hasOverdue, onClick, onContextMenu }: {
  cat: TaskCategory; isActive: boolean; pendingCount: number; hasOverdue: boolean;
  onClick: () => void; onContextMenu: (e: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: cat.id });
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(cat.name);
  const inputRef = useRef<HTMLInputElement>(null);

  const startEdit = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDraft(cat.name);
    setEditing(true);
    setTimeout(() => { inputRef.current?.select(); }, 0);
  };

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== cat.name) {
      useTodoStore.getState().updateCategoryName(cat.id, trimmed);
    }
    setEditing(false);
  };

  return (
    <button
      ref={setNodeRef}
      {...attributes}
      {...(editing ? {} : listeners)}
      onClick={editing ? undefined : onClick}
      onContextMenu={editing ? undefined : onContextMenu}
      onDoubleClick={startEdit}
      className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-t text-[12px] shrink-0 select-none"
      style={{
        color: isActive ? `rgba(${cat.color},1)` : `rgba(${cat.color},0.5)`,
        borderBottom: isActive ? `2px solid rgba(${cat.color},0.8)` : "2px solid transparent",
        marginBottom: -1,
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        cursor: editing ? "text" : isDragging ? "grabbing" : "pointer",
      }}
    >
      <IconDisplay name={cat.icon ?? "folder"} size={11} />
      {editing ? (
        <input
          ref={inputRef}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={e => {
            if (e.key === "Enter") { e.preventDefault(); commit(); }
            if (e.key === "Escape") { e.preventDefault(); setEditing(false); }
          }}
          onPointerDown={e => e.stopPropagation()}
          onClick={e => e.stopPropagation()}
          className="bg-transparent outline-none border-none text-[12px] w-[80px] min-w-0"
          style={{ color: `rgba(${cat.color},1)`, caretColor: `rgba(${cat.color},1)` }}
          autoFocus
        />
      ) : (
        cat.name
      )}
      <span className="text-[10px] opacity-60">{pendingCount}</span>
      {hasOverdue && <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-red-500" style={{ zIndex: 10 }} />}
    </button>
  );
}




const PRIORITY_COLOR: Record<Priority, string> = { none: "var(--c-text-5)", low: "rgb(96,165,250)", medium: "rgb(251,191,36)", high: "rgb(248,113,113)" };
const PRIORITY_ORDER: Record<Priority, number> = { high: 0, medium: 1, low: 2, none: 3 };

function FocusCard({ onOpenTask }: { onOpenTask: (id: number) => void }) {
  const { todos, categories } = useTodoStore();
  const { sessions, start, stop, finish } = useTimerStore();
  const { setStatus } = useTodoStore();
  const [focusId, setFocusId] = useState<number | null>(() => {
    const v = localStorage.getItem("focus_task_id");
    return v ? Number(v) : null;
  });
  const [dropOpen, setDropOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!dropOpen && !searchOpen) return;
    const h = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setDropOpen(false);
        setSearchOpen(false);
        setSearchQuery("");
      }
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [dropOpen, searchOpen]);

  const activeTodos = todos.filter(t => t.status !== 'done');
  const todo = todos.find(t => t.id === focusId) ?? null;
  const category = todo ? (categories.find(c => c.id === todo.category_id) ?? null) : null;
  const taskSessions = todo ? sessions.filter(s => s.task_id === todo.id) : [];
  const activeSession = taskSessions.find(s => !s.ended_at) ?? null;
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!activeSession) { setElapsed(0); return; }
    const update = () => setElapsed(Date.now() - new Date(activeSession.started_at).getTime());
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [activeSession?.id]);

  const selectTask = (id: number) => {
    setFocusId(id);
    localStorage.setItem("focus_task_id", String(id));
    setDropOpen(false);
    setSearchOpen(false);
    setSearchQuery("");
  };

  const openSearch = () => {
    setDropOpen(false);
    setSearchOpen(true);
    setTimeout(() => searchInputRef.current?.focus(), 10);
  };

  const filteredTodos = (searchQuery.trim()
    ? activeTodos.filter(t => t.text.toLowerCase().includes(searchQuery.toLowerCase()))
    : activeTodos
  ).slice().sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);

  const now = useNow(todo?.due_date ?? null, todo?.due_time ?? null);
  const countdown = todo?.due_date ? formatCountdown(todo.due_date, todo.due_time, now) : null;

  const done = todo?.status === 'done';
  type Tone = "default" | "green" | "orange" | "red";
  const tone: Tone = done
    ? "green"
    : countdown?.urgency === "overdue" || countdown?.urgency === "critical" ? "red"
    : countdown?.urgency === "warning" ? "orange"
    : countdown?.urgency === "normal" ? "green"
    : "default";
  const TONE: Record<Tone, { border: string; bg: string; headerBorder: string; accent: string }> = {
    default: { border: "rgba(59,130,246,0.35)", bg: "rgba(59,130,246,0.07)", headerBorder: "rgba(59,130,246,0.15)", accent: "rgba(96,165,250,0.9)" },
    green: { border: "rgba(16,185,129,0.45)", bg: "rgba(16,185,129,0.07)", headerBorder: "rgba(16,185,129,0.2)", accent: "rgba(52,211,153,0.9)" },
    orange: { border: "rgba(251,191,36,0.45)", bg: "rgba(251,191,36,0.07)", headerBorder: "rgba(251,191,36,0.2)", accent: "rgba(251,191,36,0.9)" },
    red: { border: "rgba(239,68,68,0.45)", bg: "rgba(239,68,68,0.07)", headerBorder: "rgba(239,68,68,0.2)", accent: "rgba(248,113,113,0.9)" },
  };
  const cardBorder = `1px solid ${TONE[tone].border}`;
  const cardBg = TONE[tone].bg;
  const headerBorder = `1px solid ${TONE[tone].headerBorder}`;
  const accentColor = TONE[tone].accent;

  const catIcon = category?.icon ?? "zap";

  return (
    <div className="relative rounded-xl flex flex-col gap-0 h-full" ref={dropRef} style={{ border: cardBorder, background: cardBg }}>
      {/* Header */}
      {searchOpen ? (
        <div className="flex items-center gap-2 px-3 py-2" style={{ borderBottom: headerBorder }}>
          <Search size={10} style={{ color: accentColor, flexShrink: 0 }} />
          <input
            ref={searchInputRef}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search tasks…"
            className="flex-1 bg-transparent text-[11px] outline-none"
            style={{ color: "var(--c-text-2)" }}
          />
          <button onClick={() => { setSearchOpen(false); setSearchQuery(""); }} className="shrink-0 transition-colors" style={{ color: "var(--c-text-5)" }}>
            <X size={10} />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2 px-3 py-2" style={{ borderBottom: headerBorder }}>
          <button
            onClick={() => setDropOpen(v => !v)}
            className="flex items-center gap-1.5 min-w-0 flex-1 text-left"
          >
            <IconDisplay name={catIcon} size={11} style={{ color: accentColor, flexShrink: 0 }} />
            <span
              className="text-[13px] font-medium truncate flex-1"
              style={{ color: todo ? "var(--c-text-2)" : "var(--c-text-5)" }}
            >
              {todo ? todo.text : "Pick a task"}
            </span>
            <ChevronDown size={9} style={{ color: "var(--c-text-5)", flexShrink: 0 }} />
          </button>
          <button onClick={openSearch} className="shrink-0 transition-colors" style={{ color: "var(--c-text-5)" }}>
            <Search size={11} />
          </button>
        </div>
      )}

      {/* Task list dropdown (pick or search) */}
      {(dropOpen || (searchOpen && searchQuery.trim())) && (
        <div className="dropdown absolute left-0 right-0 z-50 py-1 overflow-y-auto rounded-b-xl" style={{ top: 33, bottom: 0 }}>
          {filteredTodos.length === 0
            ? <p className="px-3 py-2 text-[11px] text-t5">{searchQuery.trim() ? "No tasks found" : "No active tasks"}</p>
            : filteredTodos.map(t => {
                const tCat = categories.find(c => c.id === t.category_id);
                return (
                  <button key={t.id} onClick={() => selectTask(t.id)}
                    className="w-full text-left px-3 py-1.5 text-[11px] text-t2 hover:bg-s2 transition-colors flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: PRIORITY_COLOR[t.priority] }} />
                    {tCat && <IconDisplay name={tCat.icon ?? "folder"} size={10} style={{ color: `rgba(${tCat.color},0.7)`, flexShrink: 0 }} />}
                    <span className="truncate">{t.text}</span>
                  </button>
                );
              })
          }
        </div>
      )}

      {/* Body */}
      {todo ? (() => {
        const statusLabel = todo.status === 'in_progress' ? 'In Progress' : todo.status === 'done' ? 'Done' : 'To Do';
        const catColor = category ? `rgba(${category.color},0.85)` : "var(--c-text-5)";
        const PRIORITY_LABEL: Record<Priority, string> = { none: "", low: "Low", medium: "Med", high: "High" };
        const PRIORITY_BG: Record<Priority, string> = {
          none: "transparent", low: "rgba(96,165,250,0.12)",
          medium: "rgba(251,191,36,0.12)", high: "rgba(248,113,113,0.12)",
        };
        const createdLabel = (() => {
          const d = new Date(todo.created_at);
          return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        })();
        return (
          <div onClick={() => onOpenTask(todo.id)} className="text-left px-3 pt-3 pb-2.5 flex flex-col hover:bg-white/3 transition-colors flex-1 cursor-pointer" style={{ gap: 8 }}>
            {/* Meta: [Category (Status)]  [● Priority] */}
            <div className="flex items-center gap-1.5">
              <span
                className="flex items-center gap-1 text-[9px] font-medium px-2 py-0.5 rounded-full shrink-0"
                style={{ background: category ? `rgba(${category.color},0.1)` : "var(--c-surface-2)", color: catColor }}
              >
                {category?.name ?? "—"}
                <span style={{ color: "var(--c-text-5)" }}>({statusLabel})</span>
              </span>
              <span className="flex-1" />
              {todo.priority !== "none" && (
                <span
                  className="flex items-center gap-1 text-[9px] font-medium px-1.5 py-0.5 rounded-full shrink-0"
                  style={{ background: PRIORITY_BG[todo.priority], color: PRIORITY_COLOR[todo.priority] }}
                >
                  <span className="w-1 h-1 rounded-full" style={{ background: PRIORITY_COLOR[todo.priority] }} />
                  {PRIORITY_LABEL[todo.priority]}
                </span>
              )}
            </div>

            {/* Subtask progress bar (always shown when subtasks exist) */}
            {todo.subtasks.length > 0 && (
              <SubtaskProgressBar subtasks={todo.subtasks} showCount />
            )}

            {/* Timer row — time + sessions on left, action buttons spaced on the right */}
            <div
              className="flex items-center justify-between gap-3 flex-1 py-3"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex flex-col gap-1 min-w-0">
                <span className="font-mono text-[22px] leading-none tracking-tight" style={{ color: activeSession ? accentColor : "var(--c-text-2)" }}>
                  {activeSession ? fmtElapsed(elapsed) : (taskSessions.length > 0 ? fmtDuration(totalDurationMs(taskSessions)) : "0s")}
                </span>
                {taskSessions.length > 0 && (
                  <span className="text-[10px] text-t5">{taskSessions.filter(s => s.ended_at).length} session{taskSessions.filter(s => s.ended_at).length !== 1 ? "s" : ""}</span>
                )}
              </div>
              <div className="flex items-center justify-between gap-3 shrink-0">
                {activeSession ? (
                  <>
                    <TipBtn label="Pause" className="flex items-center justify-center rounded-lg transition-colors hover:opacity-80" style={{ width: 32, height: 32, background: "var(--c-surface-3)", border: "1px solid var(--c-border)", color: "var(--c-text-2)" }} onMouseDown={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); stop(todo.id); }}><Pause size={14} /></TipBtn>
                    <TipBtn label="Mark done" className="flex items-center justify-center rounded-lg transition-colors hover:opacity-80" style={{ width: 32, height: 32, background: "rgba(16,185,129,0.18)", border: "1px solid rgba(16,185,129,0.4)", color: "rgba(16,185,129,1)" }} onMouseDown={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); finish(todo.id, setStatus); }}><CheckCheck size={14} /></TipBtn>
                  </>
                ) : (
                  <>
                    <TipBtn label="Start timer" className="flex items-center justify-center rounded-lg transition-colors hover:opacity-80" style={{ width: 32, height: 32, background: "rgba(59,130,246,0.18)", border: "1px solid rgba(59,130,246,0.4)", color: "rgba(96,165,250,1)" }} onMouseDown={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); start(todo.id); if (todo.status === 'done') setStatus(todo.id, 'in_progress'); }}><Play size={14} /></TipBtn>
                    {todo.status !== 'done' && taskSessions.length > 0 && (
                      <TipBtn label="Mark done" className="flex items-center justify-center rounded-lg transition-colors hover:opacity-80" style={{ width: 32, height: 32, background: "rgba(16,185,129,0.18)", border: "1px solid rgba(16,185,129,0.4)", color: "rgba(16,185,129,1)" }} onMouseDown={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); finish(todo.id, setStatus); }}><CheckCheck size={14} /></TipBtn>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Dates at bottom — Created & Deadline */}
            <div className="flex items-center justify-between gap-3 pt-2" style={{ borderTop: headerBorder }}>
              <div className="flex flex-col gap-0.5">
                <span className="text-[9px] uppercase tracking-wider text-t5">Created</span>
                <span className="flex items-center gap-1 text-[10px]" style={{ color: "var(--c-text-3)" }}>
                  <CalendarDays size={9} />
                  {createdLabel}
                </span>
              </div>
              <div className="flex flex-col gap-0.5 items-end">
                <span className="text-[9px] uppercase tracking-wider text-t5">Deadline</span>
                {countdown ? (() => {
                  const urgencyColor: Record<Urgency, string> = {
                    normal: "rgb(52,211,153)",
                    warning: "rgb(251,191,36)",
                    critical: "rgb(248,113,113)",
                    overdue: "rgb(248,113,113)",
                  };
                  return (
                    <span className="flex items-center gap-1 text-[10px]" style={{ color: urgencyColor[countdown.urgency] }}>
                      <Timer size={9} />
                      {countdown.label}
                    </span>
                  );
                })() : (
                  <span className="text-[10px] text-t5">—</span>
                )}
              </div>
            </div>
          </div>
        );
      })() : (
        <div className="px-3 py-4 text-[11px] text-t5 text-center">Select a task to focus on</div>
      )}
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
  const weekRangeLabel = (() => {
    const jan4 = new Date(year, 0, 4);
    const mon = new Date(jan4);
    mon.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7) + (kw - 1) * 7);
    const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
    const fmt = (d: Date) => d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
    return `${fmt(mon)} – ${fmt(sun)}`;
  })();
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
      <p className="text-[13px] font-medium text-t2">{weekRangeLabel}</p>
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
  const { todos, trash, categories, deletedCategories, loading, load, add, loadCategories, addCategory, removeCategory, updateCategoryName, updateCategoryColor, updateCategoryIcon, reorderCategories, loadTrash, restore, deletePermanently, deleteAllPermanently, deleteGroupPermanently, checkDueTodos, hasUnread: todoHasUnread, clearUnread: clearTodoUnread, setQuery, setStatus, setTodoGroup } = useTodoStore();
  const { reminders: allReminders, checkDue, load: loadReminders, trash: reminderTrash, loadTrash: loadReminderTrash, restore: restoreReminder, deletePermanently: deleteReminderPermanently, deleteAllPermanently: deleteAllRemindersPermanently, hasUnread: reminderHasUnread, clearUnread: clearReminderUnread } = useReminderStore();
  const { notes, add: addNote, load: loadNotes, trash: noteTrash, loadTrash: loadNoteTrash, restore: restoreNote, deletePermanently: deleteNotePermanently, deleteAllPermanently: deleteAllNotesPermanently } = useNotesStore();
  const { entries: ihkEntries, load: loadIHK, modules: ihkModules } = useIHKStore();
  const { defaultSort, defaultPriority, theme, textSize, windowMode } = useSettingsStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const [inputVal, setInputVal] = useState("");
  const [focusedIdx, setFocusedIdx] = useState<number>(-1);
  const [visible, setVisible] = useState(false);
  const [preTrashView, setPreTrashView] = useState<View>("main");
  type View = "main" | "todos" | "trash" | "reminders" | "notes" | "ihk" | "dev" | "settings";
  type NavView = "main" | "todos" | "reminders" | "notes" | "ihk" | "dev" | "settings";
  const [view, setView] = useState<View>("main");
  const [lastNavView, setLastNavView] = useState<NavView>("main");

  const navigate = useCallback((v: View) => {
    if (v === "main" || v === "todos" || v === "reminders" || v === "notes" || v === "ihk" || v === "dev" || v === "settings") setLastNavView(v);
    setView(v);
  }, []);
  const [addTaskOpen, setAddTaskOpen] = useState<false | "quick" | "deadline">(false);
  const [addTaskMenuOpen, setAddTaskMenuOpen] = useState(false);
  const addTaskBtnRef = useRef<HTMLButtonElement>(null);
  const [pendingModal, setPendingModal] = useState<{ type: "task" | "reminder"; text: string } | null>(null);
  const [aiMode, setAiMode] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiTaskPreview, setAiTaskPreview] = useState<import("./taskAI").GeneratedTask | null>(null);
  const aiInputRef = useRef<HTMLTextAreaElement>(null);
  const [cmdIdx, setCmdIdx] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState<{ title: string; message: string; onConfirm: () => void; confirmLabel?: string; confirmClassName?: string } | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [openTrashGroup, setOpenTrashGroup] = useState<string | null>(null);
  const [todoFilter] = useState<TodoFilter>("all");
  const [todoSort] = useState<TodoSort>("manual");
  const [selectedTodoId, setSelectedTodoId] = useState<number | null>(null);
  const [activeCategoryId, setActiveCategoryId] = useState<number>(1);
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [catContextMenu, setCatContextMenu] = useState<{ cat: TaskCategory; x: number; y: number } | null>(null);
  const [catEditModal, setCatEditModal] = useState<TaskCategory | null>(null);
  const [pendingKanbanStatus, setPendingKanbanStatus] = useState<TodoStatus | null>(null);
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
    const applySize = () => {
      if (windowMode === "compact") {
        win.setSize({ type: "Logical", width: 640, height: 480 } as any);
      } else {
        win.setSize({ type: "Logical", width: 1200, height: 800 } as any);
      }
    };
    applySize();
    const unlisten = win.onFocusChanged(({ payload: focused }) => { if (focused) applySize(); });
    return () => { unlisten.then(f => f()); };
  }, [windowMode]);

  // Load todos on mount + request notification permission early
  const { load: loadTimers } = useTimerStore();
  const { load: loadDev, trashedItems: devTrashedItems, trashedCategories: devTrashedCategories, trashedSections: devTrashedSections, categories: devCategories, sections: devSections, loadTrashed: loadDevTrash, restoreItem: restoreDevItem, permanentDeleteItem: permanentDeleteDevItem, clearDevTrash, resetDevContent } = useDevStore();
  useEffect(() => { load(); loadReminders(); loadNotes(); loadIHK(); loadCategories(); loadTimers(); loadDev(); initNotifications(); logActivity(); runAutoBackup(true); migrateImagesToFilesystem(); }, [load, loadReminders, loadNotes, loadIHK, loadCategories, loadTimers, loadDev]);

  // Idle detection + sleep detection: poll macOS for idle time while a timer is running
  useEffect(() => {
    let lastTickMs: number | null = null;
    const POLL_MS = 30_000;
    const SLEEP_GAP_MS = 60_000; // gap > 60s between polls ⇒ system was asleep (2× polling interval)
    const tick = async () => {
      const now = Date.now();
      const prev = lastTickMs;
      lastTickMs = now;
      try {
        const timer = useTimerStore.getState();
        const running = timer.runningSession();
        if (!running) return;
        const idleProbe = await invoke<number>("get_idle_seconds").catch(() => -1);
        const displayProbe = await invoke<boolean>("is_display_asleep").catch(() => false);
        // Detect system sleep — auto-stop at the last known active moment
        if (prev !== null && now - prev > SLEEP_GAP_MS) {
          const stopIso = new Date(prev).toISOString().slice(0, 19) + "Z";
          await timer.updateSession(running.id, running.started_at, stopIso);
          const sleptMin = Math.round((now - prev) / 60000);
          const detail = `Mac was asleep ${sleptMin} min`;
          await notify("Slate · Timer stopped", detail);
          const sessionMs = prev - new Date(running.started_at).getTime();
          timer.setAutoStop({
            taskId: running.task_id,
            reason: "system_sleep",
            sessionDurationMs: Math.max(0, sessionMs),
            stoppedAtMs: prev,
            detail,
          });
          return;
        }
        // Detect display sleep / screen lock — auto-stop at the last input moment
        if (displayProbe) {
          const stopMs = now - idleProbe * 1000;
          const stopIso = new Date(stopMs).toISOString().slice(0, 19) + "Z";
          await timer.updateSession(running.id, running.started_at, stopIso);
          const detail = "Display went to sleep";
          await notify("Slate · Timer stopped", detail);
          const sessionMs = stopMs - new Date(running.started_at).getTime();
          timer.setAutoStop({
            taskId: running.task_id,
            reason: "display_sleep",
            sessionDurationMs: Math.max(0, sessionMs),
            stoppedAtMs: stopMs,
            detail,
          });
          return;
        }
        const threshold = Math.max(60, (useSettingsStore.getState().idleThresholdMinutes || 5) * 60);
        timer.observeIdle(idleProbe, threshold);
      } catch (e) {
        console.warn("idle poll failed", e);
      }
    };
    void tick();
    const id = setInterval(tick, POLL_MS);
    const onFocus = () => { void tick(); };
    window.addEventListener("focus", onFocus);
    return () => { clearInterval(id); window.removeEventListener("focus", onFocus); };
  }, []);

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
    loadDevTrash();
    navigate("trash");
  }, [view, loadTrash, loadReminderTrash, loadNoteTrash, loadDevTrash]);


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

  const enterAiMode = useCallback(() => {
    setAiMode(true);
    setAiPrompt("");
    setAiError(null);
    setTimeout(() => aiInputRef.current?.focus(), 30);
  }, []);

  const exitAiMode = useCallback(() => {
    setAiMode(false);
    setAiPrompt("");
    setAiError(null);
    setAiLoading(false);
    setTimeout(() => inputRef.current?.focus(), 30);
  }, []);

  const runAiGenerate = useCallback(async () => {
    const prompt = aiPrompt.trim();
    if (!prompt || aiLoading) return;
    setAiLoading(true);
    setAiError(null);
    try {
      const { generateTaskFromPrompt } = await import("./taskAI");
      const activeCat = useTodoStore.getState().categories.find(c => c.id === activeCategoryId);
      const generated = await generateTaskFromPrompt(prompt, activeCat?.name ?? "General");
      setAiTaskPreview(generated);
    } catch (e: unknown) {
      setAiError(e instanceof Error ? e.message : String(e));
    } finally {
      setAiLoading(false);
    }
  }, [aiPrompt, aiLoading]);

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
      // IHK quick entry: /i ModuleName text → save to current week as "ModuleName: text"
      if (e.key === "Enter" && inputVal.startsWith("/i ")) {
        const rest = inputVal.slice(3).trim();
        const startsWithModule = (name: string) =>
          rest.toLowerCase().startsWith(name.toLowerCase() + " ") ||
          rest.toLowerCase().startsWith(name.toLowerCase() + ": ");
        const fixedMatch = FIXED_PICKER.find(f => startsWithModule(f.name));
        const modMatch = ihkModules.find(m => startsWithModule(m.name));
        const matched = fixedMatch ?? (modMatch ? { name: modMatch.name, category: 2 as const } : null);
        if (matched) {
          const rawContent = rest.slice(matched.name.length).trim().replace(/^:\s*/, "");
          if (rawContent) {
            const text = `${matched.name}: ${rawContent}`;
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
        add(val, defaultPriority, null, null, activeCategoryId);
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

  const VIEW_TITLE: Record<View, string> = { main: "Slate", todos: "Tasks", trash: "Deleted", reminders: "Reminders", notes: "Notes", ihk: "IHK Records", dev: "Dev Checklist", settings: "Settings" };

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
              borderBottomColor: (inputFocused || aiMode) ? "rgba(180,180,190,0.35)" : "var(--c-border-subtle)",
              boxShadow: (inputFocused || aiMode) ? "0 1px 0 0 rgba(180,180,190,0.1)" : "none",
            }}
          >
            {aiMode ? (
              <>
                <Sparkles size={13} className="text-indigo-400 shrink-0" />
                <textarea
                  ref={aiInputRef}
                  value={aiPrompt}
                  onChange={e => setAiPrompt(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); runAiGenerate(); }
                    else if (e.key === "Escape") { e.preventDefault(); exitAiMode(); }
                  }}
                  placeholder={aiLoading ? "Generating…" : "Describe what you want to do — I'll fill in a task for you"}
                  disabled={aiLoading}
                  rows={1}
                  className="flex-1 bg-transparent text-t1 placeholder-themed text-sm outline-none resize-none py-2 disabled:opacity-50"
                />
                {aiLoading ? (
                  <span className="text-[11px] text-t4 shrink-0">Generating…</span>
                ) : (
                  <>
                    <button
                      onClick={runAiGenerate}
                      disabled={!aiPrompt.trim()}
                      className="text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors disabled:opacity-40 shrink-0"
                    >
                      Generate
                    </button>
                    <button
                      onClick={exitAiMode}
                      className="text-t4 hover:text-t2 transition-colors shrink-0"
                    >
                      <X size={11} />
                    </button>
                  </>
                )}
              </>
            ) : (
              <>
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
                <TipBtn
                  label="AI prompt → task"
                  side="bottom"
                  onClick={enterAiMode}
                  className="text-t4 hover:text-indigo-400 transition-colors shrink-0"
                >
                  <Sparkles size={13} />
                </TipBtn>
              </>
            )}
          </div>
          {aiMode && aiError && (
            <div className="px-5 py-2 text-[11px] text-red-400 shrink-0" style={{ borderBottom: "1px solid var(--c-border-subtle)" }}>{aiError}</div>
          )}

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

            {/* Activity heatmap + focus */}
            <div className="flex gap-3 items-stretch" style={{ minHeight: 230 }}>
              <div className="flex-1 min-w-0 h-full"><ActivityHeatmap /></div>
              <div className="shrink-0 flex flex-col" style={{ width: "calc(25% - 9px)" }}><FocusCard onOpenTask={(id) => setSelectedTodoId(id)} /></div>
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
          {addTaskOpen && <AddTaskModal
            withDeadline={addTaskOpen === "deadline"}
            categoryId={activeCategoryId}
            lockedCategoryId={pendingKanbanStatus != null ? activeCategoryId : undefined}
            initialStatus={pendingKanbanStatus ?? undefined}
            onClose={async () => {
            setAddTaskOpen(false);
            if (pendingKanbanStatus && pendingKanbanStatus !== 'todo') {
              // apply status to most recently added task in this category
              const latest = useTodoStore.getState().todos.find(t => t.category_id === activeCategoryId && t.status === 'todo');
              if (latest) await setStatus(latest.id, pendingKanbanStatus);
            }
            setPendingKanbanStatus(null);
          }} />}

          {/* Add category modal */}
          {showAddCategoryModal && (
            <CategoryModal
              title="New category"
              submitLabel="Create"
              onSubmit={(name, color, icon) => addCategory(name, color, icon)}
              onClose={() => setShowAddCategoryModal(false)}
            />
          )}
          {/* Edit category modal */}
          {catEditModal && (
            <CategoryModal
              title="Edit category"
              initialName={catEditModal.name}
              initialColor={catEditModal.color}
              initialIcon={catEditModal.icon ?? "folder"}
              onSubmit={async (name, color, icon) => {
                if (name !== catEditModal.name) await updateCategoryName(catEditModal.id, name);
                if (color !== catEditModal.color) await updateCategoryColor(catEditModal.id, color);
                if (icon !== (catEditModal.icon ?? "folder")) await updateCategoryIcon(catEditModal.id, icon);
              }}
              onDelete={catEditModal.id !== 1 ? () => askConfirm("Delete category?", `"${catEditModal.name}" will be deleted. All its tasks will be moved to trash.`, () => removeCategory(catEditModal.id)) : undefined}
              onClose={() => setCatEditModal(null)}
            />
          )}
          {/* Category tabs row */}
          <div className="flex items-center gap-0 px-2 pt-1.5 shrink-0" style={{ borderBottom: "1px solid var(--c-border-subtle)" }}>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={(event: DragEndEvent) => {
                const { active, over } = event;
                if (!over || active.id === over.id) return;
                const oldIdx = categories.findIndex(c => c.id === active.id);
                const newIdx = categories.findIndex(c => c.id === over.id);
                if (oldIdx === -1 || newIdx === -1) return;
                const reordered = [...categories];
                reordered.splice(oldIdx, 1);
                reordered.splice(newIdx, 0, categories[oldIdx]);
                reorderCategories(reordered.map(c => c.id));
              }}
            >
              <SortableContext items={categories.map(c => c.id)} strategy={horizontalListSortingStrategy}>
                <div className="flex items-center gap-0.5 flex-1 overflow-x-auto category-tabs-scroll">
                  {categories.map(cat => {
                    const nowMs = Date.now();
                    const pendingCount = todos.filter(t => t.category_id === cat.id && !t.done).length;
                    const hasOverdue = todos.some(t =>
                      t.category_id === cat.id && !t.done && t.due_date &&
                      buildDueDate(t.due_date, t.due_time).getTime() < nowMs
                    );
                    return (
                      <SortableCategoryTab
                        key={cat.id}
                        cat={cat}
                        isActive={activeCategoryId === cat.id}
                        pendingCount={pendingCount}
                        hasOverdue={hasOverdue}
                        onClick={() => setActiveCategoryId(cat.id)}
                        onContextMenu={e => { e.preventDefault(); const r = e.currentTarget.getBoundingClientRect(); setCatContextMenu({ cat, x: r.left, y: r.bottom + 1 }); }}
                      />
                    );
                  })}
                </div>
              </SortableContext>
            </DndContext>
            {/* Add category */}
            <Tooltip label="Add category">
              <button
                onClick={() => setShowAddCategoryModal(true)}
                className="p-1.5 rounded text-blue-400 hover:text-blue-300 hover:bg-s1 transition-colors shrink-0 mr-1"
              >
                <FolderPlus size={11} />
              </button>
            </Tooltip>
            <div className="relative shrink-0 mr-2">
              <Tooltip label="Add task">
                <button
                  ref={addTaskBtnRef}
                  onClick={() => setAddTaskMenuOpen((o) => !o)}
                  className="p-1 rounded text-blue-400 hover:text-blue-300 hover:bg-s1 transition-colors"
                >
                  <Plus size={12} />
                </button>
              </Tooltip>
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


          {/* FilterBar */}
          {/* Kanban board */}
          <div className="flex flex-row gap-3 flex-1 overflow-x-hidden overflow-y-visible p-3">
            {loading ? (
              <div className="flex-1 flex items-center justify-center text-t5 text-sm select-none">Loading…</div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={((args) => {
                  if (typeof args.active.id === "string" && (args.active.id as string).startsWith(GROUP_DRAG_PREFIX)) {
                    // Collide with other group blocks OR column drop zones when dragging a group
                    const groupDroppables = args.droppableContainers.filter(c => {
                      const id = c.id as string;
                      return (typeof id === "string" && id.startsWith(GROUP_DRAG_PREFIX) && id !== args.active.id) ||
                        KANBAN_COLS.some(col => col.id === id);
                    });
                    return closestCenter({ ...args, droppableContainers: groupDroppables });
                  }
                  // Normal card collision — exclude group droppables so they don't interfere
                  const cardDroppables = args.droppableContainers.filter(
                    c => typeof c.id !== "string" || !(c.id as string).startsWith(GROUP_DRAG_PREFIX)
                  );
                  return closestCenter({ ...args, droppableContainers: cardDroppables });
                }) as CollisionDetection}
                onDragEnd={(event: DragEndEvent) => {
                  const { active, over } = event;
                  if (!over) return;
                  const activeId = active.id;
                  const overId = over.id;

                  // ── Group header drag ──────────────────────────────────
                  if (typeof activeId === "string" && activeId.startsWith(GROUP_DRAG_PREFIX)) {
                    const activeGroup = activeId.slice(GROUP_DRAG_PREFIX.length);
                    // Dropped on a column → move all tasks in the group to that status
                    const targetCol = KANBAN_COLS.find(c => c.id === overId);
                    if (targetCol) {
                      todos
                        .filter(t =>
                          (activeGroup === "General" ? !t.group_name : t.group_name === activeGroup) &&
                          t.category_id === activeCategoryId
                        )
                        .forEach(t => setStatus(t.id, targetCol.id));
                      return;
                    }
                    if (typeof overId !== "string" || !overId.startsWith(GROUP_DRAG_PREFIX)) return;
                    const overGroup = overId.slice(GROUP_DRAG_PREFIX.length);
                    if (activeGroup === overGroup) return;
                    // "General" is the display sentinel for tasks with group_name = null
                    const groupTodo = todos.find(t =>
                      (activeGroup === "General" ? !t.group_name : t.group_name === activeGroup) &&
                      t.category_id === activeCategoryId
                    );
                    if (!groupTodo) return;
                    const status = groupTodo.status;
                    const rawCol = todos.filter(t => t.category_id === activeCategoryId && t.status === status);
                    const colDisplay = groupTodosForDisplay(rawCol);
                    // Build ordered group list — map null to "General"
                    const groupOrder: string[] = [];
                    const seenG = new Set<string>();
                    for (const t of colDisplay) {
                      const g = t.group_name ?? "General";
                      if (!seenG.has(g)) { seenG.add(g); groupOrder.push(g); }
                    }
                    const oldIdx = groupOrder.indexOf(activeGroup);
                    const newIdx = groupOrder.indexOf(overGroup);
                    if (oldIdx === -1 || newIdx === -1) return;
                    const newGroupOrder = arrayMove([...groupOrder], oldIdx, newIdx);
                    const reordered = newGroupOrder.flatMap(g =>
                      g === "General"
                        ? colDisplay.filter(t => !t.group_name)
                        : colDisplay.filter(t => t.group_name === g)
                    );
                    const otherTodos = todos.filter(t => !(t.category_id === activeCategoryId && t.status === status));
                    useTodoStore.getState().reorder([...otherTodos, ...reordered].map(t => t.id));
                    return;
                  }

                  // ── Card drag ─────────────────────────────────────────
                  const cardId = activeId as number;
                  // dropped on a column droppable
                  const col = KANBAN_COLS.find(c => c.id === overId);
                  if (col) { setStatus(cardId, col.id); return; }
                  // dropped on another card
                  const overTodo = todos.find(t => t.id === overId);
                  const activeTodo = todos.find(t => t.id === cardId);
                  if (!overTodo || !activeTodo) return;
                  if (overTodo.status !== activeTodo.status) {
                    setStatus(cardId, overTodo.status);
                  } else {
                    const rawCol = todos.filter(t => t.category_id === activeCategoryId && t.status === activeTodo.status);
                    const colTodos = groupTodosForDisplay(rawCol);
                    const oldIdx = colTodos.findIndex(t => t.id === cardId);
                    const newIdx = colTodos.findIndex(t => t.id === Number(overId));
                    if (oldIdx === -1 || newIdx === -1 || oldIdx === newIdx) return;
                    const reordered = arrayMove([...colTodos], oldIdx, newIdx);
                    const prevGroup = newIdx > 0 ? (reordered[newIdx - 1].group_name ?? null) : null;
                    const nextGroup = newIdx < reordered.length - 1 ? (reordered[newIdx + 1].group_name ?? null) : null;
                    const neighborGroup = prevGroup ?? nextGroup;
                    if (neighborGroup !== (activeTodo.group_name ?? null)) {
                      reordered[newIdx] = { ...reordered[newIdx], group_name: neighborGroup };
                      setTodoGroup(cardId, neighborGroup);
                    }
                    const otherTodos = todos.filter(t => !(t.category_id === activeCategoryId && t.status === activeTodo.status));
                    useTodoStore.getState().reorder([...otherTodos, ...reordered].map(t => t.id));
                  }
                }}
              >
                {KANBAN_COLS.map(col => (
                  <KanbanColumn
                    key={col.id}
                    col={col}
                    todos={groupTodosForDisplay(todos.filter(t => t.category_id === activeCategoryId && t.status === col.id))}
                    onOpen={id => setSelectedTodoId(id)}
                    onDelete={id => askConfirm("Delete task?", `This task will be moved to trash.`, () => useTodoStore.getState().remove(id))}
                    onAddInline={(status, mode) => {
                      setAddTaskOpen(mode);
                      setPendingKanbanStatus(status);
                    }}
                    onClearColumn={status => {
                      const colLabel = KANBAN_COLS.find(c => c.id === status)?.label ?? status;
                      const colTodos = todos.filter(t => t.category_id === activeCategoryId && t.status === status);
                      askConfirm(`Clear "${colLabel}"?`, `${colTodos.length} task${colTodos.length !== 1 ? "s" : ""} will be moved to trash.`, () => {
                        colTodos.forEach(t => useTodoStore.getState().remove(t.id));
                      }, "Clear");
                    }}
                  />
                ))}
              </DndContext>
            )}
          </div>
        </div>
      )}

      {/* Task detail modal */}
      {selectedTodo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)" }} onMouseDown={e => { if (e.target === e.currentTarget) setSelectedTodoId(null); }}>
          <div className="dropdown rounded-xl shadow-2xl flex flex-col" style={{ width: 1100, height: "88vh", border: "1px solid var(--c-border)" }}>
            <div className="flex items-center gap-2 px-4 py-3 shrink-0" style={{ borderBottom: "1px solid var(--c-border-subtle)" }}>
              <TaskTitleInput todo={selectedTodo} />
              <button onClick={() => setSelectedTodoId(null)} className="text-t4 hover:text-t2 transition-colors shrink-0"><X size={13} /></button>
            </div>
            <TaskDetail todo={selectedTodo} onClose={() => setSelectedTodoId(null)} askConfirm={askConfirm} />
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
                    <span className="text-[10px] text-t4 uppercase tracking-wider">{trash.length} deleted</span>
                    <button onClick={() => askConfirm("Delete all tasks?", "All deleted tasks will be permanently removed.", () => deleteAllPermanently())} className="text-[10px] text-red-400/60 hover:text-red-400 transition-colors">Delete all</button>
                  </div>
                  {(() => {
                    const catIds = new Set(categories.map(c => c.id));
                    const groups: { key: string; catId: number | null; label: string; color: string; items: typeof trash }[] = categories
                      .map(cat => ({ key: String(cat.id), catId: cat.id, label: cat.name, color: cat.color, items: trash.filter(t => (t.category_id ?? 1) === cat.id) }))
                      .filter(g => g.items.length > 0);
                    // orphans: tasks whose category_id is not in active categories
                    const orphanTasks = trash.filter(t => !catIds.has(t.category_id ?? 1));
                    // group orphans by their category_id, using deleted_categories for name/color
                    const orphanCatIds = [...new Set(orphanTasks.map(t => t.category_id ?? 1))];
                    orphanCatIds.forEach(cid => {
                      const dc = deletedCategories.find(d => d.id === cid);
                      groups.push({ key: `del-${cid}`, catId: cid, label: dc?.name ?? "Deleted Category", color: dc?.color ?? "156,163,175", items: orphanTasks.filter(t => (t.category_id ?? 1) === cid) });
                    });
                    return groups.map(({ key, catId, label, color, items }) => {
                      const collapsed = openTrashGroup !== key;
                      const toggleCollapse = () => setOpenTrashGroup(prev => prev === key ? null : key);
                      const isDeleted = key.startsWith("del-");
                      return (
                        <div key={key}>
                          <div className="flex items-center gap-2 px-5 py-1.5 mt-1 group/hdr cursor-pointer select-none" onClick={toggleCollapse}>
                            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: `rgba(${color},0.7)` }} />
                            <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: `rgba(${color},0.7)` }}>{label}</span>
                            <span className="text-[10px] text-t6">{items.length}</span>
                            <ChevronDown size={10} className="text-t6 transition-transform ml-0.5" style={{ transform: collapsed ? "rotate(-90deg)" : "rotate(0deg)" }} />
                            <button
                              onClick={e => { e.stopPropagation(); askConfirm(`Delete "${label}" permanently?`, `${items.length} task${items.length !== 1 ? "s" : ""} will be permanently removed.`, () => { items.forEach(t => deletePermanently(t.id)); if (isDeleted && catId != null) deleteGroupPermanently(catId); }); }}
                              className="ml-auto opacity-0 group-hover/hdr:opacity-100 text-t5 hover:text-red-400 transition-all"
                            ><Trash2 size={11} /></button>
                          </div>
                          {!collapsed && items.map(todo => (
                            <div key={todo.id} className="group flex items-center gap-3 px-5 border-b border-s hover:bg-s1 transition-colors" style={{ minHeight: 48 }}>
                              {(() => { const sc = KANBAN_COLS.find(c => c.id === (todo.status || (todo.done ? 'done' : 'todo'))); return sc ? <span className="w-1.5 h-1.5 rounded-full shrink-0" title={sc.label} style={{ background: `rgba(${sc.color},0.8)` }} /> : null; })()}
                              <span className="flex-1 text-[14px] text-t3 line-through truncate">{todo.text}</span>
                              <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => restore(todo.id)} title="Restore" className="w-6 h-6 flex items-center justify-center rounded hover:bg-s3 transition-colors text-t4 hover:text-green-400"><RotateCcw size={12} /></button>
                                <button onClick={() => askConfirm("Delete permanently?", "This cannot be undone.", () => deletePermanently(todo.id))} className="w-6 h-6 flex items-center justify-center rounded hover:bg-s3 transition-colors text-t4 hover:text-red-400"><X size={10} /></button>
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    });
                  })()}
                </>
          )}
          {preTrashView === "reminders" && (
            reminderTrash.length === 0
              ? <div className="px-5 py-10 text-center text-t5 text-sm select-none">No deleted reminders</div>
              : <>
                  <div className="flex items-center justify-between px-5 py-1.5">
                    <span className="text-[10px] text-t4 uppercase tracking-wider">{reminderTrash.length} deleted</span>
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
                    <span className="text-[10px] text-t4 uppercase tracking-wider">{noteTrash.length} deleted</span>
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
          {preTrashView === "dev" && (
            devTrashedItems.length === 0
              ? <div className="px-5 py-10 text-center text-t5 text-sm select-none">No deleted items</div>
              : <>
                  <div className="flex items-center justify-between px-5 py-1.5">
                    <span className="text-[10px] text-t4 uppercase tracking-wider">{devTrashedItems.length} deleted</span>
                    <button onClick={() => askConfirm("Delete all dev items?", "All deleted dev items will be permanently removed.", () => clearDevTrash())} className="text-[10px] text-red-400/60 hover:text-red-400 transition-colors">Delete all</button>
                  </div>
                  {(() => {
                    // Merge active + soft-deleted categories so we can show proper names for deleted ones
                    const allCats = [...devCategories, ...devTrashedCategories];
                    const knownCatIds = new Set(allCats.map(c => c.id));
                    const catGroups = allCats
                      .map(cat => ({ ...cat, items: devTrashedItems.filter(i => i.category_id === cat.id) }))
                      .filter(g => g.items.length > 0);
                    const orphans = devTrashedItems.filter(i => !knownCatIds.has(i.category_id));
                    if (orphans.length > 0) catGroups.push({ id: -1, name: "Unknown Category", color: "156,163,175", icon: "layers", position: 999, is_preset: false, section_id: -1, items: orphans });

                    // Group category groups by section_id
                    const bySectionId = new Map<number, typeof catGroups>();
                    for (const g of catGroups) {
                      if (!bySectionId.has(g.section_id)) bySectionId.set(g.section_id, []);
                      bySectionId.get(g.section_id)!.push(g);
                    }

                    // Build ordered entries: known sections first, then deleted sections, then orphans
                    const sectionEntries: Array<{ label: string; key: string; cats: typeof catGroups }> = [];
                    for (const sec of [...devSections, ...devTrashedSections]) {
                      const cats = bySectionId.get(sec.id);
                      if (cats) sectionEntries.push({ label: sec.name, key: `sec-${sec.id}`, cats });
                    }
                    for (const [sid, cats] of bySectionId) {
                      if (sid !== -1 && !devSections.find(s => s.id === sid) && !devTrashedSections.find(s => s.id === sid))
                        sectionEntries.push({ label: "Deleted Page", key: `sec-del-${sid}`, cats });
                    }
                    const orphanCats = bySectionId.get(-1);
                    if (orphanCats) sectionEntries.push({ label: "Deleted Page", key: "sec-orphan", cats: orphanCats });

                    const multiSection = sectionEntries.length > 1;

                    return sectionEntries.map(({ label, key: secKey, cats }) => (
                      <div key={secKey}>
                        {multiSection && (
                          <div className="px-5 pt-3 pb-0.5 flex items-center gap-2">
                            <span className="text-[9px] text-t6 uppercase tracking-widest font-semibold">{label}</span>
                            <span className="flex-1 h-px" style={{ background: "var(--c-border-subtle)" }} />
                          </div>
                        )}
                        {cats.map(({ id, name, color, items }) => {
                          const key = `dev-${id}`;
                          const collapsed = openTrashGroup !== key;
                          return (
                            <div key={key}>
                              <div className="flex items-center gap-2 px-5 py-1.5 mt-1 group/hdr cursor-pointer select-none" onClick={() => setOpenTrashGroup(prev => prev === key ? null : key)}>
                                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: `rgba(${color},0.7)` }} />
                                <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: `rgba(${color},0.7)` }}>{name}</span>
                                <span className="text-[10px] text-t6">{items.length}</span>
                                <ChevronDown size={10} className="text-t6 transition-transform ml-0.5" style={{ transform: collapsed ? "rotate(-90deg)" : "rotate(0deg)" }} />
                                <button
                                  onClick={e => { e.stopPropagation(); askConfirm(`Delete "${name}" permanently?`, `${items.length} item${items.length !== 1 ? "s" : ""} will be permanently removed.`, () => items.forEach(i => permanentDeleteDevItem(i.id))); }}
                                  className="ml-auto opacity-0 group-hover/hdr:opacity-100 text-t5 hover:text-red-400 transition-all"
                                ><Trash2 size={11} /></button>
                              </div>
                              {!collapsed && items.map(item => (
                                <div key={item.id} className="group flex items-center gap-3 px-5 border-b border-s hover:bg-s1 transition-colors" style={{ minHeight: 48 }}>
                                  <span className="flex-1 text-[14px] text-t3 line-through truncate">{item.text}</span>
                                  <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => restoreDevItem(item.id)} title="Restore" className="w-6 h-6 flex items-center justify-center rounded hover:bg-s3 transition-colors text-t4 hover:text-green-400"><RotateCcw size={12} /></button>
                                    <button onClick={() => askConfirm("Delete permanently?", "This cannot be undone.", () => permanentDeleteDevItem(item.id))} className="w-6 h-6 flex items-center justify-center rounded hover:bg-s3 transition-colors text-t4 hover:text-red-400"><X size={10} /></button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          );
                        })}
                      </div>
                    ));
                  })()}
                </>
          )}
        </div>
      )}

      {/* Reminders view */}
      {view === "reminders" && <RemindersPage key="reminders" onDeleteRequest={(id) => { const r = useReminderStore.getState().reminders.find(r => r.id === id); askConfirm("Delete reminder?", `"${r?.text ?? "This reminder"}" will be deleted.`, () => useReminderStore.getState().remove(id)); }} onConfirm={askConfirm} />}

      {/* Notes view */}
      {view === "notes" && <NotesPage onDeleteRequest={(id) => { const n = useNotesStore.getState().notes.find(n => n.id === id); askConfirm("Delete note?", `"${n?.title ?? "This note"}" will be permanently deleted.`, () => useNotesStore.getState().remove(id)); }} />}
      {view === "ihk" && <IHKPage onConfirm={askConfirm} />}
      {view === "dev" && <DevPage />}
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
                : view === "dev"
                ? (() => { const { items } = useDevStore.getState(); return `${items.length} item${items.length !== 1 ? "s" : ""}`; })()
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
                    background: lastNavView === "todos" ? "rgba(59,130,246,0.15)" : lastNavView === "reminders" ? "rgba(99,102,241,0.15)" : lastNavView === "notes" ? "rgba(16,185,129,0.15)" : lastNavView === "ihk" ? "rgba(251,191,36,0.15)" : lastNavView === "dev" ? "rgba(14,165,233,0.15)" : "var(--c-surface-3)",
                    left: "2px",
                    transform: `translateX(${lastNavView === "main" ? "0px" : lastNavView === "todos" ? "32px" : lastNavView === "reminders" ? "64px" : lastNavView === "notes" ? "96px" : lastNavView === "ihk" ? "128px" : lastNavView === "dev" ? "160px" : "192px"})`,
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
                  onClick={() => navigate("dev")}
                  className={`group/btn relative z-10 w-7 h-5 flex items-center justify-center transition-colors duration-200 ${lastNavView === "dev" ? "text-sky-400" : "text-t4 hover:text-t2"}`}
                >
                  <span className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded text-[10px] text-t2 whitespace-nowrap opacity-0 group-hover/btn:opacity-100 transition-opacity duration-150" style={{ background: "var(--c-tooltip)", border: "1px solid var(--c-border)" }}>Dev</span>
                  <Code2 size={14} />
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
              {view === "dev" && (
                <div className="group/reset relative">
                  <button
                    onClick={() => askConfirm("Reset dev checklist?", "All pages, categories and items will be replaced with the default checklist. This cannot be undone.", () => resetDevContent(), "Reset")}
                    className="w-7 h-5 flex items-center justify-center text-t4 hover:text-red-400 transition-colors"
                  >
                    <RotateCcw size={13} />
                  </button>
                  <span className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded text-[10px] text-t2 whitespace-nowrap opacity-0 group-hover/reset:opacity-100 transition-opacity duration-150" style={{ background: "var(--c-tooltip)", border: "1px solid var(--c-border)" }}>Reset checklist</span>
                </div>
              )}
              {(view === "todos" || view === "reminders" || view === "notes" || view === "dev") && (
                <div className="group/trash relative">
                  <button
                    onClick={openTrash}
                    className="w-7 h-5 flex items-center justify-center text-t4 hover:text-red-400 transition-colors"
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

      {aiTaskPreview && (
        <AITaskReviewModal
          task={aiTaskPreview}
          defaultCategoryId={activeCategoryId}
          onClose={() => { setAiTaskPreview(null); exitAiMode(); }}
          onCreated={() => { setAiTaskPreview(null); exitAiMode(); navigate("todos"); }}
        />
      )}

    </div>

    {/* Context menus rendered outside scaled container so fixed coords are viewport-relative */}
    {catContextMenu && (
      <div
        className="fixed z-50 dropdown rounded-lg overflow-hidden shadow-xl"
        style={{ top: catContextMenu.y, left: catContextMenu.x, minWidth: 140, border: "1px solid var(--c-border)" }}
        onMouseLeave={() => setCatContextMenu(null)}
      >
        <button
          className="w-full text-left px-3 py-2 text-[12px] text-t2 hover:bg-s2 transition-colors flex items-center gap-2"
          onClick={() => { setCatEditModal(catContextMenu.cat); setCatContextMenu(null); }}
        >
          <Pencil size={11} className="text-t4" /> Edit
        </button>
        <button
          className="w-full text-left px-3 py-2 text-[12px] text-red-400/80 hover:bg-s2 hover:text-red-400 transition-colors flex items-center gap-2"
          onClick={() => {
            const { cat } = catContextMenu;
            setCatContextMenu(null);
            askConfirm("Delete category?", `"${cat.name}" will be deleted. All its tasks will be moved to trash.`, () => removeCategory(cat.id));
          }}
        >
          <Trash2 size={11} /> Delete
        </button>
      </div>
    )}
    <GlobalTooltip />
    <TimerBlockedBanner />
    <GlobalToast />
    <GlobalAutoStop />
    <GlobalIdleReview />
    </div>
  );
}

function GlobalAutoStop() {
  const autoStopEvent = useTimerStore(s => s.autoStopEvent);
  if (!autoStopEvent) return null;
  return <AutoStopOverlay event={autoStopEvent} />;
}

function GlobalIdleReview() {
  const reviews = useTimerStore(s => s.idleReviews);
  if (reviews.length === 0) return null;
  // Render only the first; once acted on, the next becomes the first.
  return <IdleBanner review={reviews[0]} />;
}

function GlobalToast() {
  const { kind, message, persistent, clear } = useToastStore();
  if (!kind) return null;
  return <Toast type={kind} message={message ?? undefined} persistent={persistent} onDone={clear} />;
}

function TimerBlockedBanner() {
  const { blockedMsg, pendingTaskId, clearBlockedMsg, runningTaskId, stop, start } = useTimerStore();
  if (!blockedMsg) return null;
  const handleStopAndStart = async () => {
    const running = runningTaskId();
    if (running !== null) await stop(running);
    if (pendingTaskId !== null) await start(pendingTaskId);
    clearBlockedMsg();
  };
  return (
    <div className="fixed bottom-16 left-1/2 z-[99999] flex items-center gap-3 px-4 py-2.5 rounded-xl shadow-xl"
      style={{ transform: "translateX(-50%)", background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.4)", backdropFilter: "blur(8px)" }}>
      <span className="text-[12px] text-red-300">{blockedMsg}</span>
      <button onClick={handleStopAndStart}
        className="text-[11px] font-medium px-2 py-1 rounded-lg transition-colors"
        style={{ background: "rgba(239,68,68,0.2)", color: "rgba(252,165,165,0.95)", border: "1px solid rgba(239,68,68,0.35)" }}>
        Stop & Start
      </button>
      <button onClick={clearBlockedMsg} className="text-red-400 hover:text-red-200 transition-colors text-[11px] font-medium">Dismiss</button>
    </div>
  );
}
