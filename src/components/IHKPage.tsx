import { useEffect, useRef, useState } from "react";
import { Plus, X, Pencil, Copy, Check, ChevronDown, ChevronRight } from "lucide-react";
import { useIHKStore, IHK_CATEGORIES, IHKCategory, IHKEntry } from "../ihkStore";

const ACCENT = "251,191,36"; // amber
const CAT_COLORS: [string, string][] = [
  ["59,130,246", "rgba(59,130,246,0.15)"],   // blue — Betriebliche
  ["99,102,241", "rgba(99,102,241,0.15)"],   // indigo — Unterweisungen
  ["16,185,129", "rgba(16,185,129,0.15)"],   // emerald — Berufsschule
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
  const fri = new Date(mon);
  fri.setDate(mon.getDate() + 4);
  return { start: mon, end: fri };
}

function fmtWeekRange(year: number, kw: number): string {
  const { start, end } = getWeekRange(year, kw);
  const opts: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short" };
  return `${start.toLocaleDateString("de-DE", opts)} – ${end.toLocaleDateString("de-DE", opts)}`;
}

function fmtDayStamp(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const day = d.toLocaleDateString("de-DE", { weekday: "short" });
  const p = (n: number) => String(n).padStart(2, "0");
  return `${day} ${p(d.getDate())}.${p(d.getMonth() + 1)}`;
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
  return Array.from(map.entries())
    .sort((a, b) => b[0].localeCompare(a[0]));
}

function buildCopyText(year: number, kw: number, entries: IHKEntry[]): string {
  const cats = IHK_CATEGORIES.map((name, i) => {
    const items = entries.filter(e => e.category === i);
    const bullets = items.length > 0
      ? items.map(e => `- ${fmtDayStamp(e.date)}: ${e.text}`).join("<br>")
      : "-";
    return `| **${name}** | ${bullets} |`;
  });
  return `KW ${kw} / ${year} (${fmtWeekRange(year, kw)})\n\n| **Kategorie** | **Inhalte** |\n| --- | --- |\n${cats.join("\n")}`;
}

function AddEntryRow({ onSave, defaultDate }: { onSave: (text: string, cat: IHKCategory, date: string) => Promise<void>; defaultDate: string }) {
  const [open, setOpen] = useState(false);
  const [cat, setCat] = useState<IHKCategory>(0);
  const [text, setText] = useState("");
  const [date, setDate] = useState(defaultDate);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 10); }, [open]);

  const save = async () => {
    if (!text.trim() || saving) return;
    setSaving(true);
    try {
      await onSave(text.trim(), cat, date);
      setText("");
      setSaving(false);
    } catch { setSaving(false); }
  };

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="flex items-center gap-1.5 px-3 py-2 text-[11px] text-t4 hover:text-t2 transition-colors w-full text-left">
        <Plus size={11} />
        <span>Add entry</span>
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2 px-3 py-2 border-t border-s">
      {/* Category pills */}
      <div className="flex gap-1.5 flex-wrap">
        {CAT_SHORT.map((label, i) => (
          <button
            key={i}
            onClick={() => setCat(i as IHKCategory)}
            className="px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors"
            style={cat === i
              ? { background: CAT_COLORS[i][1], color: `rgba(${CAT_COLORS[i][0]},0.9)`, border: `1px solid rgba(${CAT_COLORS[i][0]},0.4)` }
              : { background: "var(--c-surface-2)", color: "var(--c-text-4)", border: "1px solid var(--c-border)" }
            }
          >
            {label}
          </button>
        ))}
      </div>
      {/* Text + date */}
      <div className="flex gap-2 items-center">
        <input
          ref={inputRef}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter") { e.preventDefault(); save(); }
            if (e.key === "Escape") { setOpen(false); setText(""); }
            e.stopPropagation();
          }}
          placeholder="What did you do…"
          className="flex-1 px-2.5 py-1.5 rounded-lg text-[12px] text-t1 outline-none placeholder:text-t5"
          style={{ background: "var(--c-surface-2)", border: "1px solid var(--c-border)" }}
        />
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          className="px-2 py-1.5 rounded-lg text-[11px] text-t3 outline-none"
          style={{ background: "var(--c-surface-2)", border: "1px solid var(--c-border)", width: 120 }}
        />
      </div>
      {/* Actions */}
      <div className="flex gap-2 justify-end">
        <button onClick={() => { setOpen(false); setText(""); }} className="px-2.5 py-1 rounded-lg text-[11px] text-t3 hover:text-t2 transition-colors" style={{ background: "var(--c-surface-2)" }}>Cancel</button>
        <button onClick={save} disabled={!text.trim() || saving} className="px-2.5 py-1 rounded-lg text-[11px] disabled:opacity-40 disabled:pointer-events-none transition-colors" style={{ background: CAT_COLORS[cat][1], color: `rgba(${CAT_COLORS[cat][0]},0.9)` }}>
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}

function EntryRow({ entry, onDelete, onUpdate }: { entry: IHKEntry; onDelete: () => void; onUpdate: (text: string) => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(entry.text);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => { if (editing) setTimeout(() => { ref.current?.select(); }, 10); }, [editing]);

  const commit = async () => {
    if (val.trim() && val.trim() !== entry.text) await onUpdate(val.trim());
    setEditing(false);
  };

  const [rgb] = CAT_COLORS[entry.category];

  return (
    <div className="group flex items-start gap-2 px-3 py-1.5 hover:bg-s1 rounded-lg transition-colors">
      <span className="text-[10px] font-medium mt-0.5 shrink-0 w-16 text-t5">{fmtDayStamp(entry.date)}</span>
      <span className="w-1 h-1 rounded-full mt-1.5 shrink-0" style={{ background: `rgba(${rgb},0.7)` }} />
      {editing ? (
        <input
          ref={ref}
          value={val}
          onChange={e => setVal(e.target.value)}
          onBlur={commit}
          onKeyDown={e => {
            if (e.key === "Enter") { e.preventDefault(); commit(); }
            if (e.key === "Escape") { setVal(entry.text); setEditing(false); }
            e.stopPropagation();
          }}
          className="flex-1 text-[12px] text-t1 bg-transparent outline-none border-b"
          style={{ borderColor: "var(--c-border)" }}
        />
      ) : (
        <span onDoubleClick={() => setEditing(true)} className="flex-1 text-[12px] text-t2 leading-relaxed">{entry.text}</span>
      )}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button onClick={() => setEditing(true)} className="w-5 h-5 flex items-center justify-center rounded text-t4 hover:text-t2 transition-colors"><Pencil size={10} /></button>
        <button onClick={onDelete} className="w-5 h-5 flex items-center justify-center rounded text-t4 hover:text-red-400 transition-colors"><X size={10} /></button>
      </div>
    </div>
  );
}

function WeekBlock({ year, kw, entries, isCurrentWeek, expanded, onToggle, onAdd, onDelete, onUpdate }: {
  year: number;
  kw: number;
  entries: IHKEntry[];
  isCurrentWeek: boolean;
  expanded: boolean;
  onToggle: () => void;
  onAdd: (text: string, cat: IHKCategory, date: string) => Promise<void>;
  onDelete: (id: number) => void;
  onUpdate: (id: number, text: string) => Promise<void>;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(buildCopyText(year, kw, entries));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const { start } = getWeekRange(year, kw);
  const defaultDate = isCurrentWeek ? today() : start.toISOString().slice(0, 10);

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--c-border)", background: isCurrentWeek ? "var(--c-surface-1)" : "var(--c-surface-0)" }}>
      {/* Week header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-4 py-3 text-left transition-colors hover:bg-s1 cursor-pointer"
      >
        {expanded ? <ChevronDown size={12} className="text-t4 shrink-0" /> : <ChevronRight size={12} className="text-t4 shrink-0" />}
        <span className="text-[12px] font-semibold text-t1">KW {kw}</span>
        {isCurrentWeek && (
          <span className="px-1.5 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wider" style={{ background: `rgba(${ACCENT},0.2)`, color: `rgba(${ACCENT},0.9)` }}>
            current
          </span>
        )}
        <span className="text-[11px] text-t5 ml-1">{fmtWeekRange(year, kw)}</span>
        <span className="ml-auto text-[10px] text-t5">{entries.length} {entries.length === 1 ? "entry" : "entries"}</span>
        {expanded && (
          <button
            onClick={e => { e.stopPropagation(); copy(); }}
            className="ml-2 flex items-center gap-1 px-2 py-0.5 rounded text-[10px] transition-colors"
            style={{ background: `rgba(${ACCENT},0.12)`, color: `rgba(${ACCENT},0.8)`, border: `1px solid rgba(${ACCENT},0.25)` }}
          >
            {copied ? <Check size={9} /> : <Copy size={9} />}
            {copied ? "Copied!" : "Copy IHK"}
          </button>
        )}
      </button>

      {/* Expanded body */}
      {expanded && (
        <div className="border-t border-s">
          {IHK_CATEGORIES.map((catName, catIdx) => {
            const catEntries = entries.filter(e => e.category === catIdx);
            const [rgb] = CAT_COLORS[catIdx];
            return (
              <div key={catIdx} className="border-b border-s last:border-b-0">
                <div className="flex items-center gap-2 px-3 py-2" style={{ background: `rgba(${rgb},0.04)` }}>
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: `rgba(${rgb},0.7)` }} />
                  <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: `rgba(${rgb},0.8)` }}>{catName}</span>
                  <span className="ml-auto text-[10px] text-t5">{catEntries.length}</span>
                </div>
                <div className="px-1 py-1">
                  {catEntries.length === 0 && (
                    <p className="px-3 py-1.5 text-[11px] text-t6 italic">Nothing added yet</p>
                  )}
                  {catEntries.map(entry => (
                    <EntryRow
                      key={entry.id}
                      entry={entry}
                      onDelete={() => onDelete(entry.id)}
                      onUpdate={(text) => onUpdate(entry.id, text)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
          <AddEntryRow onSave={onAdd} defaultDate={defaultDate} />
        </div>
      )}
    </div>
  );
}

export default function IHKPage() {
  const { entries, load, add, update, remove } = useIHKStore();
  const { kw: currentKW, year: currentYear } = getISOWeek(today());
  const currentKey = buildWeekKey(currentYear, currentKW);
  const [openWeek, setOpenWeek] = useState<string | null>(currentKey);

  useEffect(() => { load(); }, []);

  const weeks = groupByWeek(entries);
  const hasCurrentWeek = weeks.some(([k]) => k === currentKey);
  const allWeeks: [string, { year: number; kw: number; entries: IHKEntry[] }][] = hasCurrentWeek
    ? weeks
    : [[currentKey, { year: currentYear, kw: currentKW, entries: [] }], ...weeks];

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="overflow-y-auto flex-1 px-4 py-4 flex flex-col gap-3">
        {allWeeks.length === 0 && (
          <div className="flex flex-col items-center justify-center flex-1 text-t5 text-[12px] gap-1">
            <span>No records yet</span>
          </div>
        )}
        {allWeeks.map(([key, { year, kw, entries: wEntries }]) => (
          <WeekBlock
            key={key}
            year={year}
            kw={kw}
            entries={wEntries}
            isCurrentWeek={key === currentKey}
            expanded={openWeek === key}
            onToggle={() => setOpenWeek(k => k === key ? null : key)}
            onAdd={add}
            onDelete={remove}
            onUpdate={update}
          />
        ))}
      </div>
    </div>
  );
}
