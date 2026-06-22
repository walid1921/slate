import { useState, useEffect } from "react";
import {
  Code2, Palette, Server, Database, ShieldCheck, Terminal, FlaskConical,
  Zap, Layers, Plus, X, RotateCcw, Check, CheckCheck, Send,
} from "lucide-react";
import { useDevStore, DevItem, DevPriority } from "../devStore";
import { PRESET_COLORS, useTodoStore } from "../store";

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

const CAT_ICONS = ["code-2", "palette", "server", "database", "shield", "terminal", "flask", "zap", "layers"] as const;

type Filter = "all" | "pending" | "done";

export default function DevPage() {
  const { items, categories, load, toggleItem, deleteItem, updateItemText, addItem, resetCategory, addCategory, removeCategory } = useDevStore();
  const [activeCatId, setActiveCatId] = useState<number | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [addingCat, setAddingCat] = useState(false);
  const [showSend, setShowSend] = useState(false);

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (categories.length > 0 && activeCatId === null) {
      setActiveCatId(categories[0].id);
    }
  }, [categories.length]);

  const total = items.length;
  const done = items.filter(i => i.done).length;
  const pct = total > 0 ? (done / total) * 100 : 0;

  const activeCat = categories.find(c => c.id === activeCatId) ?? null;
  const catItems = activeCat ? items.filter(i => i.category_id === activeCat.id) : [];
  const filteredItems = catItems.filter(i =>
    filter === "pending" ? !i.done : filter === "done" ? i.done : true
  );
  const catDone = catItems.filter(i => i.done).length;
  const catPct = catItems.length > 0 ? (catDone / catItems.length) * 100 : 0;

  return (
    <div className="flex flex-col flex-1 min-h-0 view-animate">

      {/* Category tab bar */}
      <div className="flex items-center gap-0 px-2 pt-1.5 shrink-0" style={{ borderBottom: "1px solid var(--c-border-subtle)" }}>
      <div className="flex items-center gap-0.5 flex-1 overflow-x-auto category-tabs-scroll" style={{ scrollbarWidth: "none" }}>
        {categories.map(cat => {
          const isActive = activeCatId === cat.id;
          const cDone = items.filter(i => i.category_id === cat.id && i.done).length;
          const cTotal = items.filter(i => i.category_id === cat.id).length;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCatId(cat.id)}
              className="relative flex items-center gap-1.5 px-3 py-2 text-[12px] shrink-0 select-none transition-colors"
              style={{
                color: isActive ? `rgba(${cat.color},1)` : `rgba(${cat.color},0.45)`,
                borderBottom: isActive ? `2px solid rgba(${cat.color},0.8)` : "2px solid transparent",
                marginBottom: -1,
              }}
            >
              <CategoryIcon icon={cat.icon} size={11} />
              <span>{cat.name}</span>
              <span className="text-[10px] opacity-60">{cDone}/{cTotal}</span>
              {cDone === cTotal && cTotal > 0 && (
                <CheckCheck size={9} style={{ color: `rgba(${cat.color},0.7)` }} />
              )}
            </button>
          );
        })}

        {/* Add category button */}
        <button
          onClick={() => setAddingCat(true)}
          className="flex items-center gap-1 px-3 py-2 text-t5 hover:text-t3 transition-colors shrink-0"
        >
          <Plus size={11} />
        </button>
      </div>
      </div>

      {/* Filter tabs + global progress + actions */}
      <div className="flex items-center justify-between px-4 py-2 shrink-0" style={{ borderBottom: "1px solid var(--c-border-subtle)" }}>
        <div className="flex items-center gap-1">
          {(["all", "pending", "done"] as Filter[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2 py-0.5 rounded text-[10px] capitalize transition-colors ${filter === f ? "text-t1" : "text-t5 hover:text-t3"}`}
              style={filter === f ? { background: "var(--c-surface-3)", border: "1px solid var(--c-border)" } : {}}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[10px] text-t5 font-mono">{done}/{total}</span>
          <div className="w-20 h-[3px] rounded-full overflow-hidden" style={{ background: "var(--c-border)" }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${pct}%`, background: pct === 100 ? "rgba(16,185,129,0.8)" : "rgba(99,102,241,0.65)" }}
            />
          </div>
          {activeCat && (
            <button
              onClick={() => setShowSend(true)}
              className="text-t6 hover:text-sky-400 transition-colors"
              title="Send to Tasks"
            >
              <Send size={10} />
            </button>
          )}
          {catDone > 0 && activeCat && (
            <button
              onClick={() => resetCategory(activeCat.id)}
              className="text-t6 hover:text-t3 transition-colors"
              title="Reset category checks"
            >
              <RotateCcw size={10} />
            </button>
          )}
          {activeCat && !activeCat.is_preset && (
            <button
              onClick={() => { removeCategory(activeCat.id); setActiveCatId(categories[0]?.id ?? null); }}
              className="text-t6 hover:text-red-400 transition-colors"
              title="Delete category"
            >
              <X size={10} />
            </button>
          )}
        </div>
      </div>

      {/* Category progress bar */}
      {activeCat && catItems.length > 0 && (
        <div className="px-4 py-2 shrink-0" style={{ borderBottom: "1px solid var(--c-border-subtle)" }}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-medium" style={{ color: `rgba(${activeCat.color},0.85)` }}>{activeCat.name}</span>
            <span className="text-[10px] text-t4 font-mono">{catDone}/{catItems.length} · {Math.round(catPct)}%</span>
          </div>
          <div className="h-[4px] rounded-full overflow-hidden" style={{ background: "var(--c-surface-3)" }}>
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{ width: `${catPct}%`, background: catPct === 100 ? "rgba(16,185,129,0.75)" : `rgba(${activeCat.color},0.65)` }}
            />
          </div>
        </div>
      )}

      {/* Items list */}
      <div className="flex-1 min-h-0 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
        {filteredItems.map(item => (
          <DevItemRow
            key={item.id}
            item={item}
            rgb={activeCat?.color ?? "99,102,241"}
            onToggle={() => toggleItem(item.id)}
            onDelete={() => deleteItem(item.id)}
            onEdit={t => updateItemText(item.id, t)}
          />
        ))}
        {filteredItems.length === 0 && filter !== "all" && (
          <p className="px-5 py-4 text-[11px] text-t6">No {filter} items</p>
        )}
        {filteredItems.length === 0 && filter === "all" && activeCat && (
          <p className="px-5 py-4 text-[11px] text-t6">No items yet</p>
        )}
      </div>

      {/* Add item */}
      {activeCat && (
        <div className="shrink-0 px-4 py-2.5" style={{ borderTop: "1px solid var(--c-border-subtle)" }}>
          <AddItemRow rgb={activeCat.color} onAdd={t => addItem(t, activeCat.id)} />
        </div>
      )}

      {/* Add category modal */}
      {addingCat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)" }} onMouseDown={e => { if (e.target === e.currentTarget) setAddingCat(false); }}>
          <AddCategoryModal
            onAdd={(name, color, icon) => { addCategory(name, color, icon); setAddingCat(false); }}
            onClose={() => setAddingCat(false)}
          />
        </div>
      )}

      {/* Send to tasks modal */}
      {showSend && activeCat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)" }} onMouseDown={e => { if (e.target === e.currentTarget) setShowSend(false); }}>
          <SendToTasksModal
            items={catItems.filter(i => !i.done)}
            devCategoryName={activeCat.name}
            onClose={() => setShowSend(false)}
          />
        </div>
      )}
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
      className="flex items-center gap-2.5 px-5 py-2 hover:bg-s1 transition-colors"
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

  const commit = () => { if (val.trim()) { onAdd(val.trim()); setVal(""); } };

  return (
    <div className="flex items-center gap-2">
      <Plus size={10} style={{ color: active ? `rgba(${rgb},0.6)` : "var(--c-text-6)", flexShrink: 0 }} />
      <input
        value={val}
        onChange={e => setVal(e.target.value)}
        onFocus={() => setActive(true)}
        onBlur={() => { commit(); setActive(false); }}
        onKeyDown={e => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") { setVal(""); setActive(false); (e.target as HTMLInputElement).blur(); }
        }}
        placeholder="Add item…"
        className="flex-1 bg-transparent text-[12px] text-t2 outline-none"
        style={{ caretColor: `rgba(${rgb},0.8)` }}
      />
    </div>
  );
}

function SendToTasksModal({ items, devCategoryName, onClose }: {
  items: DevItem[];
  devCategoryName: string;
  onClose: () => void;
}) {
  const { categories: taskCats, add, addCategory } = useTodoStore();
  const [selected, setSelected] = useState(new Set(items.map(i => i.id)));
  const [taskCatId, setTaskCatId] = useState(taskCats[0]?.id ?? 1);
  const [creatingCat, setCreatingCat] = useState(false);
  const [newCatName, setNewCatName] = useState(devCategoryName);
  const [loading, setLoading] = useState(false);

  const toggle = (id: number) => setSelected(s => {
    const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n;
  });

  const handleSend = async () => {
    setLoading(true);
    let catId = taskCatId;
    if (creatingCat && newCatName.trim()) {
      await addCategory(newCatName.trim());
      const created = useTodoStore.getState().categories.find(c => c.name === newCatName.trim());
      if (created) catId = created.id;
    }
    for (const item of items.filter(i => selected.has(i.id))) {
      await add(item.text, item.priority as any, null, null, catId);
    }
    setLoading(false);
    onClose();
  };

  const count = selected.size;

  return (
    <div className="dropdown rounded-xl shadow-2xl flex flex-col gap-3 p-4" style={{ width: 300, border: "1px solid var(--c-border)" }}>
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-t3 uppercase tracking-wider font-semibold">Send to Tasks</span>
        <button onClick={onClose} className="text-t5 hover:text-t3"><X size={12} /></button>
      </div>

      {/* Items */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-[10px] text-t5 uppercase tracking-wider">Pending items</span>
          <div className="flex gap-2">
            <button onClick={() => setSelected(new Set(items.map(i => i.id)))} className="text-[9px] text-t5 hover:text-t3 transition-colors">all</button>
            <button onClick={() => setSelected(new Set())} className="text-[9px] text-t5 hover:text-t3 transition-colors">none</button>
          </div>
        </div>
        {items.length === 0 ? (
          <p className="text-[11px] text-t5 py-2">All items are already done.</p>
        ) : (
          <div className="flex flex-col overflow-y-auto" style={{ maxHeight: 160, scrollbarWidth: "none" }}>
            {items.map(item => (
              <label key={item.id} className="flex items-center gap-2 px-1 py-1 rounded hover:bg-s1 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={selected.has(item.id)}
                  onChange={() => toggle(item.id)}
                  className="accent-sky-400"
                />
                <span className="text-[11px] text-t2 truncate">{item.text}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Category picker */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] text-t5 uppercase tracking-wider">Destination category</span>
        {!creatingCat ? (
          <div className="flex items-center gap-1.5 flex-wrap">
            {taskCats.map(cat => (
              <button
                key={cat.id}
                onClick={() => setTaskCatId(cat.id)}
                className="px-2 py-0.5 rounded text-[10px] transition-colors"
                style={taskCatId === cat.id
                  ? { background: `rgba(${cat.color},0.15)`, color: `rgba(${cat.color},0.9)`, border: `1px solid rgba(${cat.color},0.3)` }
                  : { background: "var(--c-surface-2)", color: "var(--c-text-4)", border: "1px solid var(--c-border)" }
                }
              >
                {cat.name}
              </button>
            ))}
            <button
              onClick={() => setCreatingCat(true)}
              className="px-2 py-0.5 rounded text-[10px] text-t5 hover:text-t3 transition-colors"
              style={{ border: "1px dashed var(--c-border)" }}
            >
              + New
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <input
              autoFocus
              value={newCatName}
              onChange={e => setNewCatName(e.target.value)}
              onKeyDown={e => { if (e.key === "Escape") setCreatingCat(false); }}
              placeholder="Category name…"
              className="flex-1 bg-transparent text-[12px] text-t2 outline-none border-b pb-0.5"
              style={{ borderColor: "var(--c-border)" }}
            />
            <button onClick={() => setCreatingCat(false)} className="text-t5 hover:text-t3 text-[10px] transition-colors">↩</button>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <button onClick={onClose} className="text-[11px] text-t5 hover:text-t3 px-2 py-1 transition-colors">Cancel</button>
        <button
          onClick={handleSend}
          disabled={count === 0 || loading || (creatingCat && !newCatName.trim())}
          className="flex items-center gap-1.5 text-[11px] px-3 py-1 rounded transition-colors disabled:opacity-40"
          style={{ background: "rgba(14,165,233,0.12)", border: "1px solid rgba(14,165,233,0.3)", color: "rgba(14,165,233,0.9)" }}
        >
          <Send size={9} />
          <span>Send {count > 0 ? count : ""} item{count !== 1 ? "s" : ""}</span>
        </button>
      </div>
    </div>
  );
}

function AddCategoryModal({ onAdd, onClose }: {
  onAdd: (name: string, color: string, icon: string) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(PRESET_COLORS[5]);
  const [icon, setIcon] = useState("code-2");

  const submit = () => { if (name.trim()) onAdd(name.trim(), color, icon); };

  return (
    <div className="dropdown rounded-xl shadow-2xl flex flex-col gap-3 p-4" style={{ width: 280, border: "1px solid var(--c-border)" }}>
      <span className="text-[11px] text-t3 uppercase tracking-wider font-semibold">New Category</span>
      <input
        autoFocus
        value={name}
        onChange={e => setName(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter") submit(); if (e.key === "Escape") onClose(); }}
        placeholder="Category name…"
        className="bg-transparent text-[13px] text-t2 outline-none border-b pb-1"
        style={{ borderColor: "var(--c-border)" }}
      />

      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] text-t5 uppercase tracking-wider">Icon</span>
        <div className="flex items-center gap-1 flex-wrap">
          {CAT_ICONS.map(ic => (
            <button
              key={ic}
              onClick={() => setIcon(ic)}
              className={`p-1.5 rounded transition-colors ${icon === ic ? "bg-s3 text-t1" : "text-t5 hover:text-t3"}`}
            >
              <CategoryIcon icon={ic} size={12} />
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] text-t5 uppercase tracking-wider">Color</span>
        <div className="flex gap-1.5 flex-wrap">
          {PRESET_COLORS.slice(0, 14).map(c => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className="w-4 h-4 rounded-full transition-all"
              style={{ background: `rgb(${c})`, outline: color === c ? `2px solid rgba(${c},0.7)` : "none", outlineOffset: 1 }}
            />
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <button onClick={onClose} className="text-[11px] text-t5 hover:text-t3 px-2 py-1 transition-colors">Cancel</button>
        <button
          onClick={submit}
          disabled={!name.trim()}
          className="text-[11px] px-3 py-1 rounded transition-colors disabled:opacity-40"
          style={{ background: "var(--c-surface-3)", border: "1px solid var(--c-border)", color: "var(--c-text-2)" }}
        >
          Add
        </button>
      </div>
    </div>
  );
}
