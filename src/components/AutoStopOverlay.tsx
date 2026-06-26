import { Moon, Play, X } from "lucide-react";
import { AutoStopEvent, fmtDuration, useTimerStore } from "../timerStore";
import { useTodoStore } from "../store";

export default function AutoStopOverlay({ event }: { event: AutoStopEvent }) {
  const { setAutoStop, start } = useTimerStore();
  const { todos } = useTodoStore();
  const task = todos.find(t => t.id === event.taskId);
  const close = () => setAutoStop(null);
  const resume = async () => {
    await start(event.taskId);
    setAutoStop(null);
  };

  const stoppedAt = new Date(event.stoppedAtMs).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(14px) saturate(1.2)", WebkitBackdropFilter: "blur(14px) saturate(1.2)" }}
      onMouseDown={e => { if (e.target === e.currentTarget) close(); }}
    >
      <div
        className="dropdown rounded-2xl shadow-2xl flex flex-col"
        style={{ width: 440, border: "1px solid var(--c-border)" }}
      >
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid var(--c-border-subtle)" }}>
          <div className="flex items-center gap-2">
            <Moon size={14} className="text-amber-400" />
            <span className="text-[13px] font-semibold text-t1">Timer auto-stopped</span>
          </div>
          <button onClick={close} className="text-t4 hover:text-t2 transition-colors"><X size={13} /></button>
        </div>

        <div className="flex flex-col gap-3 px-5 py-5">
          <p className="text-[12px] text-t3 leading-relaxed">
            {event.detail}. Your session was closed at <span className="text-t2 font-medium">{stoppedAt}</span>.
          </p>

          <div className="flex flex-col gap-1.5 px-3 py-2.5 rounded-lg" style={{ background: "var(--c-surface-1)", border: "1px solid var(--c-border-subtle)" }}>
            <div className="flex items-center justify-between gap-3">
              <span className="text-[10px] text-t4 uppercase tracking-wider">Task</span>
              <span className="text-[12px] text-t1 truncate">{task?.text ?? "(deleted task)"}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-[10px] text-t4 uppercase tracking-wider">Session length</span>
              <span className="text-[12px] text-t2 font-mono">{fmtDuration(event.sessionDurationMs)}</span>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 px-4 py-3" style={{ borderTop: "1px solid var(--c-border-subtle)" }}>
          <button
            onClick={close}
            className="px-3 py-1.5 rounded text-[12px] text-t3 hover:text-t2 transition-colors"
            style={{ background: "var(--c-surface-2)" }}
          >
            Close
          </button>
          {task && (
            <button
              onClick={resume}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[12px] text-white hover:bg-indigo-500 transition-colors"
              style={{ background: "rgba(99,102,241,0.9)" }}
            >
              <Play size={11} />
              <span>Start new session</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
