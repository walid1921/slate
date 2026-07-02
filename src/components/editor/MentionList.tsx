import { forwardRef, useEffect, useImperativeHandle, useState } from "react";

export interface MentionItem { id: string; label: string }
export interface MentionListRef { onKeyDown: (event: KeyboardEvent) => boolean }
interface Props { items: MentionItem[]; command: (item: MentionItem) => void }

const MentionList = forwardRef<MentionListRef, Props>(({ items, command }, ref) => {
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

  if (!items.length) return (
    <div className="dropdown rounded-lg py-2 px-3 shadow-xl" style={{ border: "1px solid var(--c-border)", minWidth: 160 }}>
      <span className="text-[11px]" style={{ color: "var(--c-text-4)" }}>No tasks found</span>
    </div>
  );

  return (
    <div className="dropdown rounded-lg shadow-xl py-1 overflow-y-auto" style={{ border: "1px solid var(--c-border)", minWidth: 200, maxHeight: 200 }}>
      {items.map((item, i) => (
        <button key={item.id} onClick={() => command(item)}
          className="w-full text-left px-3 py-1.5 text-[12px] transition-colors truncate block"
          style={{ color: "var(--c-text-2)", background: i === selected ? "var(--c-surface-2)" : "transparent", maxWidth: 280 }}>
          {item.label}
        </button>
      ))}
    </div>
  );
});

MentionList.displayName = "MentionList";
export default MentionList;
