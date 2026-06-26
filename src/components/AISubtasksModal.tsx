import { useEffect, useRef, useState } from "react";
import { X, Sparkles, Plus } from "lucide-react";
import { SubTask } from "../store";

interface Props {
  taskText: string;
  taskDescription: string;
  existing: SubTask[];
  onClose: () => void;
  onApply: (subs: SubTask[]) => void;
}

export default function AISubtasksModal({ taskText, taskDescription, existing, onClose, onApply }: Props) {
  const [instruction, setInstruction] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [proposed, setProposed] = useState<string[]>(existing.map(s => s.text));
  const [hasGenerated, setHasGenerated] = useState(false);
  const instructionRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setTimeout(() => instructionRef.current?.focus(), 30);
  }, []);

  const handleGenerate = async () => {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const { breakDownTask } = await import("../taskAI");
      const result = await breakDownTask(
        taskText,
        taskDescription,
        existing.map(s => ({ text: s.text, done: s.done })),
        instruction.trim() || undefined,
      );
      setProposed(result.map(s => s.text));
      setHasGenerated(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    const cleaned = proposed.map(s => s.trim()).filter(Boolean);
    if (cleaned.length === 0) return;
    const subs: SubTask[] = cleaned.map((text, i) => {
      const prev = existing.find(s => s.text.trim() === text);
      return { id: i + 1, text, done: prev?.done ?? false };
    });
    onApply(subs);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)" }} onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="dropdown rounded-xl shadow-2xl flex flex-col" style={{ width: 560, maxHeight: "85vh", border: "1px solid var(--c-border)" }}>
        <div className="flex items-center justify-between px-4 py-3 shrink-0" style={{ borderBottom: "1px solid var(--c-border-subtle)" }}>
          <div className="flex items-center gap-2">
            <Sparkles size={13} className="text-indigo-400" />
            <span className="text-[13px] font-semibold text-t1">Refine subtasks</span>
          </div>
          <button onClick={onClose} className="text-t4 hover:text-t2 transition-colors"><X size={13} /></button>
        </div>

        <div className="overflow-y-auto flex flex-col gap-4 px-5 py-4">
          {/* Instruction input */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-t4 uppercase tracking-wider">What to change or add</span>
            <textarea
              ref={instructionRef}
              value={instruction}
              onChange={e => setInstruction(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); handleGenerate(); } }}
              placeholder="e.g. add deployment steps · make them more concrete · split the testing step · remove the QA item…"
              className="px-3 py-2 rounded text-[12px] text-t2 outline-none resize-none placeholder-themed"
              style={{ background: "var(--c-surface-2)", border: "1px solid var(--c-border)", minHeight: 60 }}
            />
            <div className="flex items-center justify-between mt-1">
              <span className="text-[10px] text-t5">⌘+Enter to generate · leave empty for a pure refinement</span>
              <button
                onClick={handleGenerate}
                disabled={loading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] text-white hover:bg-indigo-500 transition-colors disabled:opacity-40"
                style={{ background: "rgba(99,102,241,0.9)" }}
              >
                <Sparkles size={11} />
                <span>{loading ? "Generating…" : hasGenerated ? "Regenerate" : "Generate"}</span>
              </button>
            </div>
            {error && <div className="text-[11px] text-red-400 mt-1">{error}</div>}
          </div>

          {/* Existing subtasks reference */}
          {existing.length > 0 && (
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-t4 uppercase tracking-wider">Current ({existing.length})</span>
              <div className="flex flex-col gap-0.5 px-3 py-2 rounded" style={{ background: "var(--c-surface-1)", border: "1px solid var(--c-border-subtle)" }}>
                {existing.map(s => (
                  <span key={s.id} className={`text-[11px] ${s.done ? "text-t5 line-through" : "text-t3"}`}>{s.text}</span>
                ))}
              </div>
            </div>
          )}

          {/* Proposed subtasks (editable) */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-t4 uppercase tracking-wider">{hasGenerated ? "Proposed" : "Edit before applying"} ({proposed.length})</span>
              <button
                onClick={() => setProposed([...proposed, ""])}
                className="flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                <Plus size={10} /><span>Add</span>
              </button>
            </div>
            <div className="flex flex-col gap-1.5 mt-1">
              {proposed.map((s, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    value={s}
                    onChange={e => {
                      const next = [...proposed];
                      next[i] = e.target.value;
                      setProposed(next);
                    }}
                    className="flex-1 px-2.5 py-1.5 rounded text-[12px] text-t2 outline-none"
                    style={{ background: "var(--c-surface-2)", border: "1px solid var(--c-border)" }}
                  />
                  <button
                    onClick={() => setProposed(proposed.filter((_, j) => j !== i))}
                    className="text-t5 hover:text-red-400 transition-colors"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 px-4 py-3 shrink-0" style={{ borderTop: "1px solid var(--c-border-subtle)" }}>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded text-[12px] text-t3 hover:text-t2 transition-colors"
            style={{ background: "var(--c-surface-2)" }}
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            disabled={proposed.filter(s => s.trim()).length === 0}
            className="px-4 py-1.5 rounded text-[12px] text-white hover:bg-indigo-500 transition-colors disabled:opacity-40 disabled:pointer-events-none"
            style={{ background: "rgba(99,102,241,0.9)" }}
          >
            Apply ({proposed.filter(s => s.trim()).length})
          </button>
        </div>
      </div>
    </div>
  );
}
