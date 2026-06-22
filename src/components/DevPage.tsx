import { useState, useEffect, useRef } from "react";
import {
  Code2, Palette, Server, Database, ShieldCheck, Terminal, FlaskConical,
  Zap, Layers, Plus, X, Send,
} from "lucide-react";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useDevStore, DevItem, DevCategory, DevPriority } from "../devStore";
import { PRESET_COLORS, useTodoStore } from "../store";

const PRIORITY_COLOR: Record<DevPriority, string> = {
  none: "transparent",
  low: "rgb(96,165,250)",
  medium: "rgb(251,191,36)",
  high: "rgb(248,113,113)",
};
const PRIORITY_BG: Record<DevPriority, string> = {
  none: "transparent",
  low: "rgba(96,165,250,0.12)",
  medium: "rgba(251,191,36,0.12)",
  high: "rgba(248,113,113,0.12)",
};

const ITEM_DESCRIPTIONS: Record<number, string> = {
  // Design
  1: "Test on real devices and breakpoints (320px, 768px, 1440px). Use responsive prefixes or CSS grid/flex so layout never breaks at any screen size.",
  2: "Every fetch, form submit, and navigation change needs a visual state. Skeleton screens or spinners prevent layout shift and reduce perceived wait time.",
  3: "An empty screen feels broken — a designed empty state feels intentional. Show an illustration or message with a clear call to action.",
  4: "Show inline validation near the field, not just on submit. Use a red border and helper text for errors, and never swallow errors silently.",
  5: "Normal text needs a 4.5:1 contrast ratio, large text 3:1 (WCAG AA). Failing this excludes ~8% of users. Check with WebAIM Contrast Checker.",
  6: "All interactive elements must be focusable and show a visible focus ring. Tab order should follow visual layout. Test with keyboard only.",
  7: "Define a spacing scale (4/8/12/16/24px) and stick to it. Pick two fonts max. Visual inconsistency signals an unfinished product.",
  // Frontend
  8: "console.log is fine during development but must be removed before shipping. Add a no-console ESLint rule to catch them automatically in CI.",
  9: "Validate before hitting the network — required fields, email format, password length. Never rely on the backend as the only line of defense.",
  10: "Show a user-friendly message on 4xx/5xx. Log errors to a monitoring service. Never let the UI freeze silently while the user waits.",
  11: "Heavy pages load faster with lazy loading. Use React.lazy() + Suspense for route-level splits and measure the impact with Lighthouse.",
  12: "API keys and tokens must never appear in source code. Use .env files added to .gitignore, or a secrets manager from day one.",
  13: "Large bundles slow initial load. Use webpack-bundle-analyzer or Vite's rollup-plugin-visualizer to find and eliminate heavy dependencies.",
  14: "Run ESLint and Prettier in CI. A zero-error policy keeps the codebase consistent and catches bugs before they reach review.",
  // Backend
  15: "Validate type, format, length, and range on every endpoint — use a schema library like Zod or Joi. Never trust data from the client.",
  16: "200 = OK, 201 = Created, 400 = Bad Request, 401 = Unauthorized, 403 = Forbidden, 404 = Not Found, 500 = Server Error. Use them correctly.",
  17: "Without pagination a single list endpoint can return millions of rows and crash the server. Default to 20–50 items per page with cursor or offset.",
  18: "Rate limiting prevents abuse, brute-force attacks, and runaway clients. Set per-IP or per-user limits on all public-facing endpoints.",
  19: "Stack traces and internal paths are useful for attackers. Return generic error messages to clients, and log the full details server-side only.",
  20: "Log request method, path, status code, latency, and user ID. Good structured logs make debugging and auditing possible at scale.",
  21: "Restrict CORS to known, explicit origins. Wildcard * is fine for public APIs, but session-based auth requires a strict allowed-origins list.",
  // Database
  22: "Add indexes on columns used in WHERE, JOIN, and ORDER BY. Missing indexes cause full table scans that degrade to seconds at scale.",
  23: "N+1 happens when you fetch a list then query each item individually. Use eager loading — a JOIN or ORM include — to load related data in one query.",
  24: "Always test migrations on a fresh copy of the schema before running in production. A bad migration can corrupt data with no easy rollback.",
  25: "Passwords must be hashed (bcrypt or argon2). PII fields at rest should be encrypted. Never store plaintext secrets in any column.",
  26: "A connection pool reuses database connections instead of opening a new one per request. Without it you'll hit DB connection limits fast under load.",
  27: "Define a backup schedule, test restores periodically, and know your RPO/RTO. Data loss without a recovery plan is a career-defining incident.",
  // Security
  28: "Treat secrets like passwords — never commit them. Use environment variables, a secrets manager (Vault, AWS SSM), or .env files excluded from git.",
  29: "Run npm audit or snyk test regularly. A critical CVE in a dependency can compromise your entire app without you writing a single bad line.",
  30: "Access tokens should expire in minutes to hours. Refresh tokens must be rotated on use. Store them in httpOnly cookies, never in localStorage.",
  31: "Use parameterized queries or an ORM — never concatenate user input into SQL strings. This is the most commonly exploited web vulnerability.",
  32: "Escape all user-generated content before rendering as HTML. Use Content Security Policy headers to block unauthorized inline scripts.",
  33: "Redirect all HTTP to HTTPS. Use HSTS headers. TLS 1.2+ only. Free certificates via Let's Encrypt leave no excuse to skip this.",
  34: "Every protected route must verify a valid session or token server-side. Client-side route guards are UX only — they provide zero security.",
  // DevOps
  35: "List every environment variable in a .env.example file with descriptions. A new developer should be able to spin up the app from that file alone.",
  36: "CI should run tests automatically on every push and PR, with failing tests blocking merges. No 'it works on my machine' deployments.",
  37: "A /health endpoint lets load balancers and orchestrators know the app is alive. Return uptime, version, and database connection status.",
  38: "Set up alerts for error rate spikes, latency increases, and disk or memory thresholds. Find out about problems before users do.",
  39: "Know how to roll back a deployment before you need to — blue/green, canary, or a git revert + redeploy pipeline. Practice it.",
  40: "Centralize logs in a searchable system like Datadog, Loki, or CloudWatch. SSH access to raw server logs doesn't scale past one instance.",
  // Testing
  41: "Test the business rules, not the implementation. Core logic — pricing, permissions, calculations — must have unit tests. This is where bugs hide.",
  42: "Integration tests verify that routes, DB queries, and business logic work together. Mock as little as possible to catch real failure modes.",
  43: "Edge cases are where bugs live: empty arrays, null values, max-length strings, concurrent requests, negative numbers, expired tokens.",
  44: "Manual test runs get skipped under deadline pressure. Automated CI tests run every time and catch regressions before they reach production.",
  45: "Flaky tests that sometimes pass and sometimes fail erode trust in the entire test suite. Fix or delete them — they are worse than no tests.",
  // Performance
  46: "300ms is the upper limit for a snappy API response. Profile slow endpoints with APM tools. Optimize the database query first — it's usually the bottleneck.",
  47: "Use EXPLAIN ANALYZE to find slow queries. Add indexes, rewrite subqueries as JOINs, and avoid SELECT *. Always verify the improvement.",
  48: "Set long Cache-Control headers for versioned static assets. A CDN reduces latency and offloads server traffic for users worldwide.",
  49: "Unoptimized images are often the largest contributor to page weight. Use WebP or AVIF, set explicit dimensions, and lazy-load below-the-fold images.",
  50: "Memory leaks in long-running processes grow until the server crashes. Profile with heap snapshots and watch for monotonically increasing memory.",
  51: "LCP < 2.5s, INP < 100ms, CLS < 0.1. Core Web Vitals directly affect SEO ranking and user retention. Measure with Lighthouse or PageSpeed Insights.",
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

export default function DevPage() {
  const { items, categories, load, deleteItem, updateItemText, updateItemPriority, updateItemDescription, addItem, reorderItems, addCategory, removeCategory } = useDevStore();
  const [activeCatId, setActiveCatId] = useState<number | null>(null);
  const [addingCat, setAddingCat] = useState(false);
  const [showSend, setShowSend] = useState(false);
  const [selectedItem, setSelectedItem] = useState<DevItem | null>(null);
  const [pendingDelete, setPendingDelete] = useState<DevItem | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || activeCatId === null) return;
    const all = items.filter(i => i.category_id === activeCatId);
    const oldIdx = all.findIndex(i => i.id === active.id);
    const newIdx = all.findIndex(i => i.id === over.id);
    if (oldIdx < 0 || newIdx < 0) return;
    reorderItems(activeCatId, arrayMove(all, oldIdx, newIdx).map(i => i.id));
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (categories.length > 0 && activeCatId === null) setActiveCatId(categories[0].id);
  }, [categories.length]);

  const activeCat = categories.find(c => c.id === activeCatId) ?? null;
  const catItems = activeCat ? items.filter(i => i.category_id === activeCat.id) : [];

  return (
    <div className="flex flex-col flex-1 min-h-0 view-animate">

      {/* Category tab bar */}
      <div className="flex items-center gap-0 px-2 pt-1.5 shrink-0" style={{ borderBottom: "1px solid var(--c-border-subtle)" }}>
        <div className="flex items-center gap-0.5 flex-1 overflow-x-auto category-tabs-scroll" style={{ scrollbarWidth: "none" }}>
          {categories.map(cat => {
            const isActive = activeCatId === cat.id;
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
                <span className="text-[10px] opacity-50">{cTotal}</span>
              </button>
            );
          })}
          <button
            onClick={() => setAddingCat(true)}
            className="flex items-center gap-1 px-3 py-2 text-t5 hover:text-t3 transition-colors shrink-0"
          >
            <Plus size={11} />
          </button>
        </div>
      </div>

      {/* Actions bar */}
      <div className="flex items-center justify-end px-4 py-1.5 shrink-0" style={{ borderBottom: "1px solid var(--c-border-subtle)" }}>
        <div className="flex items-center gap-3">
          {activeCat && (
            <button
              onClick={() => setShowSend(true)}
              className="text-sky-400 hover:text-sky-300 transition-colors"
              title="Send to Tasks"
            >
              <Send size={10} />
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

      {/* Items list */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={catItems.map(i => i.id)} strategy={verticalListSortingStrategy}>
          <div className="flex-1 min-h-0 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
            {catItems.map(item => (
              <DevItemRow
                key={item.id}
                item={item}
                onClick={() => setSelectedItem(item)}
                onDelete={() => setPendingDelete(item)}
              />
            ))}
            {catItems.length === 0 && activeCat && (
              <p className="px-5 py-4 text-[11px] text-t6">No items yet</p>
            )}
          </div>
        </SortableContext>
      </DndContext>

      {/* Add item */}
      {activeCat && (
        <div className="shrink-0 px-4 py-2.5" style={{ borderTop: "1px solid var(--c-border-subtle)" }}>
          <AddItemRow rgb={activeCat.color} onAdd={(t, priority) => addItem(t, activeCat.id, priority)} />
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

      {/* Item detail modal */}
      {selectedItem && activeCat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)" }} onMouseDown={e => { if (e.target === e.currentTarget) setSelectedItem(null); }}>
          <ItemDetailModal
            item={selectedItem}
            category={activeCat}
            onClose={() => setSelectedItem(null)}
            onUpdateText={async (text) => { await updateItemText(selectedItem.id, text); setSelectedItem(s => s ? { ...s, text } : s); }}
            onUpdatePriority={async (priority) => { await updateItemPriority(selectedItem.id, priority); setSelectedItem(s => s ? { ...s, priority } : s); }}
            onUpdateDescription={async (desc) => { await updateItemDescription(selectedItem.id, desc); setSelectedItem(s => s ? { ...s, description: desc } : s); }}
          />
        </div>
      )}

      {/* Delete confirmation */}
      {pendingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)" }} onMouseDown={e => { if (e.target === e.currentTarget) setPendingDelete(null); }}>
          <div className="dropdown rounded-xl shadow-2xl flex flex-col gap-3 p-4" style={{ width: 280, border: "1px solid var(--c-border)" }} onMouseDown={e => e.stopPropagation()}>
            <span className="text-[12px] text-t2">Delete this item?</span>
            <span className="text-[11px] text-t4 truncate">"{pendingDelete.text}"</span>
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => setPendingDelete(null)} className="text-[11px] text-t5 hover:text-t3 px-2 py-1 transition-colors">Cancel</button>
              <button
                onClick={() => { deleteItem(pendingDelete.id); setPendingDelete(null); }}
                className="text-[11px] px-3 py-1 rounded transition-colors"
                style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.3)", color: "rgb(248,113,113)" }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Send to tasks modal */}
      {showSend && activeCat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)" }} onMouseDown={e => { if (e.target === e.currentTarget) setShowSend(false); }}>
          <SendToTasksModal
            items={catItems}
            devCategoryName={activeCat.name}
            onClose={() => setShowSend(false)}
          />
        </div>
      )}
    </div>
  );
}

function DevItemRow({ item, onClick, onDelete }: {
  item: DevItem;
  onClick: () => void; onDelete: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const dragStarted = useRef(false);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.45 : 1, cursor: "grab" }}
      className="flex items-center gap-2.5 px-5 py-2 hover:bg-s1 transition-colors active:cursor-grabbing select-none"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => { if (!dragStarted.current) onClick(); dragStarted.current = false; }}
      {...attributes}
      {...listeners}
      onPointerDown={(e) => {
        dragStarted.current = false;
        if (listeners?.onPointerDown) listeners.onPointerDown(e);
      }}
      onPointerMove={(e) => {
        if (e.buttons > 0) dragStarted.current = true;
        if (listeners?.onPointerMove) (listeners as any).onPointerMove?.(e);
      }}
    >
      {item.priority !== "none" && (
        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: PRIORITY_COLOR[item.priority] }} />
      )}

      <span className="flex-1 text-[12px] text-t2">{item.text}</span>

      <button
        onClick={e => { e.stopPropagation(); onDelete(); }}
        onPointerDown={e => e.stopPropagation()}
        style={{ opacity: hovered ? 1 : 0, transition: "opacity 0.15s" }}
        className="shrink-0 text-t6 hover:text-red-400 transition-colors"
      >
        <X size={10} />
      </button>
    </div>
  );
}

function ItemDetailModal({ item, category, onClose, onUpdateText, onUpdatePriority, onUpdateDescription }: {
  item: DevItem;
  category: DevCategory;
  onClose: () => void;
  onUpdateText: (text: string) => Promise<void>;
  onUpdatePriority: (priority: DevPriority) => Promise<void>;
  onUpdateDescription: (desc: string) => Promise<void>;
}) {
  const [title, setTitle] = useState(item.text);
  const defaultDesc = ITEM_DESCRIPTIONS[item.id] ?? "";
  const [desc, setDesc] = useState(item.description || defaultDesc);

  const commitTitle = () => { if (title.trim() && title.trim() !== item.text) onUpdateText(title.trim()); };
  const commitDesc = () => { if (desc !== (item.description || defaultDesc)) onUpdateDescription(desc); };

  return (
    <div
      className="dropdown rounded-xl shadow-2xl flex flex-col p-5"
      style={{ width: 420, maxWidth: "90vw", border: "1px solid var(--c-border)" }}
      onMouseDown={e => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded"
            style={{ background: `rgba(${category.color},0.12)`, color: `rgba(${category.color},0.9)` }}
          >
            <CategoryIcon icon={category.icon} size={9} />
            {category.name}
          </span>
          {(["low", "medium", "high"] as DevPriority[]).map(p => (
            <button
              key={p}
              onClick={() => onUpdatePriority(item.priority === p ? "none" : p)}
              className="text-[9px] px-1.5 py-0.5 rounded font-medium capitalize transition-all"
              style={{
                color: PRIORITY_COLOR[p],
                background: item.priority === p ? PRIORITY_BG[p] : "transparent",
                border: `1px solid ${item.priority === p ? PRIORITY_COLOR[p].replace('rgb', 'rgba').replace(')', ',0.3)') : 'transparent'}`,
                opacity: item.priority === p ? 1 : 0.35,
              }}
            >
              {p}
            </button>
          ))}
        </div>
        <button onClick={onClose} className="text-t5 hover:text-t3 shrink-0"><X size={13} /></button>
      </div>

      {/* Title */}
      <input
        value={title}
        onChange={e => setTitle(e.target.value)}
        onBlur={commitTitle}
        onKeyDown={e => {
          if (e.key === "Enter") { commitTitle(); (e.target as HTMLInputElement).blur(); }
          if (e.key === "Escape") { setTitle(item.text); (e.target as HTMLInputElement).blur(); }
        }}
        className="bg-transparent text-[15px] font-semibold text-t1 outline-none mb-3 w-full"
        style={{ caretColor: `rgba(${category.color},0.8)` }}
      />

      {/* Description */}
      <textarea
        value={desc}
        onChange={e => setDesc(e.target.value)}
        onBlur={commitDesc}
        placeholder="Add a description…"
        rows={4}
        className="bg-transparent text-[12px] text-t3 leading-relaxed outline-none resize-none w-full placeholder:text-t6"
        style={{ caretColor: `rgba(${category.color},0.8)` }}
      />
    </div>
  );
}

const PRIORITIES_SELECT: DevPriority[] = ["low", "medium", "high"];

function AddItemRow({ rgb, onAdd }: { rgb: string; onAdd: (t: string, priority: DevPriority) => void }) {
  const [val, setVal] = useState("");
  const [active, setActive] = useState(false);
  const [priority, setPriority] = useState<DevPriority>("none");

  const commit = () => {
    if (val.trim()) { onAdd(val.trim(), priority); setVal(""); setPriority("none"); }
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1 shrink-0">
        {PRIORITIES_SELECT.map(p => (
          <button
            key={p}
            onClick={() => setPriority(prev => prev === p ? "none" : p)}
            title={p}
            className="w-2 h-2 rounded-full transition-all"
            style={{
              background: PRIORITY_COLOR[p],
              opacity: priority === p ? 1 : 0.22,
              transform: priority === p ? "scale(1.35)" : "scale(1)",
            }}
          />
        ))}
      </div>
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

      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-[10px] text-t5 uppercase tracking-wider">Items</span>
          <div className="flex gap-2">
            <button onClick={() => setSelected(new Set(items.map(i => i.id)))} className="text-[9px] text-t5 hover:text-t3 transition-colors">all</button>
            <button onClick={() => setSelected(new Set())} className="text-[9px] text-t5 hover:text-t3 transition-colors">none</button>
          </div>
        </div>
        {items.length === 0 ? (
          <p className="text-[11px] text-t5 py-2">No items in this category.</p>
        ) : (
          <div className="flex flex-col overflow-y-auto" style={{ maxHeight: 160, scrollbarWidth: "none" }}>
            {items.map(item => (
              <label key={item.id} className="flex items-center gap-2 px-1 py-1 rounded hover:bg-s1 cursor-pointer select-none">
                <input type="checkbox" checked={selected.has(item.id)} onChange={() => toggle(item.id)} className="accent-sky-400" />
                <span className="text-[11px] text-t2 truncate flex-1">{item.text}</span>
                {item.priority !== "none" && (
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: PRIORITY_COLOR[item.priority] }} />
                )}
              </label>
            ))}
          </div>
        )}
      </div>

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
            <button onClick={() => setCreatingCat(true)} className="px-2 py-0.5 rounded text-[10px] text-t5 hover:text-t3 transition-colors" style={{ border: "1px dashed var(--c-border)" }}>
              + New
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <input
              autoFocus value={newCatName} onChange={e => setNewCatName(e.target.value)}
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
        autoFocus value={name} onChange={e => setName(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter") submit(); if (e.key === "Escape") onClose(); }}
        placeholder="Category name…"
        className="bg-transparent text-[13px] text-t2 outline-none border-b pb-1"
        style={{ borderColor: "var(--c-border)" }}
      />
      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] text-t5 uppercase tracking-wider">Icon</span>
        <div className="flex items-center gap-1 flex-wrap">
          {CAT_ICONS.map(ic => (
            <button key={ic} onClick={() => setIcon(ic)} className={`p-1.5 rounded transition-colors ${icon === ic ? "bg-s3 text-t1" : "text-t5 hover:text-t3"}`}>
              <CategoryIcon icon={ic} size={12} />
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] text-t5 uppercase tracking-wider">Color</span>
        <div className="flex gap-1.5 flex-wrap">
          {PRESET_COLORS.slice(0, 14).map(c => (
            <button key={c} onClick={() => setColor(c)} className="w-4 h-4 rounded-full transition-all"
              style={{ background: `rgb(${c})`, outline: color === c ? `2px solid rgba(${c},0.7)` : "none", outlineOffset: 1 }}
            />
          ))}
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <button onClick={onClose} className="text-[11px] text-t5 hover:text-t3 px-2 py-1 transition-colors">Cancel</button>
        <button onClick={submit} disabled={!name.trim()} className="text-[11px] px-3 py-1 rounded transition-colors disabled:opacity-40"
          style={{ background: "var(--c-surface-3)", border: "1px solid var(--c-border)", color: "var(--c-text-2)" }}>
          Add
        </button>
      </div>
    </div>
  );
}
