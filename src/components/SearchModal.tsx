import { useEffect, useRef, useState } from "react";
import { Search, CheckSquare, FileText, BookOpen } from "lucide-react";
import { useTodoStore } from "../store";
import { useNotesStore } from "../notesStore";
import { useIHKStore } from "../ihkStore";

type ResultKind = "task" | "note" | "ihk";

interface SearchResult {
  id: number;
  kind: ResultKind;
  title: string;
  sub: string;
}

const KIND_ICON: Record<ResultKind, React.ReactNode> = {
  task: <CheckSquare size={12} />,
  note: <FileText size={12} />,
  ihk: <BookOpen size={12} />,
};

const KIND_LABEL: Record<ResultKind, string> = {
  task: "Task",
  note: "Note",
  ihk: "IHK",
};

const KIND_COLOR: Record<ResultKind, string> = {
  task: "99,102,241",
  note: "234,179,8",
  ihk: "245,158,11",
};

function highlight(text: string, q: string): React.ReactNode {
  if (!q) return text;
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark style={{ background: "rgba(168,85,247,0.35)", color: "inherit", borderRadius: 2 }}>
        {text.slice(idx, idx + q.length)}
      </mark>
      {text.slice(idx + q.length)}
    </>
  );
}

export default function SearchModal({ onClose, onNavigate }: {
  onClose: () => void;
  onNavigate: (view: "todos" | "notes" | "ihk") => void;
}) {
  const [q, setQ] = useState("");
  const [idx, setIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const todos = useTodoStore(s => s.todos);
  const notes = useNotesStore(s => s.notes);
  const ihkEntries = useIHKStore(s => s.entries);

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 10); }, []);

  const results: SearchResult[] = [];
  if (q.trim().length >= 1) {
    const lq = q.toLowerCase();
    todos
      .filter(t => !t.deleted_at && t.text.toLowerCase().includes(lq))
      .forEach(t => results.push({ id: t.id, kind: "task", title: t.text, sub: t.priority !== "none" ? t.priority : "" }));
    notes
      .filter(n => n.title.toLowerCase().includes(lq) || n.content.toLowerCase().includes(lq))
      .forEach(n => results.push({ id: n.id, kind: "note", title: n.title, sub: n.content.slice(0, 80) }));
    ihkEntries
      .filter(e => e.text.toLowerCase().includes(lq))
      .forEach(e => results.push({ id: e.id, kind: "ihk", title: e.text, sub: `KW · ${e.date}` }));
  }

  const safeIdx = results.length ? Math.min(idx, results.length - 1) : -1;

  useEffect(() => { setIdx(0); }, [q]);

  useEffect(() => {
    if (safeIdx < 0) return;
    const el = listRef.current?.children[safeIdx] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [safeIdx]);

  const select = (r: SearchResult) => {
    onNavigate(r.kind === "task" ? "todos" : r.kind === "note" ? "notes" : "ihk");
    onClose();
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") { onClose(); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); setIdx(i => Math.min(i + 1, results.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setIdx(i => Math.max(i - 1, 0)); }
    if (e.key === "Enter" && safeIdx >= 0) { select(results[safeIdx]); }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-24"
      style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-[480px] rounded-xl overflow-hidden flex flex-col"
        style={{ background: "rgba(20,20,24,0.9)", backdropFilter: "blur(16px)", border: "1px solid var(--c-border)", boxShadow: "0 24px 48px rgba(0,0,0,0.5)" }}>

        {/* Input */}
        <div className="flex items-center gap-2.5 px-4 py-3 border-b" style={{ borderColor: "var(--c-border)" }}>
          <Search size={14} className="text-t4 shrink-0" />
          <input
            ref={inputRef}
            value={q}
            onChange={e => setQ(e.target.value)}
            onKeyDown={onKey}
            placeholder="Search tasks, notes, IHK…"
            className="flex-1 bg-transparent outline-none text-[13px] text-t1 placeholder:text-t5"
          />
          <kbd className="text-[10px] text-t5 px-1.5 py-0.5 rounded" style={{ background: "var(--c-surface-2)", border: "1px solid var(--c-border)" }}>Esc</kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="overflow-y-auto max-h-80">
          {q.trim().length < 1 ? (
            <p className="text-[12px] text-t5 text-center py-8">Start typing to search…</p>
          ) : results.length === 0 ? (
            <p className="text-[12px] text-t5 text-center py-8">No results for "{q}"</p>
          ) : results.map((r, i) => (
            <button
              key={`${r.kind}-${r.id}`}
              onMouseEnter={() => setIdx(i)}
              onClick={() => select(r)}
              className="w-full text-left flex items-start gap-3 px-4 py-2.5 transition-colors"
              style={{ background: i === safeIdx ? "var(--c-surface-1)" : "transparent" }}
            >
              <span className="mt-0.5 shrink-0" style={{ color: `rgba(${KIND_COLOR[r.kind]},0.8)` }}>{KIND_ICON[r.kind]}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] text-t1 truncate">{highlight(r.title, q)}</p>
                {r.sub && <p className="text-[10px] text-t5 truncate mt-0.5">{highlight(r.sub, q)}</p>}
              </div>
              <span className="text-[9px] text-t6 shrink-0 mt-0.5 px-1.5 py-0.5 rounded"
                style={{ background: `rgba(${KIND_COLOR[r.kind]},0.12)`, color: `rgba(${KIND_COLOR[r.kind]},0.7)` }}>
                {KIND_LABEL[r.kind]}
              </span>
            </button>
          ))}
        </div>

        {/* Footer */}
        {results.length > 0 && (
          <div className="flex items-center gap-3 px-4 py-2 border-t" style={{ borderColor: "var(--c-border)" }}>
            <span className="text-[10px] text-t6">{results.length} result{results.length !== 1 ? "s" : ""}</span>
            <span className="text-[10px] text-t6 ml-auto">↑↓ navigate · Enter to open</span>
          </div>
        )}
      </div>
    </div>
  );
}
