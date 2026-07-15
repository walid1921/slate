import { useEffect, useRef, useState, useCallback } from "react";
import { Plus, X, Pencil, Copy, Check, ChevronDown, ChevronRight, GripVertical, ClipboardCopy, Sparkles, FileText } from "lucide-react";
import { useIHKStore, IHK_CATEGORIES, IHKCategory, IHKEntry, IHKModule } from "../ihkStore";
import { getDb } from "../db";
import AIIHKPolishModal from "./AIIHKPolishModal";

interface PolishedEntry {
  week_key: string;
  content: string;
  generated_at: string;
}
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const ACCENT = "251,191,36";
const CAT_COLORS: [string, string][] = [
  ["59,130,246", "rgba(59,130,246,0.15)"],
  ["99,102,241", "rgba(99,102,241,0.15)"],
  ["16,185,129", "rgba(16,185,129,0.15)"],
];
const CAT_SHORT = ["Betrieb", "Schulung", "Berufsschule"];

function today(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function getISOWeek(dateStr: string): { kw: number; year: number } {
  const d = new Date(dateStr + "T00:00:00");
  const tmp = new Date(d);
  tmp.setHours(0, 0, 0, 0);
  tmp.setDate(tmp.getDate() + 3 - ((tmp.getDay() + 6) % 7));
  const jan4 = new Date(tmp.getFullYear(), 0, 4);
  const kw = 1 + Math.round(((tmp.getTime() - jan4.getTime()) / 86400000 - 3 + ((jan4.getDay() + 6) % 7)) / 7);
  return { kw, year: tmp.getFullYear() };
}

function getWeekRange(year: number, kw: number): { start: Date; end: Date } {
  const jan4 = new Date(year, 0, 4);
  const mon = new Date(jan4);
  mon.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7) + (kw - 1) * 7);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  return { start: mon, end: sun };
}

function fmtWeekRange(year: number, kw: number): string {
  const { start, end } = getWeekRange(year, kw);
  const opts: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short" };
  return `${start.toLocaleDateString("en-GB", opts)} – ${end.toLocaleDateString("en-GB", opts)}`;
}

function fmtDayStamp(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short" });
}

function buildWeekKey(year: number, kw: number) { return `${year}-${String(kw).padStart(2, "0")}`; }

function groupByWeek(entries: IHKEntry[]) {
  const map = new Map<string, { year: number; kw: number; entries: IHKEntry[] }>();
  for (const e of entries) {
    const { kw, year } = getISOWeek(e.date);
    const key = buildWeekKey(year, kw);
    if (!map.has(key)) map.set(key, { year, kw, entries: [] });
    map.get(key)!.entries.push(e);
  }
  return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
}

function buildCatCopyText(entries: IHKEntry[]): string {
  return entries.map(e => `- ${e.text}`).join("\n");
}

function CatHeader({ catName, catIdx, rgb, entries }: { catName: string; catIdx: number; rgb: string; entries: IHKEntry[] }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    if (entries.length === 0) return;
    await navigator.clipboard.writeText(buildCatCopyText(entries));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="flex items-center gap-2 px-3 py-2" style={{ background: `rgba(${rgb},0.04)` }}>
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: `rgba(${rgb},0.7)` }} />
      <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: `rgba(${rgb},0.8)` }}>{catName}</span>
      {catIdx === 1 && <span className="text-[9px] text-t6 italic ml-1">optional</span>}
      <span className="ml-auto text-[10px] text-t5">{entries.length}</span>
      {entries.length > 0 && (
        <button onClick={copy} className="w-5 h-5 flex items-center justify-center rounded text-t5 hover:text-t2 transition-colors" title="Copy entries">
          {copied ? <Check size={9} style={{ color: `rgba(${rgb},0.9)` }} /> : <Copy size={9} />}
        </button>
      )}
    </div>
  );
}

function weekDotColor(entries: IHKEntry[], sent: boolean): string {
  if (sent) return "rgba(16,185,129,0.9)";
  if (entries.some(e => e.category === 0) || entries.some(e => e.category === 2)) return "rgba(251,191,36,0.9)";
  return "rgba(239,68,68,0.7)";
}

function AddEntryRow({ onSave, defaultDate, pastWeeks, onFillFrom, modules }: {
  onSave: (text: string, cat: IHKCategory, date: string) => Promise<void>;
  defaultDate: string;
  pastWeeks?: { key: string; year: number; kw: number }[];
  onFillFrom?: (key: string) => void;
  modules: IHKModule[];
}) {
  const [open, setOpen] = useState(false);
  const [cat, setCat] = useState<IHKCategory>(0);
  const [selectedMod, setSelectedMod] = useState<IHKModule | null>(null);
  const [text, setText] = useState("");
  const [date, setDate] = useState(defaultDate);
  const [saving, setSaving] = useState(false);
  const [fillOpen, setFillOpen] = useState(false);
  const fillRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 10); }, [open]);
  useEffect(() => { setSelectedMod(null); }, [cat]);

  useEffect(() => {
    if (!fillOpen) return;
    const close = (e: MouseEvent) => { if (fillRef.current && !fillRef.current.contains(e.target as Node)) setFillOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [fillOpen]);

  const catModules = modules.filter(m => m.type === cat);

  const save = async () => {
    if (!text.trim() || saving) return;
    setSaving(true);
    const finalText = selectedMod ? `${selectedMod.name}: ${text.trim()}` : text.trim();
    try { await onSave(finalText, cat, date); setText(""); setSelectedMod(null); setSaving(false); }
    catch { setSaving(false); }
  };

  return (
    <div className="border-t border-s">
      {!open ? (
        <div className="flex items-center justify-between px-3 py-2">
          <button onClick={() => setOpen(true)} className="flex items-center gap-1.5 text-[11px] text-t4 hover:text-t2 transition-colors">
            <Plus size={11} /><span>Add entry</span>
          </button>
          {pastWeeks && pastWeeks.length > 0 && onFillFrom && (
            <div ref={fillRef} className="relative">
              <button
                onClick={() => setFillOpen(o => !o)}
                className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] text-t4 hover:text-t2 transition-colors"
                style={{ background: "var(--c-surface-2)", border: "1px solid var(--c-border)" }}
              >
                <ClipboardCopy size={9} />
                <span>Fill from</span>
                <ChevronDown size={8} />
              </button>
              {fillOpen && (
                <div className="absolute right-0 bottom-full mb-1 dropdown rounded-lg py-1 z-50 overflow-hidden" style={{ minWidth: 130, border: "1px solid var(--c-border)", boxShadow: "0 8px 20px rgba(0,0,0,0.3)" }}>
                  {pastWeeks.map(w => (
                    <button
                      key={w.key}
                      onClick={() => { onFillFrom(w.key); setFillOpen(false); }}
                      className="w-full text-left px-3 py-1.5 text-[11px] text-t3 hover:bg-s2 hover:text-t1 transition-colors"
                    >
                      {fmtWeekRange(w.year, w.kw)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2 px-3 py-2">
          <div className="flex gap-1.5 flex-wrap">
            {CAT_SHORT.map((label, i) => (
              <button key={i} onClick={() => setCat(i as IHKCategory)}
                className="px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors"
                style={cat === i
                  ? { background: CAT_COLORS[i][1], color: `rgba(${CAT_COLORS[i][0]},0.9)`, border: `1px solid rgba(${CAT_COLORS[i][0]},0.4)` }
                  : { background: "var(--c-surface-2)", color: "var(--c-text-4)", border: "1px solid var(--c-border)" }
                }
              >{label}</button>
            ))}
          </div>
          {modules.length > 0 && (
            <div className="flex gap-1.5 flex-wrap items-center">
              {catModules.length > 0 ? catModules.map(m => (
                <button key={m.id} onClick={() => setSelectedMod(selectedMod?.id === m.id ? null : m)}
                  className="px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors"
                  style={selectedMod?.id === m.id
                    ? { background: CAT_COLORS[cat][1], color: `rgba(${CAT_COLORS[cat][0]},0.9)`, border: `1px solid rgba(${CAT_COLORS[cat][0]},0.4)` }
                    : { background: "var(--c-surface-2)", color: "var(--c-text-4)", border: "1px solid var(--c-border)", opacity: 0.7 }
                  }
                >{m.name}</button>
              )) : (
                <span className="text-[10px] text-t6 italic">No modules for this category</span>
              )}
            </div>
          )}
          <div className="flex gap-2 items-center">
            <input ref={inputRef} value={text} onChange={e => setText(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); save(); } if (e.key === "Escape") { setOpen(false); setText(""); } e.stopPropagation(); }}
              placeholder="What did you do…"
              className="flex-1 px-2.5 py-1.5 rounded-lg text-[12px] text-t1 outline-none placeholder:text-t5"
              style={{ background: "var(--c-surface-2)", border: "1px solid var(--c-border)" }}
            />
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="px-2 py-1.5 rounded-lg text-[11px] text-t3 outline-none"
              style={{ background: "var(--c-surface-2)", border: "1px solid var(--c-border)", width: 120 }}
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => { setOpen(false); setText(""); }} className="px-2.5 py-1 rounded-lg text-[11px] text-t3 hover:text-t2 transition-colors" style={{ background: "var(--c-surface-2)" }}>Cancel</button>
            <button onClick={save} disabled={!text.trim() || saving} className="px-2.5 py-1 rounded-lg text-[11px] disabled:opacity-40 disabled:pointer-events-none transition-colors" style={{ background: CAT_COLORS[cat][1], color: `rgba(${CAT_COLORS[cat][0]},0.9)` }}>
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SortableEntryRow({ entry, onDelete, onUpdate, onConfirm }: { entry: IHKEntry; onDelete: () => void; onUpdate: (text: string) => Promise<void>; onConfirm: (title: string, msg: string, fn: () => void) => void }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(entry.text);
  const ref = useRef<HTMLInputElement>(null);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: entry.id });

  useEffect(() => { if (editing) setTimeout(() => ref.current?.select(), 10); }, [editing]);

  const commit = async () => {
    if (val.trim() && val.trim() !== entry.text) await onUpdate(val.trim());
    setEditing(false);
  };

  const [rgb] = CAT_COLORS[entry.category];

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
      className="group flex items-start gap-2 px-3 py-1.5 hover:bg-s1 rounded-lg transition-colors"
    >
      <div {...attributes} {...listeners} className="mt-1 cursor-grab active:cursor-grabbing text-t6 hover:text-t4 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <GripVertical size={10} />
      </div>
      <span className="text-[10px] font-medium mt-0.5 shrink-0 w-14 text-t5">{fmtDayStamp(entry.date)}</span>
      <span className="w-1 h-1 rounded-full mt-1.5 shrink-0" style={{ background: `rgba(${rgb},0.7)` }} />
      {editing ? (
        <input ref={ref} value={val} onChange={e => setVal(e.target.value)}
          onBlur={commit}
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); commit(); } if (e.key === "Escape") { setVal(entry.text); setEditing(false); } e.stopPropagation(); }}
          className="flex-1 text-[12px] text-t1 bg-transparent outline-none border-b" style={{ borderColor: "var(--c-border)" }}
        />
      ) : (
        <span onDoubleClick={() => setEditing(true)} className="flex-1 text-[12px] text-t2 leading-relaxed">{entry.text}</span>
      )}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button onClick={() => setEditing(true)} className="w-5 h-5 flex items-center justify-center rounded text-t4 hover:text-t2 transition-colors"><Pencil size={10} /></button>
        <button onClick={() => onConfirm("Delete entry?", "This IHK entry will be permanently deleted.", onDelete)} className="w-5 h-5 flex items-center justify-center rounded text-t4 hover:text-red-400 transition-colors"><X size={10} /></button>
      </div>
    </div>
  );
}

function WeekBlock({ year, kw, entries, isCurrentWeek, expanded, sent, onToggle, onToggleSent, onAdd, onDelete, onUpdate, onReorder, pastWeeks, onFillFrom, onConfirm, modules, polished, onOpenPolish, onDeletePolish }: {
  year: number; kw: number; entries: IHKEntry[]; isCurrentWeek: boolean;
  expanded: boolean; sent: boolean;
  onToggle: () => void; onToggleSent: () => void;
  onAdd: (text: string, cat: IHKCategory, date: string) => Promise<void>;
  onDelete: (id: number) => void;
  onUpdate: (id: number, text: string) => Promise<void>;
  onReorder: (orderedIds: number[]) => Promise<void>;
  pastWeeks?: { key: string; year: number; kw: number }[];
  onFillFrom?: (key: string) => void;
  onConfirm: (title: string, msg: string, fn: () => void) => void;
  modules: IHKModule[];
  polished: PolishedEntry | null;
  onOpenPolish: () => void;
  onDeletePolish: () => void;
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const { start } = getWeekRange(year, kw);
  const defaultDate = isCurrentWeek ? today() : start.toISOString().slice(0, 10);

  const handleDragEnd = (catIdx: number) => (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const catEntries = entries.filter(e => e.category === catIdx);
    const oldIndex = catEntries.findIndex(e => e.id === active.id);
    const newIndex = catEntries.findIndex(e => e.id === over.id);
    const reordered = arrayMove(catEntries, oldIndex, newIndex);
    // Build full order: entries NOT in this cat keep their position, catEntries replace their slots
    const otherEntries = entries.filter(e => e.category !== catIdx);
    const allReordered = [...reordered, ...otherEntries].sort((a, b) => {
      if (a.category !== b.category) return a.category - b.category;
      return reordered.findIndex(e => e.id === a.id) - reordered.findIndex(e => e.id === b.id);
    });
    onReorder(allReordered.map(e => e.id));
  };

  return (
    <div className="rounded-xl overflow-hidden shrink-0" style={{ border: "1px solid var(--c-border)", background: isCurrentWeek ? "var(--c-surface-1)" : "var(--c-surface-0)" }}>
      <button onClick={onToggle} className="w-full flex items-center gap-2 px-4 py-3 text-left transition-colors hover:bg-s1 cursor-pointer">
        {expanded ? <ChevronDown size={12} className="text-t4 shrink-0" /> : <ChevronRight size={12} className="text-t4 shrink-0" />}
        <span className="text-[12px] font-semibold text-t1">{fmtWeekRange(year, kw)}</span>
        {isCurrentWeek && (
          <span className="px-1.5 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wider" style={{ background: `rgba(${ACCENT},0.2)`, color: `rgba(${ACCENT},0.9)` }}>current</span>
        )}
        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: weekDotColor(entries, sent) }} />
        <span className="ml-auto text-[10px] text-t5">{entries.length} {entries.length === 1 ? "entry" : "entries"}</span>
        {entries.length > 0 && (
          polished ? (
            <>
              <button
                onClick={e => { e.stopPropagation(); onOpenPolish(); }}
                className="w-6 h-6 flex items-center justify-center rounded transition-colors hover:bg-s2"
                title="View AI-polished version"
                style={{ color: "rgba(147,150,255,0.9)" }}
              >
                <FileText size={11} />
              </button>
              <button
                onClick={e => {
                  e.stopPropagation();
                  onConfirm("Delete polished version?", "The AI-polished content for this week will be deleted. The original entries remain.", onDeletePolish);
                }}
                className="w-6 h-6 flex items-center justify-center rounded text-t5 hover:text-red-400 transition-colors hover:bg-s2"
                title="Delete polished version"
              >
                <X size={10} />
              </button>
            </>
          ) : (
            <button
              onClick={e => { e.stopPropagation(); onOpenPolish(); }}
              className="w-6 h-6 flex items-center justify-center rounded text-t5 hover:text-indigo-400 transition-colors hover:bg-s2"
              title="Polish with AI"
            >
              <Sparkles size={11} />
            </button>
          )
        )}
        {expanded && (
          <>
            <button onClick={e => { e.stopPropagation(); onToggleSent(); }}
              className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium transition-colors"
              style={sent
                ? { background: "rgba(16,185,129,0.15)", color: "rgba(16,185,129,0.9)", border: "1px solid rgba(16,185,129,0.35)" }
                : { background: "var(--c-surface-2)", color: "var(--c-text-4)", border: "1px solid var(--c-border)" }
              }
            >
              <Check size={9} />
              {sent ? "Sent" : "Mark sent"}
            </button>
          </>
        )}
      </button>

      {expanded && (
        <div className="border-t border-s">
          {IHK_CATEGORIES.map((catName, catIdx) => {
            const catEntries = entries.filter(e => e.category === catIdx);
            const [rgb] = CAT_COLORS[catIdx];
            return (
              <div key={catIdx} className="border-b border-s last:border-b-0">
                <CatHeader catName={catName} catIdx={catIdx} rgb={rgb} entries={catEntries} />
                <div className="px-1 py-1">
                  {catEntries.length === 0 && <p className="px-3 py-1.5 text-[11px] text-t6 italic">Nothing added yet</p>}
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd(catIdx)}>
                    <SortableContext items={catEntries.map(e => e.id)} strategy={verticalListSortingStrategy}>
                      {catEntries.map(entry => (
                        <SortableEntryRow key={entry.id} entry={entry}
                          onDelete={() => onDelete(entry.id)}
                          onUpdate={(text) => onUpdate(entry.id, text)}
                          onConfirm={onConfirm}
                        />
                      ))}
                    </SortableContext>
                  </DndContext>
                </div>
              </div>
            );
          })}
          <AddEntryRow onSave={onAdd} defaultDate={defaultDate} pastWeeks={isCurrentWeek ? pastWeeks : undefined} onFillFrom={isCurrentWeek ? onFillFrom : undefined} modules={modules} />
        </div>
      )}
    </div>
  );
}

const SCHOOL_RGB = "16,185,129";

function ModulesPanel({ modules, onAdd, onRemove }: { modules: IHKModule[]; onAdd: (name: string) => Promise<void>; onRemove: (id: number) => void }) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 50); }, []);

  const save = async () => {
    if (!name.trim() || saving) return;
    setSaving(true);
    try { await onAdd(name.trim()); setName(""); setSaving(false); }
    catch { setSaving(false); }
  };

  return (
    <div className="mx-4 mt-3 mb-1 rounded-xl overflow-hidden" style={{ border: "1px solid var(--c-border)", background: "var(--c-surface-1)" }}>
      <div className="flex flex-col gap-2 px-3 py-3">
        <p className="text-[10px] text-t5">School subjects — appear in <span className="font-mono text-blue-400">/i</span> picker → saved as Berufsschule</p>
        <div className="flex gap-2">
          <input ref={inputRef} value={name} onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); save(); } e.stopPropagation(); }}
            placeholder="LF05, Sport, Englisch…"
            className="flex-1 px-2.5 py-1.5 rounded-lg text-[12px] text-t1 outline-none placeholder:text-t5"
            style={{ background: "var(--c-surface-2)", border: "1px solid var(--c-border)" }}
          />
          <button onClick={save} disabled={!name.trim() || saving}
            className="px-2.5 py-1.5 rounded-lg text-[11px] disabled:opacity-40 disabled:pointer-events-none transition-colors"
            style={{ background: `rgba(${SCHOOL_RGB},0.15)`, color: `rgba(${SCHOOL_RGB},0.9)` }}
          >Add</button>
        </div>
        {modules.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {modules.map(m => (
              <div key={m.id} className="group flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px]"
                style={{ background: `rgba(${SCHOOL_RGB},0.12)`, color: `rgba(${SCHOOL_RGB},0.85)`, border: `1px solid rgba(${SCHOOL_RGB},0.3)` }}>
                <span className="font-medium">{m.name}</span>
                <button onClick={() => onRemove(m.id)} className="ml-0.5 opacity-0 group-hover:opacity-100 transition-opacity text-current hover:text-red-400 hover:opacity-70">
                  <X size={9} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function IHKPage({ onConfirm }: { onConfirm: (title: string, msg: string, fn: () => void) => void }) {
  const { entries, load, add, update, remove, reorder, sentWeeks, seenWeekKeys, toggleSent, modules, addModule, removeModule, registerWeek } = useIHKStore();
  const { kw: currentKW, year: currentYear } = getISOWeek(today());
  const currentKey = buildWeekKey(currentYear, currentKW);
  const [openWeek, setOpenWeek] = useState<string | null>(null);
  const [polished, setPolished] = useState<Map<string, PolishedEntry>>(new Map());
  const [polishModal, setPolishModal] = useState<{ weekKey: string; weekLabel: string; entriesByCategory: { categoryName: string; entries: { date: string; text: string }[] }[] } | null>(null);

  const loadPolished = useCallback(async () => {
    const db = await getDb();
    const rows = await db.select<PolishedEntry[]>(
      "SELECT week_key, content, generated_at FROM ihk_polished",
    );
    const map = new Map<string, PolishedEntry>();
    for (const r of rows) map.set(r.week_key, r);
    setPolished(map);
  }, []);

  useEffect(() => { load().then(() => registerWeek(currentKey)); loadPolished(); }, []);

  const savePolish = async (weekKey: string, content: string) => {
    const db = await getDb();
    await db.execute(
      `INSERT INTO ihk_polished (week_key, content, generated_at)
       VALUES (?, ?, datetime('now'))
       ON CONFLICT(week_key) DO UPDATE SET content = excluded.content, generated_at = excluded.generated_at`,
      [weekKey, content],
    );
    await loadPolished();
  };

  const deletePolish = async (weekKey: string) => {
    const db = await getDb();
    await db.execute("DELETE FROM ihk_polished WHERE week_key = ?", [weekKey]);
    await loadPolished();
  };

  // Build a contiguous range from the earliest known week to today
  const entryWeekKeys = new Set(groupByWeek(entries).map(([k]) => k));
  const allKnownKeys = new Set([...entryWeekKeys, ...seenWeekKeys, currentKey]);

  // Find earliest week key (lexicographic sort works because format is YYYY-WW)
  const sortedKeys = [...allKnownKeys].sort();
  const earliest = sortedKeys[0] ?? currentKey;
  const [eYear, eKW] = earliest.split("-").map(Number);

  // Walk forward from earliest to current week, adding every intermediate week
  const weekMap = new Map(groupByWeek(entries));
  const allWeeks: [string, { year: number; kw: number; entries: IHKEntry[] }][] = [];
  let wYear = eYear, wKW = eKW;
  while (buildWeekKey(wYear, wKW) <= currentKey) {
    const key = buildWeekKey(wYear, wKW);
    allWeeks.unshift([key, weekMap.get(key) ?? { year: wYear, kw: wKW, entries: [] }]);
    const { start } = getWeekRange(wYear, wKW);
    const nextMon = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
    const localStr = `${nextMon.getFullYear()}-${String(nextMon.getMonth()+1).padStart(2,'0')}-${String(nextMon.getDate()).padStart(2,'0')}`;
    const next = getISOWeek(localStr);
    wYear = next.year; wKW = next.kw;
  }

  const pastWeeks = allWeeks.filter(([k]) => k !== currentKey).map(([key, { year, kw }]) => ({ key, year, kw }));

  const handleFillFrom = async (sourceKey: string) => {
    const sourceWeek = allWeeks.find(([k]) => k === sourceKey);
    if (!sourceWeek) return;
    const todayStr = today();
    for (const entry of sourceWeek[1].entries) {
      await add(entry.text, entry.category, todayStr);
    }
  };

  const byMonth: { monthLabel: string; weeks: typeof allWeeks }[] = [];
  for (const item of allWeeks) {
    const { year, kw } = item[1];
    const { start } = getWeekRange(year, kw);
    const label = start.toLocaleDateString("de-DE", { month: "long", year: "numeric" });
    const last = byMonth[byMonth.length - 1];
    if (!last || last.monthLabel !== label) byMonth.push({ monthLabel: label, weeks: [item] });
    else last.weeks.push(item);
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <ModulesPanel modules={modules} onAdd={(name) => addModule(name, 2)} onRemove={removeModule} />
      <div className="overflow-y-auto flex-1 px-4 py-3 flex flex-col gap-5">
        {allWeeks.length === 0 && (
          <div className="flex flex-col items-center justify-center flex-1 text-t5 text-[12px] gap-1">
            <span>No records yet</span>
          </div>
        )}
        {byMonth.map(({ monthLabel, weeks: mWeeks }) => (
          <div key={monthLabel} className="flex flex-col gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-t5 px-1">{monthLabel}</span>
            {mWeeks.map(([key, { year, kw, entries: wEntries }]) => (
              <WeekBlock
                key={key}
                year={year} kw={kw} entries={wEntries}
                isCurrentWeek={key === currentKey}
                expanded={openWeek === key}
                sent={sentWeeks.has(key)}
                onToggle={() => setOpenWeek(k => k === key ? null : key)}
                onToggleSent={() => toggleSent(key)}
                onAdd={add} onDelete={remove} onUpdate={update} onReorder={reorder}
                pastWeeks={pastWeeks}
                onFillFrom={handleFillFrom}
                onConfirm={onConfirm}
                modules={modules}
                polished={polished.get(key) ?? null}
                onOpenPolish={() => setPolishModal({
                  weekKey: key,
                  weekLabel: fmtWeekRange(year, kw),
                  entriesByCategory: IHK_CATEGORIES.map((catName, catIdx) => {
                    const catEntries = wEntries.filter(e => e.category === catIdx).map(e => ({ date: e.date, text: e.text }));
                    // Always append a daily stand-up entry to Betrieb when the week has any work
                    if (catIdx === 0 && catEntries.length > 0) {
                      const lastDate = catEntries[catEntries.length - 1].date;
                      catEntries.push({ date: lastDate, text: "Teilnahme an täglichen Stand-ups" });
                    }
                    return { categoryName: catName, entries: catEntries };
                  }),
                })}
                onDeletePolish={() => deletePolish(key)}
              />
            ))}
          </div>
        ))}
      </div>
      {polishModal && (
        <AIIHKPolishModal
          weekLabel={polishModal.weekLabel}
          weekKey={polishModal.weekKey}
          entriesByCategory={polishModal.entriesByCategory}
          saved={polished.get(polishModal.weekKey) ?? null}
          onClose={() => setPolishModal(null)}
          onSaved={async (content) => { await savePolish(polishModal.weekKey, content); }}
        />
      )}
    </div>
  );
}
