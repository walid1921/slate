import { useState } from "react";
import { X, Plus, Sparkles } from "lucide-react";
import { Priority, useTodoStore } from "../store";
import { GeneratedTask } from "../taskAI";

interface Props {
  task: GeneratedTask;
  defaultCategoryId: number;
  onClose: () => void;
  onCreated: (id: number) => void;
  onRegenerate?: () => void;
}

const PRIORITY_DOTS: Record<Priority, string> = {
  none: "bg-t5",
  low: "bg-blue-400",
  medium: "bg-yellow-400",
  high: "bg-red-400",
};

export default function AITaskReviewModal({ task, defaultCategoryId, onClose, onCreated, onRegenerate }: Props) {
  const { categories, add: addTodo, setSubtasks } = useTodoStore();
  const [text, setText] = useState(task.text);
  const [description, setDescription] = useState(task.description);
  const [priority, setPriority] = useState<Priority>(task.priority);
  const [dueDate, setDueDate] = useState<string>(task.due_date ?? "");
  const [dueTime, setDueTime] = useState<string>(task.due_time ?? "");
  const [categoryId, setCategoryId] = useState<number>(defaultCategoryId);
  const [subtasks, setSubtasksLocal] = useState(task.subtasks.map(s => s.text));
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!text.trim() || creating) return;
    setCreating(true);
    try {
      const newId = await addTodo(
        text.trim(),
        priority,
        dueDate || null,
        dueTime || null,
        categoryId,
        description.trim(),
      );
      if (newId !== undefined) {
        const cleaned = subtasks.filter(s => s.trim());
        if (cleaned.length > 0) {
          await setSubtasks(
            newId,
            cleaned.map((s, i) => ({ id: i + 1, text: s.trim(), done: false })),
          );
        }
        onCreated(newId);
      }
      onClose();
    } catch (e) {
      console.error("create AI task failed", e);
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)" }} onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="dropdown rounded-xl shadow-2xl flex flex-col" style={{ width: 560, maxHeight: "88vh", border: "1px solid var(--c-border)" }}>
        <div className="flex items-center justify-between px-4 py-3 shrink-0" style={{ borderBottom: "1px solid var(--c-border-subtle)" }}>
          <div className="flex items-center gap-2">
            <Sparkles size={13} className="text-indigo-400" />
            <span className="text-[13px] font-semibold text-t1">Review AI-generated task</span>
          </div>
          <button onClick={onClose} className="text-t4 hover:text-t2 transition-colors"><X size={13} /></button>
        </div>

        <div className="overflow-y-auto flex flex-col gap-4 px-5 py-4">
          {/* Title */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-t4 uppercase tracking-wider">Title</span>
            <input
              value={text}
              onChange={e => setText(e.target.value)}
              className="px-3 py-2 rounded text-[13px] text-t1 outline-none"
              style={{ background: "var(--c-surface-2)", border: "1px solid var(--c-border)" }}
              autoFocus
            />
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-t4 uppercase tracking-wider">Description</span>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="px-3 py-2 rounded text-[12px] text-t2 outline-none resize-none"
              style={{ background: "var(--c-surface-2)", border: "1px solid var(--c-border)", minHeight: 80 }}
            />
          </div>

          {/* Category */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-t4 uppercase tracking-wider">Category</span>
            <select
              value={categoryId}
              onChange={e => setCategoryId(Number(e.target.value))}
              className="px-3 py-2 rounded text-[12px] text-t1 outline-none"
              style={{ background: "var(--c-surface-2)", border: "1px solid var(--c-border)" }}
            >
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Priority */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-t4 uppercase tracking-wider">Priority</span>
            <div className="flex gap-2 mt-1">
              {(["none", "low", "medium", "high"] as Priority[]).map(p => (
                <button
                  key={p}
                  onClick={() => setPriority(p)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[11px] transition-colors"
                  style={{
                    background: priority === p ? "var(--c-surface-3)" : "var(--c-surface-1)",
                    border: priority === p ? "1px solid var(--c-text-3)" : "1px solid var(--c-border)",
                    color: priority === p ? "var(--c-text-1)" : "var(--c-text-3)",
                  }}
                >
                  <span className={`block w-2 h-2 rounded-full ${PRIORITY_DOTS[p]}`} />
                  <span className="capitalize">{p}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Deadline */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-t4 uppercase tracking-wider">Deadline</span>
            <div className="flex gap-2">
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="flex-1 px-3 py-2 rounded text-[12px] text-t1 outline-none"
                style={{ background: "var(--c-surface-2)", border: "1px solid var(--c-border)" }}
              />
              <input
                type="time"
                value={dueTime}
                onChange={e => setDueTime(e.target.value)}
                disabled={!dueDate}
                className="px-3 py-2 rounded text-[12px] text-t1 outline-none disabled:opacity-40"
                style={{ background: "var(--c-surface-2)", border: "1px solid var(--c-border)", width: 110 }}
              />
              {(dueDate || dueTime) && (
                <button onClick={() => { setDueDate(""); setDueTime(""); }} className="text-t5 hover:text-red-400 transition-colors px-1">
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          {/* Subtasks */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-t4 uppercase tracking-wider">Subtasks ({subtasks.length})</span>
              <button
                onClick={() => setSubtasksLocal([...subtasks, ""])}
                className="flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                <Plus size={10} /><span>Add</span>
              </button>
            </div>
            <div className="flex flex-col gap-1.5 mt-1">
              {subtasks.map((s, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    value={s}
                    onChange={e => {
                      const next = [...subtasks];
                      next[i] = e.target.value;
                      setSubtasksLocal(next);
                    }}
                    className="flex-1 px-2.5 py-1.5 rounded text-[12px] text-t2 outline-none"
                    style={{ background: "var(--c-surface-2)", border: "1px solid var(--c-border)" }}
                  />
                  <button
                    onClick={() => setSubtasksLocal(subtasks.filter((_, j) => j !== i))}
                    className="text-t5 hover:text-red-400 transition-colors"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center gap-2 px-4 py-3 shrink-0" style={{ borderTop: "1px solid var(--c-border-subtle)" }}>
          {onRegenerate ? (
            <button
              onClick={onRegenerate}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] text-t3 hover:text-t1 transition-colors"
              style={{ background: "var(--c-surface-2)" }}
            >
              <Sparkles size={11} /><span>Regenerate</span>
            </button>
          ) : <span />}
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded text-[12px] text-t3 hover:text-t2 transition-colors"
              style={{ background: "var(--c-surface-2)" }}
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={!text.trim() || creating}
              className="px-4 py-1.5 rounded text-[12px] text-white hover:bg-indigo-500 transition-colors disabled:opacity-40 disabled:pointer-events-none"
              style={{ background: "rgba(99,102,241,0.9)" }}
            >
              {creating ? "Creating…" : "Create task"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
