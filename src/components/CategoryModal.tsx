import { useState, useRef, useEffect } from "react";
import { X, Trash2 } from "lucide-react";
import { PRESET_COLORS } from "../store";
import { IconPicker } from "./IconPicker";

function ColorPalette({ current, onChange }: { current: string; onChange: (c: string) => void }) {
  return (
    <div className="grid grid-cols-7 gap-1.5">
      {PRESET_COLORS.slice(0, 14).map(c => (
        <button
          key={c}
          onClick={() => onChange(c)}
          className="w-4 h-4 rounded-full transition-transform hover:scale-110 shrink-0"
          style={{
            background: `rgb(${c})`,
            outline: c === current ? `2px solid rgb(${c})` : "none",
            outlineOffset: 2,
            border: c === "255,255,255" ? "1px solid rgba(255,255,255,0.2)" : "none",
          }}
        />
      ))}
    </div>
  );
}

interface CategoryModalProps {
  title: string;
  submitLabel?: string;
  initialName?: string;
  initialColor?: string;
  initialIcon?: string;
  onSubmit: (name: string, color: string, icon: string) => void | Promise<void>;
  onDelete?: () => void;
  onClose: () => void;
}

export default function CategoryModal({
  title,
  submitLabel = "Save",
  initialName = "",
  initialColor = PRESET_COLORS[5],
  initialIcon = "folder",
  onSubmit,
  onDelete,
  onClose,
}: CategoryModalProps) {
  const [name, setName] = useState(initialName);
  const [color, setColor] = useState(initialColor);
  const [icon, setIcon] = useState(initialIcon);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 10); }, []);

  const save = async () => {
    if (!name.trim()) return;
    await onSubmit(name.trim(), color, icon);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.45)" }}
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="dropdown rounded-xl shadow-2xl flex flex-col gap-4 p-5"
        style={{ width: 260, border: "1px solid var(--c-border)" }}
        onMouseDown={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full shrink-0" style={{ background: `rgb(${color})` }} />
          <span className="text-[13px] font-semibold text-t1">{title}</span>
          <button onClick={onClose} className="ml-auto text-t5 hover:text-t2 transition-colors">
            <X size={12} />
          </button>
        </div>

        {/* Name */}
        <input
          ref={inputRef}
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => { e.stopPropagation(); if (e.key === "Enter") save(); if (e.key === "Escape") onClose(); }}
          className="w-full px-3 py-2 rounded-lg text-[13px] text-t1 outline-none"
          style={{ background: "var(--c-surface-2)", border: "1px solid var(--c-border)" }}
          placeholder="Category name…"
        />

        {/* Icon + Color */}
        <div className="flex items-start gap-3">
          <div>
            <span className="text-[10px] text-t5 uppercase tracking-wider mb-2 block">Icon</span>
            <IconPicker value={icon} onChange={setIcon} />
          </div>
          <div className="flex-1">
            <span className="text-[10px] text-t5 uppercase tracking-wider mb-2 block">Color</span>
            <ColorPalette current={color} onChange={setColor} />
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 pt-1" style={{ borderTop: "1px solid var(--c-border-subtle)" }}>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 py-1.5 rounded-lg text-[12px] text-t3 hover:text-t2 transition-colors"
              style={{ background: "var(--c-surface-2)" }}
            >
              Cancel
            </button>
            <button
              onClick={save}
              disabled={!name.trim()}
              className="flex-1 py-1.5 rounded-lg text-[12px] font-medium text-blue-400 hover:text-blue-300 transition-colors disabled:opacity-40"
              style={{ background: "rgba(59,130,246,0.15)" }}
            >
              {submitLabel}
            </button>
          </div>
          {onDelete && (
            <button
              onClick={() => { onDelete(); onClose(); }}
              className="w-full py-1.5 rounded-lg text-[12px] font-medium text-red-400 hover:text-red-300 transition-colors flex items-center justify-center gap-1.5"
              style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}
            >
              <Trash2 size={12} /> Delete category
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
