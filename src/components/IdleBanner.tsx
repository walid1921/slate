import { Coffee, X } from "lucide-react";
import { fmtDuration, IdleReview, useTimerStore } from "../timerStore";
import { useTodoStore } from "../store";

export default function IdleBanner({ review }: { review: IdleReview }) {
  const { applyIdleAction, dismissReview } = useTimerStore();
  const { todos } = useTodoStore();
  const task = todos.find(t => t.id === review.taskId);
  const startedAt = new Date(review.idleStartMs).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  const endedAt = new Date(review.idleEndMs).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(14px) saturate(1.2)", WebkitBackdropFilter: "blur(14px) saturate(1.2)" }}
      onMouseDown={e => { if (e.target === e.currentTarget) dismissReview(review.id); }}
    >
      <div
        className="dropdown rounded-2xl shadow-2xl flex flex-col"
        style={{ width: 460, border: "1px solid var(--c-border)" }}
      >
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid var(--c-border-subtle)" }}>
          <div className="flex items-center gap-2">
            <Coffee size={14} style={{ color: "rgba(251,191,36,0.95)" }} />
            <span className="text-[13px] font-semibold text-t1">You went idle</span>
          </div>
          <button onClick={() => dismissReview(review.id)} className="text-t4 hover:text-t2 transition-colors" title="Dismiss"><X size={13} /></button>
        </div>

        <div className="flex flex-col gap-3 px-5 py-5">
          <p className="text-[12px] text-t3 leading-relaxed">
            No input from <span className="text-t2 font-medium">{startedAt}</span> to <span className="text-t2 font-medium">{endedAt}</span> — that's <span className="text-t2 font-medium">{fmtDuration(review.durationMs)}</span> of idle time on the active timer. Keep, subtract, or stop the session at the moment you went idle?
          </p>

          <div className="flex flex-col gap-1.5 px-3 py-2.5 rounded-lg" style={{ background: "var(--c-surface-1)", border: "1px solid var(--c-border-subtle)" }}>
            <div className="flex items-center justify-between gap-3">
              <span className="text-[10px] text-t4 uppercase tracking-wider">Task</span>
              <span className="text-[12px] text-t1 truncate">{task?.text ?? "(deleted task)"}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-[10px] text-t4 uppercase tracking-wider">Idle for</span>
              <span className="text-[12px] text-t2 font-mono">{fmtDuration(review.durationMs)}</span>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 px-4 py-3" style={{ borderTop: "1px solid var(--c-border-subtle)" }}>
          <button
            onClick={() => applyIdleAction(review.id, "keep")}
            className="px-3 py-1.5 rounded text-[12px] text-t3 hover:text-t2 transition-colors"
            style={{ background: "var(--c-surface-2)" }}
          >
            Keep
          </button>
          <button
            onClick={() => applyIdleAction(review.id, "subtract")}
            className="px-3 py-1.5 rounded text-[12px] text-t1 transition-colors"
            style={{ background: "rgba(251,191,36,0.2)", border: "1px solid rgba(251,191,36,0.4)" }}
          >
            Subtract
          </button>
          <button
            onClick={() => applyIdleAction(review.id, "stop")}
            className="px-3 py-1.5 rounded text-[12px] text-t1 transition-colors"
            style={{ background: "rgba(248,113,113,0.15)", border: "1px solid rgba(248,113,113,0.4)" }}
          >
            Stop at idle
          </button>
        </div>
      </div>
    </div>
  );
}
