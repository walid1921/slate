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
      style={{ background: "rgba(0,0,0,0.35)", zIndex: 20, borderRadius: 12 }}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Enter") onConfirm();
        if (e.key === "Escape") onCancel();
      }}
    >
      <div
        className="w-72 rounded-xl shadow-2xl p-5 flex flex-col gap-4"
        style={{ background: "var(--c-dropdown)", border: "1px solid var(--c-border)" }}
      >
        <div>
          <p className="text-t1 text-sm font-medium">{title}</p>
          <p className="text-t4 text-xs mt-0.5">{message}</p>
        </div>
        <div className="flex gap-2 justify-end">
          <button
            onMouseDown={(e) => { e.preventDefault(); onCancel(); }}
            className="px-3 py-1 rounded-md text-xs text-t3 hover:text-t2 hover:bg-s2 transition-colors"
          >
            Cancel
          </button>
          <button
            autoFocus
            onMouseDown={(e) => { e.preventDefault(); onConfirm(); }}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onConfirm(); } if (e.key === "Escape") { e.preventDefault(); onCancel(); } }}
            className="px-3 py-1 rounded-md text-xs font-medium text-red-400 bg-red-500/20 hover:bg-red-500/30 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
