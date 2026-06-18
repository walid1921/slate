interface Props {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  confirmClassName?: string;
}

export default function ConfirmDialog({ title, message, onConfirm, onCancel, confirmLabel = "Delete", confirmClassName = "text-red-400 bg-red-500/20 hover:bg-red-500/30" }: Props) {
  return (
    <div
      className="absolute inset-0 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.35)", zIndex: 20, borderRadius: 12 }}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Enter") onConfirm();
        if (e.key === "Escape") onCancel();
      }}
    >
      <div
        className="dropdown w-72 rounded-lg shadow-2xl p-5 flex flex-col gap-4"
        style={{ border: "1px solid var(--c-border)" }}
      >
        <div>
          <p className="text-t1 text-[14px] font-semibold">{title}</p>
          <p className="text-t3 text-[12px] mt-1 leading-relaxed">{message}</p>
        </div>
        <div className="flex gap-2 justify-end">
          <button
            onMouseDown={(e) => { e.preventDefault(); onCancel(); }}
            className="px-3 py-1.5 rounded-lg text-[12px] text-t3 hover:text-t2 transition-colors"
            style={{ background: "var(--c-surface-2)" }}
          >
            Cancel
          </button>
          <button
            autoFocus
            onMouseDown={(e) => { e.preventDefault(); onConfirm(); }}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onConfirm(); } if (e.key === "Escape") { e.preventDefault(); onCancel(); } }}
            className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors outline-none ${confirmClassName}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
