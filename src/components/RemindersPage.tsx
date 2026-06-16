import { useEffect } from "react";
import { useReminderStore, Reminder } from "../reminderStore";

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

export default function RemindersPage({ onDeleteRequest }: { onDeleteRequest: (id: number) => void }) {
  const { reminders, load } = useReminderStore();

  useEffect(() => { load(); }, [load]);

  const upcoming = reminders.filter((r) => !r.notified);
  const done = reminders.filter((r) => r.notified);

  const ReminderRow = ({ r }: { r: Reminder }) => (
    <div
      className="flex items-center gap-3 px-5 rounded-lg mx-1.5 hover:bg-white/[0.04] transition-colors"
      style={{ minHeight: 52 }}
    >
      <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${
        r.notified ? "bg-white/20" : isOverdue(r.remind_at) ? "bg-red-400" : "bg-blue-400"
      }`} />
      <div className="flex-1 min-w-0">
        <p className={`text-[14px] truncate ${r.notified ? "text-white/30" : "text-white/80"}`}>{r.text}</p>
        <p className={`text-xs mt-0.5 ${
          r.notified ? "text-white/20" : isOverdue(r.remind_at) ? "text-red-400/70" : "text-white/35"
        }`}>
          {formatDateTime(r.remind_at)}
          {isOverdue(r.remind_at) && !r.notified && " · overdue"}
          {r.notified && " · sent"}
        </p>
      </div>
      <button
        onClick={() => onDeleteRequest(r.id)}
        className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/10 transition-colors text-white/25 hover:text-red-400 shrink-0"
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M2 2l6 6M8 2l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );

  return (
    <div className="view-animate overflow-y-auto flex-1 py-1.5">
      {reminders.length === 0 ? (
        <div className="px-5 py-10 text-center text-white/20 text-sm select-none">
          No reminders yet — type /rm in the main view
        </div>
      ) : (
        <>
          {upcoming.length > 0 && (
            <>
              <p className="px-5 pt-2 pb-1 text-[10px] text-white/25 uppercase tracking-widest select-none">Upcoming</p>
              {upcoming.map((r) => <ReminderRow key={r.id} r={r} />)}
            </>
          )}
          {done.length > 0 && (
            <>
              <p className="px-5 pt-3 pb-1 text-[10px] text-white/25 uppercase tracking-widest select-none">Sent</p>
              {done.map((r) => <ReminderRow key={r.id} r={r} />)}
            </>
          )}
        </>
      )}
    </div>
  );
}
