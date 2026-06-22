import { useEffect, useState } from "react";
import { Lock, WifiOff, BarChartHorizontalBig, UserX, Database, Bell, ShieldOff } from "lucide-react";
import logoWithBg from "../assets/logo-with-bg-light.png";
import { enable, disable, isEnabled } from "@tauri-apps/plugin-autostart";
import { openUrl, revealItemInDir } from "@tauri-apps/plugin-opener";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { writeTextFile, readTextFile } from "@tauri-apps/plugin-fs";
import { appDataDir, join } from "@tauri-apps/api/path";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { invoke } from "@tauri-apps/api/core";
import { getDb } from "../db";
import { useSettingsStore, Theme, TextSize, WindowMode } from "../settingsStore";
import { useTodoStore } from "../store";
import { useReminderStore } from "../reminderStore";
import { useNotesStore } from "../notesStore";
import { useDevStore } from "../devStore";
import { useToastStore, showErrorToast } from "../toastStore";

const guideSections = [
  {
    title: "Slash Commands",
    items: [
      { keys: ["Type anything", "↵"], desc: "Add a quick task to the active category" },
      { keys: ["/tm", "task name", "↵"], desc: "Add a task with deadline — opens date & time picker" },
      { keys: ["/t", "category", "↵", "task", "↵"], desc: "Add a task to a specific category" },
      { keys: ["/rm", "reminder text", "↵"], desc: "Add a reminder — navigates to Reminders after" },
      { keys: ["/nt", "title", "↵"], desc: "Create a new note — opens it immediately" },
      { keys: ["/i", "module", "↵", "entry", "↵"], desc: "Add an IHK training entry — pick module then type text" },
    ],
  },
  {
    title: "Keyboard Shortcuts",
    items: [
      { keys: ["⌥S"], desc: "Toggle Slate from anywhere" },
      { keys: ["⌥N"], desc: "Open quick-note window from anywhere" },
      { keys: ["Esc"], desc: "Close Slate (or clear search if text is entered)" },
      { keys: ["↑ ↓"], desc: "Navigate command / category / module picker" },
      { keys: ["⌫ Delete"], desc: "Move focused task to trash" },
    ],
  },
  {
    title: "Kanban Board",
    items: [
      { keys: ["Click card"], desc: "Open task detail — edit text, description, deadline, priority" },
      { keys: ["Drag card"], desc: "Move a task between columns or reorder within a column" },
      { keys: ["+ in column header"], desc: "Add a task directly to that status column" },
      { keys: ["Trash icon in column header"], desc: "Clear all tasks in the column (moves to trash)" },
      { keys: ["Red card bg"], desc: "Task is overdue" },
    ],
  },
  {
    title: "Categories",
    items: [
      { keys: ["Category tab"], desc: "Switch the active category shown on the board" },
      { keys: ["Drag tab"], desc: "Reorder categories by dragging tabs left or right" },
      { keys: ["Right-click tab"], desc: "Edit name, color & icon, or delete the category" },
      { keys: ["FolderPlus button"], desc: "Create a new category — pick a name, color, and icon" },
      { keys: ["Red dot on tab"], desc: "One or more tasks in that category are overdue" },
    ],
  },
  {
    title: "Due Dates & Notifications",
    items: [
      { keys: ["/tm", "task", "↵"], desc: "Set deadline at creation via date & time picker" },
      { keys: ["Task detail → Deadline"], desc: "Add or change a deadline after creation" },
      { keys: ["Countdown"], desc: "Live timer — shows days · hours · minutes · seconds" },
      { keys: ["overdue · date time"], desc: "Overdue label with exact date and time it passed" },
      { keys: ["Red dot on ✓ icon"], desc: "A deadline notification fired — click to dismiss" },
    ],
  },
  {
    title: "Reminders",
    items: [
      { keys: ["Footer → Clock icon"], desc: "View all upcoming and sent reminders" },
      { keys: ["Right-click reminder"], desc: "Send now, edit text/time, or delete" },
      { keys: ["Blue dot"], desc: "Upcoming reminder" },
      { keys: ["Grey dot · sent"], desc: "Notification already fired" },
      { keys: ["Red dot on Clock icon"], desc: "A reminder notification fired — click to dismiss" },
    ],
  },
  {
    title: "Notes",
    items: [
      { keys: ["Footer → FileText icon"], desc: "Open notes — editor with collapsible sidebar" },
      { keys: ["Sidebar toggle button"], desc: "Collapse or expand the notes list sidebar" },
      { keys: ["+ button"], desc: "Create a new note" },
      { keys: ["Right-click note"], desc: "Delete note from sidebar" },
      { keys: ["Auto-save"], desc: "Notes save automatically after 500 ms" },
    ],
  },
  {
    title: "IHK Training Log",
    items: [
      { keys: ["/i", "module", "↵", "entry", "↵"], desc: "Fastest way — type and pick a module, then the entry text" },
      { keys: ["Footer → IHK"], desc: "Open full IHK log — weeks, modules, entries" },
      { keys: ["Drag entry"], desc: "Reorder entries within a week block" },
      { keys: ["Send week"], desc: "Mark a week as submitted" },
    ],
  },
  {
    title: "Deleted",
    items: [
      { keys: ["Footer → Trash icon"], desc: "View all deleted tasks grouped by category" },
      { keys: ["RotateCcw icon"], desc: "Restore a task back to its category" },
      { keys: ["X icon"], desc: "Permanently delete a single task" },
      { keys: ["Trash icon on group"], desc: "Permanently delete all tasks in a deleted category" },
    ],
  },
  {
    title: "Activity",
    items: [
      { keys: ["Heatmap"], desc: "Shows today's action count — darker = more activity" },
      { keys: ["Counted actions"], desc: "App open, add/edit tasks, set deadline/priority/description, toggle done, start/finish timer, add/reschedule reminders, send reminder now, create/edit notes, add/edit IHK entries, mark week as sent" },
    ],
  },
  {
    title: "Clockify",
    items: [
      { keys: ["Focus card"], desc: "Sits beside the heatmap on the Home screen — pick one task to track at a time" },
      { keys: ["Header"], desc: "Shows category icon + task name — click to open the task dropdown and switch tasks" },
      { keys: ["Search icon"], desc: "Click to expand a full-width search bar that filters the task list as you type" },
      { keys: ["Card body"], desc: "Shows priority badge, subtask progress bar, 3-line description preview, created date and deadline" },
      { keys: ["Status pill"], desc: "Combined category + status pill on the left; priority pill on the right" },
      { keys: ["Play / Pause"], desc: "Start or pause the timer; each session is logged with start and end time" },
      { keys: ["Done"], desc: "Stop the timer and mark the task as done" },
      { keys: ["Card color"], desc: "Blue by default · Red when deadline is overdue · Green when task is done" },
      { keys: ["Time log"], desc: "Open the task detail to see all sessions, total time, and session count" },
    ],
  },
  {
    title: "Dev Checklist",
    items: [
      { keys: ["Pages (top bar)"], desc: "Organise categories into separate pages — click to switch, right-click to rename or delete" },
      { keys: ["+ page button"], desc: "Add a new page — type a name and press Enter" },
      { keys: ["Category tabs"], desc: "Each page has its own categories — right-click to edit name, color & icon, or delete" },
      { keys: ["+ category button"], desc: "Add a category to the active page with a name, color, and icon" },
      { keys: ["Checklist item"], desc: "Click to expand detail — edit text, description, or priority; tick to mark done" },
      { keys: ["Priority filter"], desc: "Filter items by All / Low / Medium / High across the active category" },
      { keys: ["Send to Tasks button"], desc: "Copy all items in the active category to the Tasks page as a new category" },
      { keys: ["Reset button (↺)"], desc: "Restore the full default dev checklist — wipes all custom content and re-seeds preset pages, categories, and items" },
      { keys: ["Trash"], desc: "Deleted dev items are recoverable from the Deleted view — grouped by page and category" },
    ],
  },
];

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className="relative w-8 h-4 rounded-full transition-colors shrink-0 overflow-hidden"
      style={{ background: value ? "rgba(99,179,237,0.5)" : "var(--c-surface-3)" }}
    >
      <span
        className="absolute top-0.5 left-0 w-3 h-3 rounded-full transition-transform"
        style={{
          background: value ? "white" : "var(--c-text-3)",
          transform: value ? "translateX(18px)" : "translateX(2px)",
        }}
      />
    </button>
  );
}

function SettingRow({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-2.5">
      <div className="min-w-0">
        <p className="text-[13px] text-t2">{label}</p>
        {hint && <p className="text-[11px] text-t4 mt-0.5">{hint}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <p className="px-1 pb-1.5 text-[11px] text-t4 font-medium select-none">{title}</p>
      <div className="rounded overflow-hidden" style={{ background: "var(--c-surface-1)" }}>
        {children}
      </div>
    </div>
  );
}

function Divider() {
  return <div className="h-px mx-4" style={{ background: "var(--c-border-subtle)" }} />;
}

function GeneralTab() {
  const { theme, textSize, windowMode, set } = useSettingsStore();
  const [loginEnabled, setLoginEnabled] = useState(false);

  useEffect(() => {
    isEnabled().then(setLoginEnabled).catch(() => {});
  }, []);

  const toggleLogin = async (v: boolean) => {
    if (v) await enable(); else await disable();
    setLoginEnabled(v);
  };

  return (
    <div className="overflow-y-auto flex-1 py-4 px-4">
      <Section title="System">
        <SettingRow label="Launch Slate at login" hint="Start automatically when you log in">
          <Toggle value={loginEnabled} onChange={toggleLogin} />
        </SettingRow>
      </Section>

      <Section title="Appearance">
        <SettingRow label="Theme">
          <div className="flex gap-3">
            {(["dark", "light"] as Theme[]).map((t) => (
              <button
                key={t}
                onClick={() => set("theme", t)}
                className="flex flex-col items-center gap-1.5 group"
              >
                <div
                  className="w-14 h-10 rounded border-2 transition-all overflow-hidden"
                  style={{
                    borderColor: theme === t ? "rgb(147,210,255)" : "var(--c-border)",
                    background: t === "dark" ? "#1a1a1e" : "#f0f0f4",
                  }}
                >
                  <div className="h-3 w-full" style={{ background: t === "dark" ? "#2a2a30" : "#e0e0e8" }} />
                  <div className="flex gap-1 p-1 pt-1">
                    {[3, 5, 4].map((w, i) => (
                      <div key={i} className="h-1 rounded-full" style={{ width: `${w * 4}px`, background: t === "dark" ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.15)" }} />
                    ))}
                  </div>
                </div>
                <span className={`text-[11px] capitalize ${theme === t ? "text-t1 font-medium" : "text-t4"}`}>{t}</span>
              </button>
            ))}
          </div>
        </SettingRow>
        <Divider />
        <SettingRow label="Text size">
          <div className="flex items-center gap-2">
            {(["small", "normal", "large"] as TextSize[]).map((s) => (
              <button
                key={s}
                onClick={() => set("textSize", s)}
                className="flex flex-col items-center gap-0.5"
              >
                <div
                  className="w-9 h-8 rounded flex items-center justify-center transition-all border"
                  style={{
                    background: textSize === s ? "var(--c-surface-3)" : "var(--c-surface-2)",
                    borderColor: textSize === s ? "rgb(147,210,255)" : "var(--c-border)",
                    fontSize: s === "small" ? "10px" : s === "large" ? "16px" : "13px",
                    color: "var(--c-text-2)",
                    fontWeight: 500,
                  }}
                >
                  Aa
                </div>
                <span className={`text-[10px] capitalize ${textSize === s ? "text-t2" : "text-t5"}`}>{s}</span>
              </button>
            ))}
          </div>
        </SettingRow>
        <Divider />
        <SettingRow label="Window mode">
          <div className="flex items-center gap-2">
            {([
              { value: "default", label: "Default", w: 56, h: 40 },
              { value: "compact", label: "Compact", w: 44, h: 32 },
            ] as { value: WindowMode; label: string; w: number; h: number }[]).map((m) => (
              <button key={m.value} onClick={() => set("windowMode", m.value)} className="flex flex-col items-center gap-1">
                <div
                  className="rounded border-2 transition-all flex flex-col overflow-hidden"
                  style={{
                    width: m.w, height: m.h,
                    borderColor: windowMode === m.value ? "rgb(147,210,255)" : "var(--c-border)",
                    background: "var(--c-surface-2)",
                  }}
                >
                  <div className="h-2 w-full shrink-0" style={{ background: "var(--c-surface-3)" }} />
                  <div className="flex-1 p-1 flex flex-col gap-0.5">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-0.5 rounded-full" style={{ background: "var(--c-border)", width: i === 2 ? "60%" : "80%" }} />
                    ))}
                  </div>
                </div>
                <span className={`text-[10px] ${windowMode === m.value ? "text-t2 font-medium" : "text-t5"}`}>{m.label}</span>
              </button>
            ))}
          </div>
        </SettingRow>
      </Section>

    </div>
  );
}

type PreviewTab = "tasks" | "reminders" | "notes";

function DataPreview() {
  const [tab, setTab] = useState<PreviewTab>("tasks");
  const todos = useTodoStore((s) => s.todos);
  const reminders = useReminderStore((s) => s.reminders);
  const notes = useNotesStore((s) => s.notes);

  const tabs: { key: PreviewTab; label: string; count: number }[] = [
    { key: "tasks", label: "Tasks", count: todos.length },
    { key: "reminders", label: "Reminders", count: reminders.length },
    { key: "notes", label: "Notes", count: notes.length },
  ];

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="px-1 text-[11px] text-t4 font-medium select-none">Preview</span>
        <div className="flex gap-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="px-2.5 py-1 rounded text-[11px] transition-colors"
              style={{
                background: tab === t.key ? "var(--c-surface-2)" : "transparent",
                color: tab === t.key ? "var(--c-text-1)" : "var(--c-text-4)",
              }}
            >
              {t.label} <span className="opacity-50">{t.count}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--c-border-subtle)" }}>
        <div className="overflow-auto" style={{ maxHeight: 220 }}>
          {tab === "tasks" && (
            <table className="w-full text-[11px]">
              <thead>
                <tr style={{ background: "var(--c-surface-2)", borderBottom: "1px solid var(--c-border-subtle)" }}>
                  <th className="text-left px-3 py-2 text-t4 font-medium">Task</th>
                  <th className="text-left px-3 py-2 text-t4 font-medium">Priority</th>
                  <th className="text-left px-3 py-2 text-t4 font-medium">Status</th>
                  <th className="text-left px-3 py-2 text-t4 font-medium">Due</th>
                </tr>
              </thead>
              <tbody>
                {todos.length === 0 ? (
                  <tr><td colSpan={4} className="px-3 py-4 text-center text-t5">No tasks</td></tr>
                ) : todos.map((t) => (
                  <tr key={t.id} style={{ borderBottom: "1px solid var(--c-border-subtle)" }}>
                    <td className="px-3 py-2 text-t2 max-w-[180px] truncate">{t.text}</td>
                    <td className="px-3 py-2 text-t4 capitalize">{t.priority}</td>
                    <td className="px-3 py-2 text-t4">{t.done ? "Done" : "Open"}</td>
                    <td className="px-3 py-2 text-t4">{t.due_date ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {tab === "reminders" && (
            <table className="w-full text-[11px]">
              <thead>
                <tr style={{ background: "var(--c-surface-2)", borderBottom: "1px solid var(--c-border-subtle)" }}>
                  <th className="text-left px-3 py-2 text-t4 font-medium">Reminder</th>
                  <th className="text-left px-3 py-2 text-t4 font-medium">Time</th>
                  <th className="text-left px-3 py-2 text-t4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {reminders.length === 0 ? (
                  <tr><td colSpan={3} className="px-3 py-4 text-center text-t5">No reminders</td></tr>
                ) : reminders.map((r) => (
                  <tr key={r.id} style={{ borderBottom: "1px solid var(--c-border-subtle)" }}>
                    <td className="px-3 py-2 text-t2 max-w-[200px] truncate">{r.text}</td>
                    <td className="px-3 py-2 text-t4">{new Date(r.remind_at).toLocaleString()}</td>
                    <td className="px-3 py-2 text-t4">{r.notified ? "Sent" : "Pending"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {tab === "notes" && (
            <table className="w-full text-[11px]">
              <thead>
                <tr style={{ background: "var(--c-surface-2)", borderBottom: "1px solid var(--c-border-subtle)" }}>
                  <th className="text-left px-3 py-2 text-t4 font-medium">Title</th>
                  <th className="text-left px-3 py-2 text-t4 font-medium">Preview</th>
                  <th className="text-left px-3 py-2 text-t4 font-medium">Updated</th>
                </tr>
              </thead>
              <tbody>
                {notes.length === 0 ? (
                  <tr><td colSpan={3} className="px-3 py-4 text-center text-t5">No notes</td></tr>
                ) : notes.map((n) => (
                  <tr key={n.id} style={{ borderBottom: "1px solid var(--c-border-subtle)" }}>
                    <td className="px-3 py-2 text-t2 max-w-[140px] truncate">{n.title || "Untitled"}</td>
                    <td className="px-3 py-2 text-t4 max-w-[180px] truncate">{n.content.slice(0, 60) || "—"}</td>
                    <td className="px-3 py-2 text-t4">{new Date(n.updated_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function validateSlateExport(raw: string): string | null {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return "Not a valid JSON file — please select a Slate export (.json)";
  }
  if (!data || typeof data !== "object" || Array.isArray(data))
    return "This file is not a valid Slate export";
  const d = data as Record<string, unknown>;
  if (d.version !== 2 && d.version !== 3)
    return "Unsupported export version — please re-export your data from the current version of Slate";

  const required = ["todos", "reminders", "notes", "taskSessions", "taskCategories", "ihkEntries", "ihkModules", "ihkWeeks", "activity"];
  for (const key of required) {
    if (!Array.isArray(d[key]))
      return `Invalid export — missing or invalid "${key}" section`;
  }

  // Sample-check first item of each core table to catch files from a different app
  const checks: [string, string[]][] = [
    ["todos",     ["id", "text"]],
    ["reminders", ["id", "remind_at"]],
    ["notes",     ["id", "title"]],
  ];
  for (const [key, fields] of checks) {
    const arr = d[key] as unknown[];
    if (arr.length > 0) {
      const item = arr[0] as Record<string, unknown>;
      const missing = fields.find(f => item[f] === undefined);
      if (missing) return `Invalid ${key.slice(0, -1)} format — this file may be from a different app`;
    }
  }
  return null;
}

function DataTab() {
  const loadTodos = useTodoStore((s) => s.load);
  const loadReminders = useReminderStore((s) => s.load);
  const loadNotes = useNotesStore((s) => s.load);
  const loadDev = useDevStore((s) => s.load);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importFile, setImportFile] = useState<string | null>(null);
  const [importConfirm, setImportConfirm] = useState(false);
  const [exportedPath, setExportedPath] = useState<string | null>(null);
  const showToast = useToastStore((s) => s.show);

  const withDialogFocus = async <T,>(fn: () => Promise<T>): Promise<T> => {
    const win = getCurrentWindow();
    await invoke("set_auto_hide", { enabled: false });
    await win.setAlwaysOnTop(false);
    try { return await fn(); } finally {
      await win.setAlwaysOnTop(true);
      await invoke("set_auto_hide", { enabled: true });
    }
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      const db = await getDb();
      const todos = await db.select("SELECT * FROM todos");
      const reminders = await db.select("SELECT * FROM reminders");
      const notes = await db.select("SELECT * FROM notes");
      const taskSessions = await db.select("SELECT * FROM task_sessions");
      const taskCategories = await db.select("SELECT * FROM task_categories");
      const deletedCategories = await db.select("SELECT * FROM deleted_categories");
      const ihkEntries = await db.select("SELECT * FROM ihk_entries");
      const ihkModules = await db.select("SELECT * FROM ihk_modules");
      const ihkWeeks = await db.select("SELECT * FROM ihk_weeks");
      const activity = await db.select("SELECT * FROM activity");
      const devItems = await db.select("SELECT * FROM dev_items");
      const devCategories = await db.select("SELECT * FROM dev_categories");
      const devSections = await db.select("SELECT * FROM dev_sections");
      const payload = JSON.stringify({ version: 3, exportedAt: new Date().toISOString(), todos, reminders, notes, taskSessions, taskCategories, deletedCategories, ihkEntries, ihkModules, ihkWeeks, activity, devItems, devCategories, devSections }, null, 2);
      const d = new Date(); const today = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}-${String(d.getHours()).padStart(2,"0")}-${String(d.getMinutes()).padStart(2,"0")}`;
      const dir = await appDataDir();
      const filePath = await join(dir, `slate-${today}.json`);
      await writeTextFile(filePath, payload);
      setExportedPath(filePath);
      showToast("exported");
    } catch (e) {
      console.error("export failed:", e);
      showErrorToast("Export failed — please try again");
    } finally {
      setExporting(false);
    }
  };

  const handlePickImport = async () => {
    const path = await withDialogFocus(() => openDialog({ filters: [{ name: "JSON", extensions: ["json"] }], multiple: false }));
    if (typeof path !== "string") return;
    try {
      const raw = await readTextFile(path);
      const error = validateSlateExport(raw);
      if (error) { showErrorToast(error); return; }
      setImportFile(path);
      setImportConfirm(true);
    } catch {
      showErrorToast("Couldn't read the file — please try again");
    }
  };

  const handleImport = async (withBackup: boolean) => {
    if (!importFile) return;
    try {
      setImporting(true);
      setImportConfirm(false);
      const db = await getDb();
      if (withBackup) {
        const backupTodos = await db.select("SELECT * FROM todos");
        const backupReminders = await db.select("SELECT * FROM reminders");
        const backupNotes = await db.select("SELECT * FROM notes");
        const backupTaskSessions = await db.select("SELECT * FROM task_sessions");
        const backupTaskCategories = await db.select("SELECT * FROM task_categories");
        const backupDeletedCategories = await db.select("SELECT * FROM deleted_categories");
        const backupIhkEntries = await db.select("SELECT * FROM ihk_entries");
        const backupIhkModules = await db.select("SELECT * FROM ihk_modules");
        const backupIhkWeeks = await db.select("SELECT * FROM ihk_weeks");
        const backupActivity = await db.select("SELECT * FROM activity");
        const backupDevItems = await db.select("SELECT * FROM dev_items");
        const backupDevCategories = await db.select("SELECT * FROM dev_categories");
        const backupDevSections = await db.select("SELECT * FROM dev_sections");
        const backupPayload = JSON.stringify({ version: 3, exportedAt: new Date().toISOString(), todos: backupTodos, reminders: backupReminders, notes: backupNotes, taskSessions: backupTaskSessions, taskCategories: backupTaskCategories, deletedCategories: backupDeletedCategories, ihkEntries: backupIhkEntries, ihkModules: backupIhkModules, ihkWeeks: backupIhkWeeks, activity: backupActivity, devItems: backupDevItems, devCategories: backupDevCategories, devSections: backupDevSections }, null, 2);
        const bd = new Date(); const backupDate = `${bd.getFullYear()}-${String(bd.getMonth()+1).padStart(2,"0")}-${String(bd.getDate()).padStart(2,"0")}-${String(bd.getHours()).padStart(2,"0")}-${String(bd.getMinutes()).padStart(2,"0")}`;
        const dir = await appDataDir();
        await writeTextFile(await join(dir, `slate-backup-${backupDate}.json`), backupPayload);
      }
      const raw = await readTextFile(importFile);
      const data = JSON.parse(raw);
      await db.execute("DELETE FROM todos");
      await db.execute("DELETE FROM reminders");
      await db.execute("DELETE FROM notes");
      await db.execute("DELETE FROM task_sessions");
      await db.execute("DELETE FROM task_categories");
      await db.execute("DELETE FROM deleted_categories");
      await db.execute("DELETE FROM ihk_entries");
      await db.execute("DELETE FROM ihk_modules");
      await db.execute("DELETE FROM ihk_weeks");
      await db.execute("DELETE FROM activity");
      await db.execute("DELETE FROM dev_items");
      await db.execute("DELETE FROM dev_categories");
      await db.execute("DELETE FROM dev_sections");
      // Restore General task category first (always required)
      await db.execute(`INSERT OR IGNORE INTO task_categories (id, name, color, icon, position) VALUES (1, 'General', '99,102,241', 'folder', 0)`);
      for (const c of (data.taskCategories ?? [])) {
        await db.execute(
          "INSERT OR IGNORE INTO task_categories (id, name, color, icon, position, created_at) VALUES (?,?,?,?,?,?)",
          [c.id, c.name, c.color, c.icon ?? "folder", c.position, c.created_at]
        );
      }
      for (const c of (data.deletedCategories ?? [])) {
        await db.execute(
          "INSERT OR IGNORE INTO deleted_categories (id, name, color, icon) VALUES (?,?,?,?)",
          [c.id, c.name, c.color, c.icon ?? "folder"]
        );
      }
      for (const t of data.todos) {
        await db.execute(
          "INSERT INTO todos (id, text, done, priority, due_date, due_time, deadline_notified, description, position, created_at, deleted_at, category_id, status, show_created_at, show_timer, show_subtask_bar, subtasks) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
          [t.id, t.text, t.done, t.priority, t.due_date, t.due_time, t.deadline_notified, t.description ?? "", t.position, t.created_at, t.deleted_at ?? null, t.category_id ?? 1, t.status ?? "todo", t.show_created_at ?? 0, t.show_timer ?? 0, t.show_subtask_bar ?? 0, t.subtasks ?? '[]']
        );
      }
      for (const r of data.reminders) {
        await db.execute(
          "INSERT INTO reminders (id, text, remind_at, notified, created_at, deleted_at) VALUES (?,?,?,?,?,?)",
          [r.id, r.text, r.remind_at, r.notified, r.created_at, r.deleted_at ?? null]
        );
      }
      for (const n of data.notes) {
        await db.execute(
          "INSERT INTO notes (id, title, content, created_at, updated_at, deleted_at) VALUES (?,?,?,?,?,?)",
          [n.id, n.title, n.content, n.created_at, n.updated_at, n.deleted_at ?? null]
        );
      }
      for (const s of (data.taskSessions ?? [])) {
        await db.execute(
          "INSERT INTO task_sessions (id, task_id, started_at, ended_at) VALUES (?,?,?,?)",
          [s.id, s.task_id, s.started_at, s.ended_at ?? null]
        );
      }
      for (const e of (data.ihkEntries ?? [])) {
        await db.execute(
          "INSERT INTO ihk_entries (id, text, category, date, position, created_at) VALUES (?,?,?,?,?,?)",
          [e.id, e.text, e.category, e.date, e.position, e.created_at]
        );
      }
      for (const m of (data.ihkModules ?? [])) {
        await db.execute(
          "INSERT INTO ihk_modules (id, name, type, created_at) VALUES (?,?,?,?)",
          [m.id, m.name, m.type, m.created_at]
        );
      }
      for (const w of (data.ihkWeeks ?? [])) {
        await db.execute(
          "INSERT INTO ihk_weeks (week_key, sent) VALUES (?,?)",
          [w.week_key, w.sent]
        );
      }
      for (const a of (data.activity ?? [])) {
        await db.execute(
          "INSERT INTO activity (id, date, created_at) VALUES (?,?,?)",
          [a.id, a.date, a.created_at]
        );
      }
      // Dev content (version 3+ exports)
      for (const sec of (data.devSections ?? [])) {
        await db.execute(
          "INSERT OR IGNORE INTO dev_sections (id, name, position, created_at) VALUES (?,?,?,?)",
          [sec.id, sec.name, sec.position, sec.created_at ?? new Date().toISOString()]
        );
      }
      for (const c of (data.devCategories ?? [])) {
        await db.execute(
          "INSERT OR IGNORE INTO dev_categories (id, name, color, icon, position, is_preset, section_id) VALUES (?,?,?,?,?,?,?)",
          [c.id, c.name, c.color, c.icon ?? "folder", c.position, c.is_preset ? 1 : 0, c.section_id ?? 1]
        );
      }
      for (const i of (data.devItems ?? [])) {
        await db.execute(
          "INSERT OR IGNORE INTO dev_items (id, text, done, category_id, priority, position, description, created_at, deleted_at) VALUES (?,?,?,?,?,?,?,?,?)",
          [i.id, i.text, i.done ? 1 : 0, i.category_id, i.priority ?? "none", i.position, i.description ?? "", i.created_at ?? new Date().toISOString(), i.deleted_at ?? null]
        );
      }
      // Mark dev as seeded so the next startup doesn't overwrite the imported data
      if ((data.devSections ?? []).length > 0) {
        await db.execute("INSERT OR REPLACE INTO meta (key, value) VALUES ('dev_seeded', '1')");
        await db.execute("INSERT OR REPLACE INTO meta (key, value) VALUES ('dev_content_v2', '1')");
        await db.execute("INSERT OR REPLACE INTO meta (key, value) VALUES ('dev_sections_v1', '1')");
      }
      await Promise.all([loadTodos(), loadReminders(), loadNotes(), loadDev()]);
      showToast(withBackup ? "exported-imported" : "imported");
    } catch (e) {
      console.error("import failed:", e);
      showErrorToast("Import failed — please check the file and try again");
    } finally {
      setImporting(false);
      setImportFile(null);
    }
  };

  const handleOpenFolder = async () => {
    const dir = await appDataDir();
    await revealItemInDir(dir);
  };

  return (
    <div className="overflow-y-auto flex-1 py-4 px-4 flex flex-col gap-4">
      <DataPreview />
      <Section title="Backup">
        <SettingRow label="Export data" hint="Save all tasks, reminders and notes as JSON">
          <button
            onClick={handleExport}
            disabled={exporting}
            className="px-3 py-1 rounded text-[11px] text-t2 hover:text-t1 transition-colors disabled:opacity-40"
            style={{ background: "var(--c-surface-2)", border: "1px solid var(--c-border)" }}
          >
            {exporting ? "Exporting…" : "Export"}
          </button>
        </SettingRow>
        <Divider />
        <SettingRow label="Import data" hint="Restore from a previous export file">
          <button
            onClick={handlePickImport}
            disabled={importing}
            className="px-3 py-1 rounded text-[11px] text-t2 hover:text-t1 transition-colors disabled:opacity-40"
            style={{ background: "var(--c-surface-2)", border: "1px solid var(--c-border)" }}
          >
            {importing ? "Importing…" : "Import"}
          </button>
        </SettingRow>
      </Section>

      <Section title="Storage">
        <SettingRow label="Open data folder" hint="Browse the folder where Slate stores its database">
          <button
            onClick={handleOpenFolder}
            className="px-3 py-1 rounded text-[11px] text-t2 hover:text-t1 transition-colors"
            style={{ background: "var(--c-surface-2)", border: "1px solid var(--c-border)" }}
          >
            Open in Finder
          </button>
        </SettingRow>
      </Section>

      {/* Import confirm modal */}
      {importConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="dropdown rounded-lg p-5 mx-4 flex flex-col gap-3" style={{ width: "fit-content", minWidth: 320 }}>
            <p className="text-[14px] font-semibold text-t1">Export current data first?</p>
            <p className="text-[12px] text-t3 leading-relaxed">
              Your current tasks, reminders and notes will be lost after importing. Do you want to export them first?
            </p>
            <div className="flex gap-2 justify-end mt-1">
              <button
                onClick={() => { setImportConfirm(false); setImportFile(null); }}
                className="px-3 py-1.5 rounded text-[12px] text-t3 hover:text-t2 transition-colors"
                style={{ background: "var(--c-surface-2)" }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleImport(false)}
                className="px-3 py-1.5 rounded text-[12px] text-t2 hover:text-t1 transition-colors"
                style={{ background: "var(--c-surface-2)" }}
              >
                No, just import
              </button>
              <button
                onClick={() => handleImport(true)}
                className="px-3 py-1.5 rounded text-[12px] text-blue-400 hover:text-blue-300 transition-colors"
                style={{ background: "rgba(59,130,246,0.15)" }}
              >
                Yes, export then import
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export success modal */}
      {exportedPath && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="dropdown rounded-lg p-5 mx-4 flex flex-col gap-3" style={{ width: "fit-content", minWidth: 320 }}>
            <p className="text-[14px] font-semibold text-t1">Data exported</p>
            <p className="text-[12px] text-t3 leading-relaxed break-all">{exportedPath}</p>
            <div className="flex gap-2 justify-end mt-1">
              <button
                onClick={() => setExportedPath(null)}
                className="px-3 py-1.5 rounded text-[12px] text-t3 hover:text-t2 transition-colors"
                style={{ background: "var(--c-surface-2)" }}
              >
                Close
              </button>
              <button
                onClick={async () => { await revealItemInDir(exportedPath); setExportedPath(null); }}
                className="px-3 py-1.5 rounded text-[12px] text-blue-400 hover:text-blue-300 transition-colors"
                style={{ background: "rgba(59,130,246,0.15)" }}
              >
                Open Folder
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const PRIVACY_POINTS = [
  { icon: Lock,                      color: "rgba(59,130,246,0.9)",   bg: "rgba(59,130,246,0.12)",   label: "All data stored locally",            desc: "Your tasks, reminders, and notes never leave your device." },
  { icon: WifiOff,                   color: "rgba(168,85,247,0.9)",   bg: "rgba(168,85,247,0.12)",   label: "No internet connection required",     desc: "Slate works fully offline. No server, no cloud sync." },
  { icon: BarChartHorizontalBig,     color: "rgba(239,68,68,0.9)",    bg: "rgba(239,68,68,0.12)",    label: "No tracking or analytics",            desc: "Zero telemetry. We have no idea how you use the app." },
  { icon: UserX,                     color: "rgba(249,115,22,0.9)",   bg: "rgba(249,115,22,0.12)",   label: "No account or login",                 desc: "Open the app and start using it. No sign-up required." },
  { icon: Database,                  color: "rgba(20,184,166,0.9)",   bg: "rgba(20,184,166,0.12)",   label: "SQLite database on your machine",     desc: "Data lives in ~/Library/Application Support/slate-db/. Yours to keep or delete." },
  { icon: Bell,                      color: "rgba(234,179,8,0.9)",    bg: "rgba(234,179,8,0.12)",    label: "Notifications only when you ask",     desc: "Permission is requested only when you create a reminder." },
  { icon: ShieldOff,                 color: "rgba(16,185,129,0.9)",   bg: "rgba(16,185,129,0.12)",   label: "No camera, microphone, or location",  desc: "Slate requests no sensitive system permissions." },
];

function PrivacyTab() {
  return (
    <div className="overflow-y-auto flex-1 py-4 px-4">
      <p className="px-1 pb-3 text-[11px] text-t4 select-none">Slate is built with privacy by default. No exceptions.</p>
      <div className="flex flex-col gap-2">
        {PRIVACY_POINTS.map((p) => {
          const Icon = p.icon;
          return (
            <div key={p.label} className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{ background: "var(--c-surface-1)" }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: p.bg }}>
                <Icon size={15} style={{ color: p.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-t1">{p.label}</p>
                <p className="text-[11px] text-t4 mt-0.5">{p.desc}</p>
              </div>
              <span className="text-green-400 text-[11px] font-semibold shrink-0">✓</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AboutTab() {
  return (
    <div className="overflow-y-auto flex-1 flex flex-col items-center justify-center gap-3 py-8 px-4">
      <img src={logoWithBg} alt="Slate" className="w-16 h-16" />
      <div className="text-center">
        <p className="text-[17px] font-semibold text-t1">Slate</p>
        <p className="text-[13px] text-t4 mt-0.5">Version 0.1.0</p>
      </div>
      <p className="text-[11px] text-t5 text-center mt-2">A minimal todo & notes app for macOS.<br />Built with Tauri + React.</p>
      <div className="flex gap-2 mt-2">
        <button
          onClick={() => openUrl("https://google.com")}
          className="px-4 py-1.5 rounded-lg text-[12px] text-t2 hover:text-t1 transition-colors"
          style={{ background: "var(--c-surface-2)", border: "1px solid var(--c-border)" }}
        >
          Visit Website
        </button>
        <button
          onClick={() => openUrl("mailto:kouiderayadwalid@gmail.com?subject=Slate%20Feedback")}
          className="px-4 py-1.5 rounded-lg text-[12px] text-t2 hover:text-t1 transition-colors"
          style={{ background: "var(--c-surface-2)", border: "1px solid var(--c-border)" }}
        >
          Send Feedback
        </button>
      </div>
      <button
        onClick={() => openUrl("https://github.com/walid1921/slate")}
        className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[12px] font-medium transition-colors mt-1"
        style={{ background: "rgba(250,204,21,0.12)", border: "1px solid rgba(250,204,21,0.25)", color: "rgb(250,204,21)" }}
      >
        <span style={{ opacity: 0.9 }}>⭐</span> Star on GitHub
      </button>
    </div>
  );
}

function GuideTab() {
  return (
    <div className="overflow-y-auto flex-1 py-4 px-4">
      {guideSections.map((section) => (
        <div key={section.title} className="mb-4">
          <p className="px-1 pb-1 text-[11px] text-t4 font-medium select-none">{section.title}</p>
          <div className="rounded overflow-hidden" style={{ background: "var(--c-surface-1)" }}>
            {section.items.map((item, i) => (
              <div key={i} className={`flex items-center gap-3 px-4 py-2 ${i < section.items.length - 1 ? "border-b border-s" : ""}`}>
                <div className="flex items-center gap-1 shrink-0 flex-wrap">
                  {item.keys.map((k, ki) => (
                    <span key={ki} className="flex items-center gap-1">
                      <kbd className="px-1.5 py-0.5 rounded text-[11px] font-mono text-t2" style={{ background: "var(--c-surface-2)", border: "1px solid var(--c-border)" }}>{k}</kbd>
                      {ki < item.keys.length - 1 && <span className="text-t5 text-[10px]">+</span>}
                    </span>
                  ))}
                </div>
                <span className="text-[12px] text-t3 ml-auto text-right">{item.desc}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
      <p className="text-center text-[11px] text-t5 pb-2 select-none">Type / in the main input to see all available commands</p>
    </div>
  );
}

type Tab = "general" | "data" | "guide" | "about" | "privacy";

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>("general");

  const tabs: { id: Tab; label: string }[] = [
    { id: "general", label: "General" },
    { id: "data", label: "Data" },
    { id: "guide", label: "Guide" },
    { id: "privacy", label: "Privacy" },
    { id: "about", label: "About" },
  ];

  return (
    <div className="view-animate flex flex-col flex-1 overflow-hidden">
      {/* Tab bar */}
      <div className="flex items-center justify-center gap-1 px-4 pt-3 pb-2 shrink-0 border-b border-s">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-1.5 rounded text-[12px] font-medium transition-colors ${tab === t.id ? "text-t1" : "text-t4 hover:text-t2"}`}
            style={tab === t.id ? { background: "var(--c-surface-3)" } : {}}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "general" && <GeneralTab />}
      {tab === "data" && <DataTab />}
      {tab === "guide" && <GuideTab />}
      {tab === "privacy" && <PrivacyTab />}
      {tab === "about" && <AboutTab />}
    </div>
  );
}
