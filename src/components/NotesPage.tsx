import { useEffect, useState, useRef, useCallback } from "react";
import { useNotesStore, Note } from "../notesStore";

function relativeDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function NotesPage() {
  const { notes, load, add, update, remove } = useNotesStore();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => { load(); }, [load]);

  const selected = notes.find((n) => n.id === selectedId) ?? null;

  const selectNote = useCallback((note: Note) => {
    setSelectedId(note.id);
    setTitle(note.title);
    setContent(note.content);
  }, []);

  useEffect(() => {
    if (selectedId === null) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      update(selectedId, title, content);
    }, 500);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [title, content, selectedId, update]);

  const handleNew = async () => {
    await add("Untitled", "");
    const fresh = useNotesStore.getState().notes[0];
    if (fresh) {
      selectNote(fresh);
      setTimeout(() => titleRef.current?.select(), 50);
    }
  };

  const handleDelete = async (id: number) => {
    await remove(id);
    if (selectedId === id) {
      setSelectedId(null);
      setTitle("");
      setContent("");
    }
  };

  return (
    <div className="flex flex-row flex-1 overflow-hidden">
      {/* Note list */}
      <div className="w-44 shrink-0 border-r border-white/[0.06] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 shrink-0">
          <span className="text-[10px] text-white/30 uppercase tracking-widest select-none">Notes</span>
          <button
            onClick={handleNew}
            title="New note"
            className="w-5 h-5 flex items-center justify-center rounded text-white/30 hover:text-white/60 hover:bg-white/10 transition-colors"
          >
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
              <path d="M5.5 1v9M1 5.5h9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="overflow-y-auto flex-1">
          {notes.length === 0 ? (
            <p className="px-3 py-6 text-center text-white/20 text-xs select-none">No notes yet</p>
          ) : (
            notes.map((note) => (
              <div
                key={note.id}
                onClick={() => selectNote(note)}
                className={`group relative px-3 py-2.5 cursor-default transition-colors ${
                  selectedId === note.id ? "bg-white/[0.08]" : "hover:bg-white/[0.04]"
                }`}
              >
                <p className="text-[13px] text-white/80 truncate leading-snug">{note.title}</p>
                <p className="text-[11px] text-white/30 truncate mt-0.5 leading-snug">
                  {note.content.split("\n")[0] || "No content"}
                </p>
                <p className="text-[10px] text-white/20 mt-0.5">{relativeDate(note.updated_at)}</p>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(note.id); }}
                  title="Delete"
                  className="absolute right-1.5 top-1.5 opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center rounded text-white/25 hover:text-red-400 hover:bg-white/10 transition-colors"
                >
                  <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
                    <path d="M2 2l6 6M8 2l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selected ? (
          <>
            <input
              ref={titleRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title"
              className="px-4 pt-3 pb-1 text-[15px] font-medium text-white/88 bg-transparent outline-none placeholder-white/20 shrink-0"
            />
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write something…"
              className="flex-1 px-4 py-2 text-[13px] text-white/70 bg-transparent outline-none resize-none placeholder-white/20 leading-relaxed"
            />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-white/20 text-sm select-none">Select a note or create a new one</p>
          </div>
        )}
      </div>
    </div>
  );
}
