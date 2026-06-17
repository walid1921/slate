import { useEffect, useState, useRef } from "react";
import { Pencil, X, Clock } from "lucide-react";
import { useReminderStore, Reminder } from "../reminderStore";
import FilterBar, { ReminderFilter, ReminderSort } from "./FilterBar";
import { useSettingsStore, ViewMode } from "../settingsStore";

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

function ReminderCard({ r, onDeleteRequest }: { r: Reminder; onDeleteRequest: () => void }) {
  const { update } = useReminderStore();
  const [editingText, setEditingText] = useState(false);
  const [editingTime, setEditingTime] = useState(false);
  const [textVal, setTextVal] = useState(r.text);
  const [dateVal, setDateVal] = useState(r.remind_at.slice(0, 10));
  const [timeVal, setTimeVal] = useState(r.remind_at.slice(11, 16));
  const textRef = useRef<HTMLInputElement>(null);

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
      className="rounded-xl p-3 flex flex-col gap-1.5"
      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.07)" }}
    >
      <div className="flex items-start justify-between gap-1">
        <div className={`w-1.5 h-1.5 rounded-full shrink-0 mt-1 ${r.notified ? "bg-white/20" : isOverdue(r.remind_at) ? "bg-red-400" : "bg-blue-400"}`} />
        <button onClick={onDeleteRequest} className="text-white/20 hover:text-red-400 transition-colors shrink-0">
          <X size={10} />
        </button>
      </div>
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
          className="text-[12px] font-medium text-white/88 bg-transparent outline-none border-b border-white/20 leading-snug"
        />
      ) : (
        <p
          onDoubleClick={() => setEditingText(true)}
          className={`text-[12px] font-medium leading-snug ${r.notified ? "text-white/30" : "text-white/80"}`}
        >
          {r.text}
        </p>
      )}
      <div className="flex items-center gap-1 mt-auto pt-1">
        <Clock size={9} className={r.notified ? "text-white/20" : isOverdue(r.remind_at) ? "text-red-400/60" : "text-white/30"} />
        {editingTime ? (
          <div className="flex items-center gap-1">
            <input
              type="date"
              value={dateVal}
              onChange={(e) => setDateVal(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Escape") setEditingTime(false); e.stopPropagation(); }}
              className="text-[10px] text-white/60 bg-transparent outline-none border-b border-white/20"
            />
            <input
              type="time"
              value={timeVal}
              onChange={(e) => setTimeVal(e.target.value)}
              onBlur={commitTime}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); commitTime(); } if (e.key === "Escape") setEditingTime(false); e.stopPropagation(); }}
              className="text-[10px] text-white/60 bg-transparent outline-none border-b border-white/20"
            />
          </div>
        ) : (
          <p
            onDoubleClick={() => setEditingTime(true)}
            className={`text-[10px] ${r.notified ? "text-white/20" : isOverdue(r.remind_at) ? "text-red-400/70" : "text-white/35"}`}
          >
            {formatDateTime(r.remind_at)}
          </p>
        )}
      </div>
    </div>
  );
}

function ReminderRow({ r, onDeleteRequest }: { r: Reminder; onDeleteRequest: () => void }) {
  const { update } = useReminderStore();
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
      className="group/row flex items-center gap-3 px-5 rounded-lg mx-1.5 hover:bg-white/[0.04] transition-colors"
      style={{ minHeight: 52 }}
    >
      <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${
        r.notified ? "bg-white/20" : isOverdue(r.remind_at) ? "bg-red-400" : "bg-blue-400"
      }`} />

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
            className="w-full text-[14px] text-white/88 bg-transparent outline-none border-b border-white/20"
          />
        ) : (
          <p
            onDoubleClick={() => setEditingText(true)}
            className={`text-[14px] truncate ${r.notified ? "text-white/30" : "text-white/80"}`}
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
              className="text-xs text-white/60 bg-transparent outline-none border-b border-white/20"
            />
            <input
              ref={dateRef}
              type="time"
              value={timeVal}
              onChange={(e) => setTimeVal(e.target.value)}
              onBlur={commitTime}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); commitTime(); } if (e.key === "Escape") setEditingTime(false); e.stopPropagation(); }}
              className="text-xs text-white/60 bg-transparent outline-none border-b border-white/20"
            />
          </div>
        ) : (
          <p
            onDoubleClick={() => setEditingTime(true)}
            className={`text-xs mt-0.5 ${
              r.notified ? "text-white/20" : isOverdue(r.remind_at) ? "text-red-400/70" : "text-white/35"
            }`}
          >
            {formatDateTime(r.remind_at)}
            {isOverdue(r.remind_at) && !r.notified && " · overdue"}
            {r.notified && " · sent"}
          </p>
        )}
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover/row:opacity-100 transition-opacity shrink-0">
        <button
          onClick={() => setEditingText(true)}
          title="Edit text"
          className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/10 transition-colors text-white/25 hover:text-white/60"
        >
          <Pencil size={11} />
        </button>
        <button
          onClick={() => onDeleteRequest()}
          className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/10 transition-colors text-white/25 hover:text-red-400"
        >
          <X size={10} />
        </button>
      </div>
    </div>
  );
}

export default function RemindersPage({ onDeleteRequest }: { onDeleteRequest: (id: number) => void }) {
  const { reminders, load } = useReminderStore();
  const [filter, setFilter] = useState<ReminderFilter>("all");
  const [sort, setSort] = useState<ReminderSort>("time");
  const { remindersViewMode, set: setSetting } = useSettingsStore();

  useEffect(() => { load(); }, [load]);

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

  return (
    <div className="view-animate flex flex-col flex-1 overflow-hidden">
      <FilterBar page="reminders" filter={filter} sort={sort} viewMode={remindersViewMode} onFilter={setFilter} onSort={setSort} onViewMode={(v: ViewMode) => setSetting("remindersViewMode", v)} />
      <div className="overflow-y-auto flex-1 py-1.5">
        {reminders.length === 0 ? (
          <div className="px-5 py-10 text-center text-white/20 text-sm select-none">
            No reminders yet — type /rm in the main view
          </div>
        ) : visible.length === 0 ? (
          <div className="px-5 py-10 text-center text-white/20 text-sm select-none">No reminders match this filter</div>
        ) : remindersViewMode === "cards" ? (
          <div className="grid grid-cols-2 gap-2 px-3 py-2">
            {visible.map((r) => (
              <ReminderCard key={r.id} r={r} onDeleteRequest={() => onDeleteRequest(r.id)} />
            ))}
          </div>
        ) : (
          <>
            {filter !== "sent" && upcoming.length > 0 && (
              <>
                <p className="px-5 pt-2 pb-1 text-[10px] text-white/25 uppercase tracking-widest select-none">Upcoming</p>
                {upcoming.map((r) => <ReminderRow key={r.id} r={r} onDeleteRequest={() => onDeleteRequest(r.id)} />)}
              </>
            )}
            {filter !== "upcoming" && done.length > 0 && (
              <>
                <p className="px-5 pt-3 pb-1 text-[10px] text-white/25 uppercase tracking-widest select-none">Sent</p>
                {done.map((r) => <ReminderRow key={r.id} r={r} onDeleteRequest={() => onDeleteRequest(r.id)} />)}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
