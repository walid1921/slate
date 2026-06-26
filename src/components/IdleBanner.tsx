import { Coffee, X } from "lucide-react";
import { fmtDuration, IdleReview, useTimerStore } from "../timerStore";

export default function IdleBanner({ review }: { review: IdleReview }) {
  const { applyIdleAction, dismissReview } = useTimerStore();
  const startedAt = new Date(review.idleStartMs).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

  return (
    <div
      className="flex items-center gap-3 px-3 py-2 mb-2 rounded-lg shrink-0"
      style={{
        background: "rgba(251,191,36,0.08)",
        border: "1px solid rgba(251,191,36,0.35)",
      }}
    >
      <Coffee size={14} className="shrink-0" style={{ color: "rgba(251,191,36,0.95)" }} />
      <div className="flex-1 min-w-0 text-[11px] leading-snug">
        <span className="text-t1 font-medium">{fmtDuration(review.durationMs)} idle</span>
        <span className="text-t4"> · since {startedAt}. Keep, subtract, or stop the session at that point?</span>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={() => applyIdleAction(review.id, "keep")}
          className="px-2.5 py-1 rounded text-[11px] text-t3 hover:text-t1 transition-colors"
          style={{ background: "var(--c-surface-2)" }}
        >
          Keep
        </button>
        <button
          onClick={() => applyIdleAction(review.id, "subtract")}
          className="px-2.5 py-1 rounded text-[11px] text-t1 transition-colors"
          style={{ background: "rgba(251,191,36,0.2)", border: "1px solid rgba(251,191,36,0.4)" }}
        >
          Subtract
        </button>
        <button
          onClick={() => applyIdleAction(review.id, "stop")}
          className="px-2.5 py-1 rounded text-[11px] text-t1 transition-colors"
          style={{ background: "rgba(248,113,113,0.15)", border: "1px solid rgba(248,113,113,0.4)" }}
        >
          Stop at idle
        </button>
        <button
          onClick={() => dismissReview(review.id)}
          className="p-1 rounded text-t5 hover:text-t2 transition-colors"
          title="Dismiss"
        >
          <X size={11} />
        </button>
      </div>
    </div>
  );
}
