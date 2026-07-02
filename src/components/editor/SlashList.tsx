import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import type { LucideIcon } from "lucide-react";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Editor = any;

export interface SlashCommand {
  title: string;
  description: string;
  Icon: LucideIcon;
  action: (editor: Editor) => void;
}

export interface SlashListRef { onKeyDown: (event: KeyboardEvent) => boolean }
interface Props { items: SlashCommand[]; command: (item: SlashCommand) => void }

const SlashList = forwardRef<SlashListRef, Props>(({ items, command }, ref) => {
  const [selected, setSelected] = useState(0);
  useEffect(() => setSelected(0), [items]);

  useImperativeHandle(ref, () => ({
    onKeyDown(e) {
      if (e.key === "ArrowUp") { setSelected(s => (s + items.length - 1) % Math.max(1, items.length)); return true; }
      if (e.key === "ArrowDown") { setSelected(s => (s + 1) % Math.max(1, items.length)); return true; }
      if (e.key === "Enter") { items[selected] && command(items[selected]); return true; }
      return false;
    },
  }));

  if (!items.length) return null;

  return (
    <div className="dropdown rounded-xl shadow-2xl py-1 overflow-y-auto" style={{ border: "1px solid var(--c-border)", minWidth: 230, maxHeight: 300 }}>
      {items.map((item, i) => {
        const Icon = item.Icon;
        return (
          <button key={item.title} onClick={() => command(item)}
            className="w-full text-left flex items-center gap-2.5 px-3 py-1.5 transition-colors"
            style={{ background: i === selected ? "var(--c-surface-2)" : "transparent" }}>
            <div className="w-6 h-6 rounded flex items-center justify-center shrink-0" style={{ background: "var(--c-surface-3)" }}>
              <Icon size={12} style={{ color: "var(--c-text-3)" }} />
            </div>
            <div className="min-w-0">
              <div className="text-[12px]" style={{ color: "var(--c-text-1)" }}>{item.title}</div>
              <div className="text-[10px]" style={{ color: "var(--c-text-4)" }}>{item.description}</div>
            </div>
          </button>
        );
      })}
    </div>
  );
});

SlashList.displayName = "SlashList";
export default SlashList;
