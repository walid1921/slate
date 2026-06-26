import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { X, Sparkles, Copy, Check } from "lucide-react";

interface PolishedEntry {
  id: number;
  week_key: string;
  category: number;
  content: string;
  generated_at: string;
}

interface Props {
  weekLabel: string;
  categoryName: string;
  categoryIdx: number;
  weekKey: string;
  entries: { date: string; text: string }[];
  saved: PolishedEntry | null;
  onClose: () => void;
  onSaved: (content: string) => Promise<void>;
}

export default function AIIHKPolishModal({ weekLabel, categoryName, weekKey: _weekKey, categoryIdx: _categoryIdx, entries, saved, onClose, onSaved }: Props) {
  const [content, setContent] = useState<string>(saved?.content ?? "");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [instructionOpen, setInstructionOpen] = useState(false);
  const [instruction, setInstruction] = useState("");
  const [copied, setCopied] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const instructionRef = useRef<HTMLTextAreaElement>(null);

  // Auto-generate on first open if no saved version yet
  useEffect(() => {
    if (!saved && entries.length > 0) {
      void generate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (instructionOpen) setTimeout(() => instructionRef.current?.focus(), 30);
  }, [instructionOpen]);

  const generate = async (withInstruction?: string) => {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const { polishIHKEntries } = await import("../taskAI");
      const result = await polishIHKEntries(
        categoryName,
        entries,
        saved?.content,
        withInstruction,
      );
      setContent(result);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerate = async () => {
    if (!instruction.trim()) return;
    await generate(instruction.trim());
    setInstruction("");
    setInstructionOpen(false);
  };

  const handleSave = async () => {
    if (!content.trim() || saving) return;
    setSaving(true);
    try {
      await onSaved(content);
      onClose();
    } catch (e) {
      console.error(e);
      setSaving(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)" }} onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="dropdown rounded-xl shadow-2xl flex flex-col" style={{ width: 640, maxHeight: "88vh", border: "1px solid var(--c-border)" }}>
        <div className="flex items-center justify-between px-4 py-3 shrink-0" style={{ borderBottom: "1px solid var(--c-border-subtle)" }}>
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles size={13} className="text-indigo-400 shrink-0" />
            <span className="text-[13px] font-semibold text-t1 truncate">AI Polish — {weekLabel} · {categoryName}</span>
          </div>
          <button onClick={onClose} className="text-t4 hover:text-t2 transition-colors shrink-0"><X size={13} /></button>
        </div>

        <div className="overflow-y-auto flex flex-col gap-3 px-5 py-4">
          {error && <div className="text-[11px] text-red-400">{error}</div>}

          {/* Toolbar */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setInstructionOpen(v => !v)}
              disabled={loading}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] text-t3 hover:text-t1 transition-colors disabled:opacity-40"
              style={{ background: "var(--c-surface-2)", border: "1px solid var(--c-border)" }}
            >
              <Sparkles size={10} /><span>Regenerate with instruction</span>
            </button>
            <button
              onClick={() => generate()}
              disabled={loading}
              className="px-2.5 py-1 rounded text-[11px] text-t3 hover:text-t1 transition-colors disabled:opacity-40"
              style={{ background: "var(--c-surface-2)", border: "1px solid var(--c-border)" }}
            >
              {loading ? "Generating…" : "Regenerate"}
            </button>
            <button
              onClick={() => setEditMode(v => !v)}
              disabled={loading || !content}
              className="px-2.5 py-1 rounded text-[11px] text-t3 hover:text-t1 transition-colors disabled:opacity-40"
              style={{ background: editMode ? "var(--c-surface-3)" : "var(--c-surface-2)", border: "1px solid var(--c-border)" }}
            >
              {editMode ? "Preview" : "Edit"}
            </button>
            <button
              onClick={handleCopy}
              disabled={!content}
              className="ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] text-t3 hover:text-t1 transition-colors disabled:opacity-40"
              style={{ background: "var(--c-surface-2)" }}
            >
              {copied ? <Check size={10} className="text-green-400" /> : <Copy size={10} />}
              <span>{copied ? "Copied" : "Copy"}</span>
            </button>
          </div>

          {/* Inline instruction input */}
          {instructionOpen && (
            <div className="flex flex-col gap-1.5 p-2 rounded" style={{ background: "var(--c-surface-1)", border: "1px solid var(--c-border-subtle)" }}>
              <textarea
                ref={instructionRef}
                value={instruction}
                onChange={e => setInstruction(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); void handleRegenerate(); } }}
                placeholder="e.g. mehr Details zu den verwendeten Tools, präzisere Verben, kürzere Sätze…"
                className="px-2.5 py-1.5 rounded text-[12px] text-t2 outline-none resize-none placeholder-themed"
                style={{ background: "var(--c-surface-2)", border: "1px solid var(--c-border)", minHeight: 60 }}
              />
              <div className="flex justify-end gap-2">
                <button onClick={() => { setInstructionOpen(false); setInstruction(""); }} className="px-2.5 py-1 rounded text-[11px] text-t4 hover:text-t2 transition-colors">Cancel</button>
                <button
                  onClick={handleRegenerate}
                  disabled={!instruction.trim() || loading}
                  className="px-3 py-1 rounded text-[11px] text-white hover:bg-indigo-500 transition-colors disabled:opacity-40"
                  style={{ background: "rgba(99,102,241,0.9)" }}
                >
                  {loading ? "Generating…" : "Generate"}
                </button>
              </div>
            </div>
          )}

          {/* Content */}
          <div className="rounded" style={{ background: "var(--c-surface-1)", border: "1px solid var(--c-border-subtle)", minHeight: 200 }}>
            {loading && !content ? (
              <div className="p-4 text-[12px] text-t5">Generating…</div>
            ) : editMode ? (
              <textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                className="w-full bg-transparent text-[12px] text-t2 outline-none resize-none p-3 leading-relaxed"
                style={{ minHeight: 220 }}
              />
            ) : content ? (
              <div className="px-4 py-3 text-[12px] text-t2 leading-relaxed">
                <ReactMarkdown
                  components={{
                    p: ({ children }) => <p className="my-1.5">{children}</p>,
                    ul: ({ children }) => <ul className="list-disc pl-5 my-1 space-y-1">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal pl-5 my-1 space-y-1">{children}</ol>,
                    li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                    strong: ({ children }) => <strong className="font-semibold text-t1">{children}</strong>,
                    em: ({ children }) => <em className="italic">{children}</em>,
                    code: ({ children }) => <code className="px-1 py-0.5 rounded text-[11px] font-mono" style={{ background: "var(--c-surface-2)" }}>{children}</code>,
                  }}
                >
                  {content}
                </ReactMarkdown>
              </div>
            ) : (
              <div className="p-4 text-[12px] text-t5">No content yet — click Regenerate.</div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 px-4 py-3 shrink-0" style={{ borderTop: "1px solid var(--c-border-subtle)" }}>
          <button onClick={onClose} className="px-3 py-1.5 rounded text-[12px] text-t3 hover:text-t2 transition-colors" style={{ background: "var(--c-surface-2)" }}>
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!content.trim() || saving || loading}
            className="px-4 py-1.5 rounded text-[12px] text-white hover:bg-indigo-500 transition-colors disabled:opacity-40 disabled:pointer-events-none"
            style={{ background: "rgba(99,102,241,0.9)" }}
          >
            {saving ? "Saving…" : saved ? "Save changes" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
