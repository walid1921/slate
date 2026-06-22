import { useState, useEffect } from "react";
import {
  Code2, Palette, Server, Database, ShieldCheck, Terminal, FlaskConical,
  Zap, Layers, Plus, ChevronDown, ChevronRight, X, RotateCcw, Check, CheckCheck,
} from "lucide-react";
import { useDevStore, DevItem, DevPriority } from "../devStore";
import { PRESET_COLORS } from "../store";

const PRIORITY_COLOR: Record<DevPriority, string> = {
  none: "transparent",
  low: "rgb(96,165,250)",
  medium: "rgb(251,191,36)",
  high: "rgb(248,113,113)",
};

function CategoryIcon({ icon, size = 11 }: { icon: string; size?: number }) {
  const p = { size };
  switch (icon) {
    case "palette":  return <Palette {...p} />;
    case "code-2":   return <Code2 {...p} />;
    case "server":   return <Server {...p} />;
    case "database": return <Database {...p} />;
    case "shield":   return <ShieldCheck {...p} />;
    case "terminal": return <Terminal {...p} />;
    case "flask":    return <FlaskConical {...p} />;
    case "zap":      return <Zap {...p} />;
    default:         return <Layers {...p} />;
  }
}

const CAT_ICONS = [
  "code-2", "palette", "server", "database", "shield", "terminal", "flask", "zap", "layers",
] as const;

type Filter = "all" | "pending" | "done";

export default function DevPage() {
  const { items, categories, load, toggleItem, deleteItem, updateItemText, addItem, resetCategory, addCategory, removeCategory } = useDevStore();
  const [openCats, setOpenCats] = useState<Set<number>>(new Set());
  const [filter, setFilter] = useState<Filter>("all");
  const [addingCat, setAddingCat] = useState(false);

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (categories.length > 0 && openCats.size === 0) {
      setOpenCats(new Set(categories.map(c => c.id)));
    }
  }, [categories.length]);

  const total = items.length;
  const done = items.filter(i => i.done).length;
  const pct = total > 0 ? (done / total) * 100 : 0;

  const toggleCat = (id: number) =>
    setOpenCats(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-y-auto view-animate" style={{ scrollbarWidth: "none" }}>
      {/* Global progress */}
      <div className="px-5 pt-4 pb-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] text-t3 font-mono">{done}/{total} completed</span>
          {done === total && total > 0 && <span className="text-[10px] text-emerald-400 font-medium">All done!</span>}
        </div>
        <div className="h-[3px] rounded-full overflow-hidden" style={{ background: "var(--c-border)" }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, background: pct === 100 ? "rgba(16,185,129,0.8)" : "rgba(99,102,241,0.65)" }}
          />
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 px-5 pb-3">
        {(["all", "pending", "done"] as Filter[]).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-2.5 py-1 rounded text-[10px] capitalize transition-colors ${filter === f ? "text-t1" : "text-t5 hover:text-t3"}`}
            style={filter === f ? { background: "var(--c-surface-3)", border: "1px solid var(--c-border)" } : {}}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Category sections */}
      <div className="flex flex-col gap-2 px-4 pb-5">
        {categories.map(cat => {
          const catItems = items.filter(i => i.category_id === cat.id);
          const filtered = catItems.filter(i =>
            filter === "pending" ? !i.done : filter === "done" ? i.done : true
          );
          const catDone = catItems.filter(i => i.done).length;
          const catPct = catItems.length > 0 ? (catDone / catItems.length) * 100 : 0;
          const isOpen = openCats.has(cat.id);
          const rgb = cat.color;

          return (
            <div key={cat.id} className="rounded-xl overflow-hidden" style={{ border: `1px solid rgba(${rgb},0.22)`, background: `rgba(${rgb},0.03)` }}>
              {/* Header */}
              <div className="flex items-center">
                <button
                  onClick={() => toggleCat(cat.id)}
                  className="flex items-center gap-2 px-3.5 py-3 flex-1 text-left hover:bg-white/3 transition-colors"
                >
                  <span style={{ color: `rgba(${rgb},0.9)` }}><CategoryIcon icon={cat.icon} size={12} /></span>
                  <span className="text-[11px] font-semibold uppercase tracking-wider flex-1" style={{ color: `rgba(${rgb},0.9)` }}>{cat.name}</span>
                  <span className="text-[10px] text-t5 font-mono mr-1">{catDone}/{catItems.length}</span>
                  {catPct === 100 && catItems.length > 0
                    ? <CheckCheck size={11} style={{ color: `rgba(${rgb},0.85)` }} />
                    : isOpen ? <ChevronDown size={11} className="text-t5" /> : <ChevronRight size={11} className="text-t5" />
                  }
                </button>
                {!cat.is_preset && (
                  <button
                    onClick={() => removeCategory(cat.id)}
                    className="px-2 text-t6 hover:text-red-400 transition-colors"
                  >
                    <X size={10} />
                  </button>
                )}
              </div>

              {/* Progress bar */}
              {catItems.length > 0 && (
                <div className="h-[2px]" style={{ background: "var(--c-border)" }}>
                  <div className="h-full transition-all duration-300" style={{ width: `${catPct}%`, background: `rgba(${rgb},0.55)` }} />
                </div>
              )}

              {isOpen && (
                <>
                  {/* Items */}
                  {filtered.map(item => (
                    <DevItemRow
                      key={item.id}
                      item={item}
                      rgb={rgb}
                      onToggle={() => toggleItem(item.id)}
                      onDelete={() => deleteItem(item.id)}
                      onEdit={t => updateItemText(item.id, t)}
                    />
                  ))}
                  {filtered.length === 0 && filter !== "all" && (
                    <p className="px-4 py-2.5 text-[11px] text-t6">No {filter} items</p>
                  )}

                  {/* Footer: add item + reset */}
                  <div
                    className="flex items-center justify-between px-3.5 py-2"
                    style={{ borderTop: "1px solid var(--c-border-subtle)" }}
                  >
                    <AddItemRow rgb={rgb} onAdd={t => addItem(t, cat.id)} />
                    {catDone > 0 && (
                      <button
                        onClick={() => resetCategory(cat.id)}
                        className="ml-2 shrink-0 text-t6 hover:text-t3 transition-colors"
                        title="Reset checks"
                      >
                        <RotateCcw size={10} />
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}

        {/* Add category */}
        {addingCat ? (
          <AddCategoryRow
            onAdd={(name, color, icon) => { addCategory(name, color, icon); setAddingCat(false); }}
            onCancel={() => setAddingCat(false)}
          />
        ) : (
          <button
            onClick={() => setAddingCat(true)}
            className="flex items-center gap-2 px-4 py-3 rounded-xl text-t5 hover:text-t3 transition-colors"
            style={{ border: "1px dashed var(--c-border)" }}
          >
            <Plus size={11} />
            <span className="text-[11px]">Add category</span>
          </button>
        )}
      </div>
    </div>
  );
}

function DevItemRow({ item, rgb, onToggle, onDelete, onEdit }: {
  item: DevItem; rgb: string;
  onToggle: () => void; onDelete: () => void; onEdit: (t: string) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(item.text);

  const commit = () => { onEdit(val); setEditing(false); };

  return (
    <div
      className="flex items-center gap-2.5 px-3.5 py-1.5 hover:bg-white/3 transition-colors"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        onClick={onToggle}
        className="shrink-0 w-[15px] h-[15px] rounded flex items-center justify-center transition-all"
        style={{
          border: item.done ? "none" : `1px solid rgba(${rgb},0.4)`,
          background: item.done ? `rgba(${rgb},0.55)` : "transparent",
        }}
      >
        {item.done && <Check size={9} strokeWidth={3} className="text-white" />}
      </button>

      {item.priority !== "none" && (
        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: PRIORITY_COLOR[item.priority] }} />
      )}

      {editing ? (
        <input
          autoFocus
          value={val}
          onChange={e => setVal(e.target.value)}
          onBlur={commit}
          onKeyDown={e => { if (e.key === "Enter" || e.key === "Escape") commit(); }}
          className="flex-1 bg-transparent text-[12px] text-t2 outline-none"
        />
      ) : (
        <span
          className={`flex-1 text-[12px] select-none ${item.done ? "line-through text-t5" : "text-t2"}`}
          onDoubleClick={() => { setVal(item.text); setEditing(true); }}
        >
          {item.text}
        </span>
      )}

      <button
        onClick={onDelete}
        style={{ opacity: hovered ? 1 : 0, transition: "opacity 0.15s" }}
        className="shrink-0 text-t6 hover:text-red-400 transition-colors"
      >
        <X size={10} />
      </button>
    </div>
  );
}

function AddItemRow({ rgb, onAdd }: { rgb: string; onAdd: (t: string) => void }) {
  const [val, setVal] = useState("");
  const [active, setActive] = useState(false);

  const commit = () => {
    if (val.trim()) { onAdd(val.trim()); setVal(""); }
  };

  return (
    <div className="flex items-center gap-2 flex-1 min-w-0">
      <Plus size={10} style={{ color: active ? `rgba(${rgb},0.6)` : "var(--c-text-6)", flexShrink: 0 }} />
      <input
        value={val}
        onChange={e => setVal(e.target.value)}
        onFocus={() => setActive(true)}
        onBlur={() => { commit(); setActive(false); }}
        onKeyDown={e => {
          if (e.key === "Enter") { commit(); }
          if (e.key === "Escape") { setVal(""); setActive(false); (e.target as HTMLInputElement).blur(); }
        }}
        placeholder="Add item…"
        className="flex-1 bg-transparent text-[11px] text-t2 outline-none min-w-0"
        style={{ caretColor: `rgba(${rgb},0.8)` }}
      />
    </div>
  );
}

function AddCategoryRow({ onAdd, onCancel }: {
  onAdd: (name: string, color: string, icon: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(PRESET_COLORS[5]);
  const [icon, setIcon] = useState("code-2");

  const submit = () => { if (name.trim()) onAdd(name.trim(), color, icon); };

  return (
    <div className="rounded-xl p-3 flex flex-col gap-2.5" style={{ border: "1px solid var(--c-border)", background: "var(--c-surface-1)" }}>
      <input
        autoFocus
        value={name}
        onChange={e => setName(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter") submit(); if (e.key === "Escape") onCancel(); }}
        placeholder="Category name…"
        className="bg-transparent text-[12px] text-t2 outline-none w-full"
      />

      {/* Icon picker */}
      <div className="flex items-center gap-1">
        {CAT_ICONS.map(ic => (
          <button
            key={ic}
            onClick={() => setIcon(ic)}
            className={`p-1.5 rounded transition-colors ${icon === ic ? "bg-s3 text-t1" : "text-t5 hover:text-t3"}`}
          >
            <CategoryIcon icon={ic} size={11} />
          </button>
        ))}
      </div>

      {/* Color picker */}
      <div className="flex gap-1 flex-wrap">
        {PRESET_COLORS.slice(0, 14).map(c => (
          <button
            key={c}
            onClick={() => setColor(c)}
            className="w-3.5 h-3.5 rounded-full transition-all"
            style={{ background: `rgb(${c})`, outline: color === c ? `2px solid rgba(${c},0.7)` : "none", outlineOffset: 1 }}
          />
        ))}
      </div>

      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="text-[11px] text-t5 hover:text-t3 px-2 py-1 transition-colors">Cancel</button>
        <button
          onClick={submit}
          disabled={!name.trim()}
          className="text-[11px] px-2.5 py-1 rounded transition-colors disabled:opacity-40"
          style={{ background: "var(--c-surface-3)", border: "1px solid var(--c-border)", color: "var(--c-text-2)" }}
        >
          Add
        </button>
      </div>
    </div>
  );
}
