import { useEffect, useRef, useState } from "react";
import { X, Sparkles, Plus } from "lucide-react";
import { DevPriority } from "../devStore";

interface DraftItem {
  text: string;
  description: string;
  priority: DevPriority;
}

interface Props {
  sectionName: string;
  categoryName: string;
  existingItemTexts: string[];
  onClose: () => void;
  onApply: (items: DraftItem[]) => Promise<void>;
}

const PRIORITY_DOTS: Record<DevPriority, string> = {
  none: "bg-t5",
  low: "bg-blue-400",
  medium: "bg-yellow-400",
  high: "bg-red-400",
};

export default function DevAIItemsModal({ sectionName, categoryName, existingItemTexts, onClose, onApply }: Props) {
  const [instruction, setInstruction] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const [items, setItems] = useState<DraftItem[]>([]);
  const instructionRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setTimeout(() => instructionRef.current?.focus(), 30);
  }, []);

  const handleGenerate = async () => {
    if (!instruction.trim() || loading) return;
    setLoading(true);
    setError(null);
    try {
      const { generateDevChecklistItems } = await import("../taskAI");
      const result = await generateDevChecklistItems(sectionName, categoryName, existingItemTexts, instruction);
      setItems(result.map(r => ({ text: r.text, description: r.description, priority: r.priority })));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    const cleaned = items.filter(i => i.text.trim());
    if (cleaned.length === 0) return;
    setApplying(true);
    try {
      await onApply(cleaned);
      onClose();
    } catch (e) {
      console.error(e);
      setApplying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)" }} onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="dropdown rounded-xl shadow-2xl flex flex-col" style={{ width: 640, maxHeight: "88vh", border: "1px solid var(--c-border)" }}>
        <div className="flex items-center justify-between px-4 py-3 shrink-0" style={{ borderBottom: "1px solid var(--c-border-subtle)" }}>
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles size={13} className="text-indigo-400 shrink-0" />
            <span className="text-[13px] font-semibold text-t1 truncate">Generate items — {sectionName} · {categoryName}</span>
          </div>
          <button onClick={onClose} className="text-t4 hover:text-t2 transition-colors shrink-0"><X size={13} /></button>
        </div>

        <div className="overflow-y-auto flex flex-col gap-4 px-5 py-4">
          {/* Instruction input */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-t4 uppercase tracking-wider">What to generate</span>
            <textarea
              ref={instructionRef}
              value={instruction}
              onChange={e => setInstruction(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); handleGenerate(); } }}
              placeholder="e.g. 5 items for CI/CD with GitHub Actions · accessibility checks for forms · React performance — rendering, memoization, code-splitting"
              className="px-3 py-2 rounded text-[12px] text-t2 outline-none resize-none placeholder-themed"
              style={{ background: "var(--c-surface-2)", border: "1px solid var(--c-border)", minHeight: 70 }}
            />
            <div className="flex items-center justify-between mt-1">
              <span className="text-[10px] text-t5">⌘+Enter to generate · existing items won't be duplicated</span>
              <button
                onClick={handleGenerate}
                disabled={!instruction.trim() || loading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] text-white hover:bg-indigo-500 transition-colors disabled:opacity-40"
                style={{ background: "rgba(99,102,241,0.9)" }}
              >
                <Sparkles size={11} />
                <span>{loading ? "Generating…" : items.length > 0 ? "Regenerate" : "Generate"}</span>
              </button>
            </div>
            {error && <div className="text-[11px] text-red-400 mt-1">{error}</div>}
          </div>

          {/* Generated items */}
          {items.length > 0 && (
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-t4 uppercase tracking-wider">Proposed ({items.length})</span>
                <button
                  onClick={() => setItems([...items, { text: "", description: "", priority: "none" }])}
                  className="flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  <Plus size={10} /><span>Add</span>
                </button>
              </div>
              <div className="flex flex-col gap-2 mt-1">
                {items.map((it, i) => (
                  <div key={i} className="flex flex-col gap-1.5 p-2.5 rounded" style={{ background: "var(--c-surface-1)", border: "1px solid var(--c-border-subtle)" }}>
                    <div className="flex items-center gap-2">
                      <input
                        value={it.text}
                        onChange={e => {
                          const next = [...items]; next[i] = { ...next[i], text: e.target.value }; setItems(next);
                        }}
                        placeholder="Item title…"
                        className="flex-1 px-2 py-1 rounded text-[12px] text-t1 font-medium outline-none"
                        style={{ background: "var(--c-surface-2)", border: "1px solid var(--c-border)" }}
                      />
                      <div className="flex gap-1">
                        {(["none", "low", "medium", "high"] as DevPriority[]).map(p => (
                          <button
                            key={p}
                            onClick={() => {
                              const next = [...items]; next[i] = { ...next[i], priority: p }; setItems(next);
                            }}
                            className="w-5 h-5 flex items-center justify-center rounded transition-all"
                            style={it.priority === p ? { outline: "1px solid var(--c-text-3)", outlineOffset: -1 } : {}}
                            title={p}
                          >
                            <span className={`block w-2 h-2 rounded-full ${PRIORITY_DOTS[p]}`} style={{ opacity: it.priority === p ? 1 : 0.35 }} />
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={() => setItems(items.filter((_, j) => j !== i))}
                        className="text-t5 hover:text-red-400 transition-colors"
                      >
                        <X size={12} />
                      </button>
                    </div>
                    <textarea
                      value={it.description}
                      onChange={e => {
                        const next = [...items]; next[i] = { ...next[i], description: e.target.value }; setItems(next);
                      }}
                      placeholder="Description…"
                      className="px-2 py-1 rounded text-[11px] text-t3 outline-none resize-none"
                      style={{ background: "var(--c-surface-2)", border: "1px solid var(--c-border)", minHeight: 44 }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 px-4 py-3 shrink-0" style={{ borderTop: "1px solid var(--c-border-subtle)" }}>
          <button onClick={onClose} className="px-3 py-1.5 rounded text-[12px] text-t3 hover:text-t2 transition-colors" style={{ background: "var(--c-surface-2)" }}>
            Cancel
          </button>
          <button
            onClick={handleApply}
            disabled={items.filter(i => i.text.trim()).length === 0 || applying || loading}
            className="px-4 py-1.5 rounded text-[12px] text-white hover:bg-indigo-500 transition-colors disabled:opacity-40 disabled:pointer-events-none"
            style={{ background: "rgba(99,102,241,0.9)" }}
          >
            {applying ? "Adding…" : `Add ${items.filter(i => i.text.trim()).length} item${items.filter(i => i.text.trim()).length === 1 ? "" : "s"}`}
          </button>
        </div>
      </div>
    </div>
  );
}
