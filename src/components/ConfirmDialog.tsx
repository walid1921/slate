interface Props {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({ title, message, onConfirm, onCancel }: Props) {
  return (
    <div
      className="absolute inset-0 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.4)", zIndex: 20, borderRadius: 12 }}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Enter") onConfirm();
        if (e.key === "Escape") onCancel();
      }}
    >
      <div
        className="w-72 rounded-xl border border-white/10 shadow-2xl p-5 flex flex-col gap-4"
        style={{ background: "rgba(28,28,32,0.97)" }}
      >
        <div>
          <p className="text-white/80 text-sm font-medium">{title}</p>
          <p className="text-white/35 text-xs mt-0.5">{message}</p>
        </div>
        <div className="flex gap-2">
          <button
            onMouseDown={(e) => { e.preventDefault(); onCancel(); }}
            className="flex-1 py-2 rounded-lg text-sm text-white/40 hover:text-white/60 hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>
          <button
            onMouseDown={(e) => { e.preventDefault(); onConfirm(); }}
            className="flex-1 py-2 rounded-lg text-sm font-medium text-red-400 bg-red-500/20 hover:bg-red-500/30 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
