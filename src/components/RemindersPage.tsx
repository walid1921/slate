import { useEffect, useState, useRef } from "react";
import { Pencil, Clock, Send, Trash2, Plus, X } from "lucide-react";
import { useReminderStore, Reminder } from "../reminderStore";
import FilterBar, { ReminderFilter, ReminderSort } from "./FilterBar";

function AddReminderModal({ onClose }: { onClose: () => void }) {
  const { add } = useReminderStore();
  const [text, setText] = useState("");
  const today = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const [date, setDate] = useState(`${today.getFullYear()}-${pad(today.getMonth()+1)}-${pad(today.getDate())}`);
  const [time, setTime] = useState(`${pad((today.getHours()+1) % 24)}:00`);
  const textRef = useRef<HTMLInputElement>(null);

  useEffect(() => { textRef.current?.focus(); }, []);

  const handleSave = async () => {
    if (!text.trim()) return;
    await add(text.trim(), `${date}T${time}:00`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.45)" }}>
      <div className="dropdown rounded-2xl flex flex-col overflow-hidden" style={{ width: 320, border: "1px solid var(--c-border)", boxShadow: "0 16px 48px rgba(0,0,0,0.4)" }}>
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid var(--c-border-subtle)" }}>
          <span className="text-[13px] font-semibold text-t1">New Reminder</span>
          <button onClick={onClose} className="text-t4 hover:text-t2 transition-colors"><X size={14} /></button>
        </div>
        <div className="flex flex-col gap-3 px-4 py-4">
          <input
            ref={textRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") onClose(); e.stopPropagation(); }}
            placeholder="Reminder text…"
            className="w-full px-3 py-2 rounded-lg text-[13px] text-t1 outline-none placeholder:text-t5"
            style={{ background: "var(--c-surface-2)", border: "1px solid var(--c-border)" }}
          />
          <div className="flex gap-2">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
              className="flex-1 px-3 py-2 rounded-lg text-[13px] text-t1 outline-none"
              style={{ background: "var(--c-surface-2)", border: "1px solid var(--c-border)" }}
            />
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
              className="px-3 py-2 rounded-lg text-[13px] text-t1 outline-none"
              style={{ background: "var(--c-surface-2)", border: "1px solid var(--c-border)", width: 100 }}
            />
          </div>
        </div>
        <div className="flex gap-2 justify-end px-4 pb-4">
          <button onClick={onClose} className="px-3 py-1.5 rounded-lg text-[12px] text-t3 hover:text-t2 transition-colors" style={{ background: "var(--c-surface-2)" }}>Cancel</button>
          <button onClick={handleSave} disabled={!text.trim()} className="px-3 py-1.5 rounded-lg text-[12px] text-indigo-400 hover:text-indigo-300 disabled:opacity-40 transition-colors" style={{ background: "rgba(99,102,241,0.15)" }}>Add Reminder</button>
        </div>
      </div>
    </div>
  );
}
function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const isTomorrow = d.toDateString() === new Date(now.getTime() + 86400000).toDateString();
  const timeStr = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  if (isToday) return `Today at ${timeStr}`;
  if (isTomorrow) return `Tomorrow at ${timeStr}`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + ` at ${timeStr}`;
}

function isOverdue(iso: string): boolean {
  return new Date(iso) < new Date();
}


function ReminderRow({ r, onDeleteRequest, onConfirm, focused, onFocus }: { r: Reminder; onDeleteRequest: () => void; onConfirm: (title: string, msg: string, fn: () => void, confirmLabel?: string, confirmClassName?: string) => void; focused?: boolean; onFocus?: () => void }) {
  const { update, markSent } = useReminderStore();
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menu) return;
    const close = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenu(null); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menu]);
  const [editingText, setEditingText] = useState(false);
  const [editingTime, setEditingTime] = useState(false);
  const [textVal, setTextVal] = useState(r.text);
  const [dateVal, setDateVal] = useState(r.remind_at.slice(0, 10));
  const [timeVal, setTimeVal] = useState(r.remind_at.slice(11, 16));
  const textRef = useRef<HTMLInputElement>(null);
  const dateRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingText) { setTextVal(r.text); setTimeout(() => textRef.current?.select(), 10); }
  }, [editingText]);

  useEffect(() => {
    if (editingTime) { setDateVal(r.remind_at.slice(0, 10)); setTimeVal(r.remind_at.slice(11, 16)); }
  }, [editingTime]);

  const commitText = () => {
    const trimmed = textVal.trim();
    if (trimmed && trimmed !== r.text) update(r.id, trimmed, r.remind_at);
    setEditingText(false);
  };

  const commitTime = () => {
    const newIso = `${dateVal}T${timeVal}:00`;
    if (newIso !== r.remind_at) update(r.id, r.text, newIso);
    setEditingTime(false);
  };

  return (
    <div
      onClick={onFocus}
      onContextMenu={(e) => { e.preventDefault(); setMenu({ x: e.clientX, y: e.clientY }); }}
      className={`group/row relative flex items-center gap-3 px-5 py-3 border-b border-s transition-colors cursor-default ${!focused ? "hover:bg-s1" : ""}`}
      style={{ minHeight: 56, background: focused ? "var(--c-surface-2)" : undefined }}
    >
      {menu && (
        <div
          ref={menuRef}
          className="dropdown fixed z-50 rounded-lg shadow-xl py-1 min-w-[160px]"
          style={{ left: menu.x, top: menu.y }}
        >
          {!r.notified && (
            <button onClick={() => { onConfirm("Send now?", `"${r.text}" will be marked as sent.`, () => markSent(r.id), "Send", "text-blue-400 bg-blue-500/20 hover:bg-blue-500/30"); setMenu(null); }} className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[13px] text-t1 hover:bg-s2 transition-colors">
              <Send size={12} className="text-t4" /><span>Send now</span>
            </button>
          )}
          <button onClick={() => { setEditingText(true); setMenu(null); }} className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[13px] text-t1 hover:bg-s2 transition-colors">
            <Pencil size={12} className="text-t4" /><span>Edit text</span>
          </button>
          <button onClick={() => { setEditingTime(true); setMenu(null); }} className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[13px] text-t1 hover:bg-s2 transition-colors">
            <Clock size={12} className="text-t4" /><span>Edit time</span>
          </button>
          <div style={{ height: 1, background: "var(--c-border-subtle)", margin: "4px 0" }} />
          <button onClick={() => { onDeleteRequest(); setMenu(null); }} className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[13px] text-red-400 hover:bg-s2 transition-colors">
            <Trash2 size={12} /><span>Delete</span>
          </button>
        </div>
      )}
      <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${
        r.notified ? "" : isOverdue(r.remind_at) ? "bg-red-400" : "bg-blue-400"
      }`} style={r.notified ? { background: "var(--c-text-5)" } : {}} />

      <div className="flex-1 min-w-0">
        {editingText ? (
          <input
            ref={textRef}
            value={textVal}
            onChange={(e) => setTextVal(e.target.value)}
            onBlur={commitText}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); commitText(); }
              if (e.key === "Escape") setEditingText(false);
              e.stopPropagation();
            }}
            className="w-full text-[14px] text-t1 bg-transparent outline-none border-b"
            style={{ borderColor: "var(--c-border)" }}
          />
        ) : (
          <p
            onDoubleClick={() => setEditingText(true)}
            className={`text-[14px] truncate ${r.notified ? "text-t4" : "text-t1"}`}
          >
            {r.text}
          </p>
        )}

        {editingTime ? (
          <div className="flex items-center gap-1.5 mt-0.5">
            <input
              type="date"
              value={dateVal}
              onChange={(e) => setDateVal(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Escape") setEditingTime(false); e.stopPropagation(); }}
              className="text-xs text-t2 bg-transparent outline-none border-b"
              style={{ borderColor: "var(--c-border)" }}
            />
            <input
              ref={dateRef}
              type="time"
              value={timeVal}
              onChange={(e) => setTimeVal(e.target.value)}
              onBlur={commitTime}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); commitTime(); } if (e.key === "Escape") setEditingTime(false); e.stopPropagation(); }}
              className="text-xs text-t2 bg-transparent outline-none border-b"
              style={{ borderColor: "var(--c-border)" }}
            />
          </div>
        ) : (
          <p
            onDoubleClick={() => setEditingTime(true)}
            className={`text-xs mt-0.5 ${
              r.notified ? "text-t5" : isOverdue(r.remind_at) ? "text-red-400/70" : "text-t4"
            }`}
          >
            {formatDateTime(r.remind_at)}
            {isOverdue(r.remind_at) && !r.notified && " · overdue"}
            {r.notified && " · sent"}
          </p>
        )}
      </div>

    </div>
  );
}

export default function RemindersPage({ onDeleteRequest, onConfirm }: { onDeleteRequest: (id: number) => void; onConfirm: (title: string, msg: string, fn: () => void, confirmLabel?: string, confirmClassName?: string) => void }) {
  const { reminders, load, markSent, dismissAlert } = useReminderStore();
  const [filter, setFilter] = useState<ReminderFilter>("all");
  const [sort, setSort] = useState<ReminderSort>("time");
  const [focusedIdx, setFocusedIdx] = useState(0);
  const [addOpen, setAddOpen] = useState(false);

  useEffect(() => { load(); }, [load]);

  const handleRefresh = async () => {
    dismissAlert();
    try {
      const { WebviewWindow } = await import("@tauri-apps/api/webviewWindow");
      const overlay = await WebviewWindow.getByLabel("reminder-overlay");
      if (overlay) await overlay.close();
    } catch {}
    await load();
  };

  const sorted = [...reminders].sort((a, b) => {
    if (sort === "az") return a.text.localeCompare(b.text);
    return new Date(a.remind_at).getTime() - new Date(b.remind_at).getTime();
  });

  const visible = sorted.filter((r) => {
    if (filter === "upcoming") return !r.notified;
    if (filter === "sent") return r.notified;
    return true;
  });

  const upcoming = visible.filter((r) => !r.notified);
  const done = visible.filter((r) => r.notified);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === "INPUT") return;
      if (e.key === "ArrowDown") { e.preventDefault(); setFocusedIdx((i) => Math.min(i + 1, visible.length - 1)); return; }
      if (e.key === "ArrowUp")   { e.preventDefault(); setFocusedIdx((i) => Math.max(i - 1, 0)); return; }
      if (e.key === "Backspace" || e.key === "Delete") {
        const r = visible[focusedIdx];
        if (r) onDeleteRequest(r.id);
        return;
      }
      if (e.key === " ") {
        const r = visible[focusedIdx];
        if (r && !r.notified) { e.preventDefault(); onConfirm("Send reminder now?", `"${r.text}" will be marked as sent.`, () => markSent(r.id), "Send", "text-blue-400 bg-blue-500/20 hover:bg-blue-500/30"); }
        return;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible, focusedIdx, onDeleteRequest, onConfirm, markSent]);

  return (
    <div className="view-animate flex flex-col flex-1 overflow-hidden">
      {addOpen && <AddReminderModal onClose={() => { setAddOpen(false); load(); }} />}
      <div className="flex items-center" style={{ borderBottom: "1px solid var(--c-border-subtle)" }}>
        <div className="flex-1 overflow-hidden">
          <FilterBar page="reminders" filter={filter} sort={sort} onFilter={setFilter} onSort={setSort} onRefresh={handleRefresh} />
        </div>
        <button
          onClick={() => setAddOpen(true)}
          className="flex items-center gap-1 px-3 py-1.5 mr-2 rounded-lg text-[12px] text-indigo-400 hover:text-indigo-300 transition-colors shrink-0"
          style={{ background: "rgba(99,102,241,0.12)" }}
        >
          <Plus size={12} />
          Add
        </button>
      </div>
      <div className="overflow-y-auto flex-1 py-1.5">
        {reminders.length === 0 ? (
          <div className="px-5 py-10 text-center text-t5 text-sm select-none">
            No reminders yet — type /rm in the main view
          </div>
        ) : visible.length === 0 ? (
          <div className="px-5 py-10 text-center text-t5 text-sm select-none">No reminders match this filter</div>
        ) : (
          <>
            {filter !== "sent" && upcoming.length > 0 && (
              <>
                <p className="px-5 pt-2 pb-1 text-[10px] text-t4 uppercase tracking-widest select-none">Upcoming</p>
                {upcoming.map((r) => <ReminderRow key={r.id} r={r} focused={visible.indexOf(r) === focusedIdx} onFocus={() => setFocusedIdx(visible.indexOf(r))} onDeleteRequest={() => onDeleteRequest(r.id)} onConfirm={onConfirm} />)}
              </>
            )}
            {filter !== "upcoming" && done.length > 0 && (
              <>
                <p className="px-5 pt-3 pb-1 text-[10px] text-t4 uppercase tracking-widest select-none">Sent</p>
                {done.map((r) => <ReminderRow key={r.id} r={r} focused={visible.indexOf(r) === focusedIdx} onFocus={() => setFocusedIdx(visible.indexOf(r))} onDeleteRequest={() => onDeleteRequest(r.id)} onConfirm={onConfirm} />)}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
