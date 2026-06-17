import { useEffect, useState, useRef, useCallback } from "react";
import { Plus, X, PanelLeft } from "lucide-react";
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

export default function NotesPage({ onDeleteRequest, onConfirm, autoNew, onAutoNewDone }: {
  onDeleteRequest: (id: number) => void;
  onConfirm: (title: string, msg: string, fn: () => void) => void;
  autoNew?: boolean;
  onAutoNewDone?: () => void;
}) {
  const { notes, load, add, update } = useNotesStore();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (autoNew) { handleNew(); onAutoNewDone?.(); }
  }, [autoNew]);

  const sortedNotes = [...notes].sort((a, b) =>
    new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  );

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

  // Delete key removes selected note with confirmation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if ((e.key === "Backspace" || e.key === "Delete") && selectedId !== null) {
        const note = notes.find((n) => n.id === selectedId);
        if (note) onConfirm("Delete note?", `"${note.title}" will be permanently deleted.`, () => {
          onDeleteRequest(note.id);
          setSelectedId(null);
        });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId, notes, onDeleteRequest, onConfirm]);

  return (
    <div className="view-animate flex flex-row flex-1 overflow-hidden">
      {/* Sidebar */}
      <div
        className="shrink-0 border-r border-s flex flex-col overflow-hidden transition-all duration-200"
        style={{ width: sidebarOpen ? 176 : 0, opacity: sidebarOpen ? 1 : 0 }}
      >
        <div className="flex items-center justify-between px-3 py-2 shrink-0 border-b border-s">
          <span className="text-[10px] text-t4 uppercase tracking-widest select-none">Notes</span>
          <button
            onClick={handleNew}
            title="New note"
            className="w-5 h-5 flex items-center justify-center rounded text-t4 hover:text-t2 hover:bg-s3 transition-colors"
          >
            <Plus size={11} />
          </button>
        </div>
        <div className="overflow-y-auto flex-1">
          {sortedNotes.length === 0 ? (
            <p className="px-3 py-6 text-center text-t5 text-xs select-none">No notes yet</p>
          ) : (
            sortedNotes.map((note) => (
              <div
                key={note.id}
                onClick={() => selectNote(note)}
                className={`group relative px-3 py-2.5 cursor-default transition-colors border-b border-s ${
                  selectedId === note.id ? "" : "hover:bg-s1"
                }`}
                style={selectedId === note.id ? { background: "var(--c-surface-2)" } : {}}
              >
                <p className="text-[13px] text-t1 truncate leading-snug">{note.title}</p>
                <p className="text-[11px] text-t4 truncate mt-0.5 leading-snug">
                  {note.content.split("\n")[0] || "No content"}
                </p>
                <p className="text-[10px] text-t5 mt-0.5">{relativeDate(note.updated_at)}</p>
                <button
                  onClick={(e) => { e.stopPropagation(); onDeleteRequest(note.id); }}
                  title="Delete"
                  className="absolute right-1.5 top-1.5 opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center rounded text-t4 hover:text-red-400 hover:bg-s3 transition-colors"
                >
                  <X size={9} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <div className="flex items-center gap-2 px-3 pt-2 pb-1 shrink-0">
          <button
            onClick={() => setSidebarOpen((o) => !o)}
            title={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
            className="w-6 h-6 flex items-center justify-center rounded text-t4 hover:text-t2 hover:bg-s3 transition-colors"
          >
            <PanelLeft size={13} />
          </button>
          {!sidebarOpen && (
            <button
              onClick={handleNew}
              title="New note"
              className="w-6 h-6 flex items-center justify-center rounded text-t4 hover:text-t2 hover:bg-s3 transition-colors"
            >
              <Plus size={11} />
            </button>
          )}
        </div>

        {selected ? (
          <>
            <input
              ref={titleRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title"
              className="px-4 pt-1 pb-1 text-[15px] font-medium text-t1 bg-transparent outline-none placeholder-themed shrink-0"
            />
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write something…"
              className="flex-1 px-4 py-2 text-[13px] text-t2 bg-transparent outline-none resize-none placeholder-themed leading-relaxed"
            />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-t5 text-sm select-none">Select a note or create a new one</p>
          </div>
        )}
      </div>
    </div>
  );
}
