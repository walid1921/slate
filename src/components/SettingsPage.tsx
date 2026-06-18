import { useEffect, useState } from "react";
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

const guideSections = [
  {
    title: "Adding Tasks",
    items: [
      { keys: ["Type anything", "↵"], desc: "Add a new task" },
      { keys: ["/tm", "task name", "↵"], desc: "Add a task with a deadline — picks date & time" },
      { keys: ["/rm", "reminder text", "↵"], desc: "Add a reminder — navigates to Reminders after" },
      { keys: ["/nt", "title", "↵"], desc: "Create a new note — opens it immediately" },
    ],
  },
  {
    title: "Keyboard Shortcuts",
    items: [
      { keys: ["⌥S"], desc: "Toggle Slate from anywhere" },
      { keys: ["⌥N"], desc: "Open quick-note window from anywhere" },
      { keys: ["Esc"], desc: "Close Slate (or clear search if text is entered)" },
      { keys: ["↑ ↓"], desc: "Navigate through the list" },
      { keys: ["Space"], desc: "Toggle task done / undone" },
      { keys: ["⌫ Delete"], desc: "Move focused item to trash" },
    ],
  },
  {
    title: "Task Actions",
    items: [
      { keys: ["Right-click task"], desc: "Open context menu — edit text, set priority, delete" },
      { keys: ["Double-click text"], desc: "Edit task text inline — Enter to save, Esc to cancel" },
      { keys: ["Drag ⠿"], desc: "Drag handle to reorder tasks manually" },
    ],
  },
  {
    title: "Search & Filter",
    items: [
      { keys: ["Type to search"], desc: "Input doubles as a live search filter" },
      { keys: ["✕ button"], desc: "Clear search and return to full list" },
      { keys: ["Filter bar"], desc: "Filter by All / Active / Done" },
      { keys: ["Sort menu"], desc: "Sort by manual order, due date, priority, or A–Z" },
    ],
  },
  {
    title: "Due Dates & Notifications",
    items: [
      { keys: ["/tm", "task", "↵"], desc: "Set deadline via date & time picker" },
      { keys: ["Countdown"], desc: "Shows months · days · hours · minutes · seconds live" },
      { keys: ["Red label"], desc: "Task is overdue" },
      { keys: ["Red dot on ✓ icon"], desc: "A deadline notification fired — click the tab to dismiss" },
    ],
  },
  {
    title: "Reminders",
    items: [
      { keys: ["Footer → ⏱"], desc: "View all upcoming and sent reminders" },
      { keys: ["Right-click reminder"], desc: "Send now, edit text/time, or delete" },
      { keys: ["Blue dot"], desc: "Upcoming reminder" },
      { keys: ["Red dot on reminder text"], desc: "Overdue — notification hasn't fired yet" },
      { keys: ["Grey dot · sent"], desc: "Notification already fired" },
      { keys: ["Red dot on ⏱ icon"], desc: "A reminder notification fired — click the tab to dismiss" },
    ],
  },
  {
    title: "Notes",
    items: [
      { keys: ["Footer → 📄"], desc: "Open notes — editor with collapsible sidebar" },
      { keys: ["⊞ button"], desc: "Toggle sidebar to browse all notes" },
      { keys: ["+ button"], desc: "Create a new note" },
      { keys: ["Right-click note"], desc: "Delete note from sidebar" },
      { keys: ["Auto-save"], desc: "Notes save automatically after 500ms" },
    ],
  },
  {
    title: "Deleted",
    items: [
      { keys: ["Footer → 🗑"], desc: "View all deleted tasks, reminders and notes" },
      { keys: ["↺"], desc: "Restore an item back to its list" },
      { keys: ["✕"], desc: "Permanently delete an item" },
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
  const { theme, textSize, windowMode, set, reset } = useSettingsStore();
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

      <Section title="Data">
        <Divider />
        <SettingRow label="Reset all settings" hint="Restore defaults">
          <button
            onClick={reset}
            className="px-3 py-1 rounded text-[11px] text-red-400/60 hover:text-red-400 transition-colors"
            style={{ background: "var(--c-surface-2)" }}
          >
            Reset
          </button>
        </SettingRow>
      </Section>
    </div>
  );
}

function DataTab() {
  const loadTodos = useTodoStore((s) => s.load);
  const loadReminders = useReminderStore((s) => s.load);
  const loadNotes = useNotesStore((s) => s.load);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importFile, setImportFile] = useState<string | null>(null);
  const [importConfirm, setImportConfirm] = useState(false);
  const [status, setStatus] = useState<{ msg: string; ok: boolean } | null>(null);

  const showStatus = (msg: string, ok: boolean) => {
    setStatus({ msg, ok });
    setTimeout(() => setStatus(null), 3000);
  };

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
      const payload = JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), todos, reminders, notes }, null, 2);
      const d = new Date(); const today = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}-${String(d.getHours()).padStart(2,"0")}-${String(d.getMinutes()).padStart(2,"0")}`;
      const dir = await appDataDir();
      await writeTextFile(await join(dir, `slate-${today}.json`), payload);
      showStatus("Exported successfully", true);
    } catch (e) {
      showStatus("Export failed", false);
    } finally {
      setExporting(false);
    }
  };

  const handlePickImport = async () => {
    const path = await withDialogFocus(() => openDialog({ filters: [{ name: "JSON", extensions: ["json"] }], multiple: false }));
    if (typeof path === "string") { setImportFile(path); setImportConfirm(true); }
  };

  const handleImport = async () => {
    if (!importFile) return;
    try {
      setImporting(true);
      setImportConfirm(false);
      // Auto-backup current data before replacing
      const db = await getDb();
      const backupTodos = await db.select("SELECT * FROM todos");
      const backupReminders = await db.select("SELECT * FROM reminders");
      const backupNotes = await db.select("SELECT * FROM notes");
      const backupPayload = JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), todos: backupTodos, reminders: backupReminders, notes: backupNotes }, null, 2);
      const bd = new Date(); const backupDate = `${bd.getFullYear()}-${String(bd.getMonth()+1).padStart(2,"0")}-${String(bd.getDate()).padStart(2,"0")}-${String(bd.getHours()).padStart(2,"0")}-${String(bd.getMinutes()).padStart(2,"0")}`;
      const dir = await appDataDir();
      await writeTextFile(await join(dir, `slate-backup-${backupDate}.json`), backupPayload);
      const raw = await readTextFile(importFile);
      const data = JSON.parse(raw);
      if (data.version !== 1 || !data.todos || !data.reminders || !data.notes) throw new Error("Invalid file");
      await db.execute("DELETE FROM todos");
      await db.execute("DELETE FROM reminders");
      await db.execute("DELETE FROM notes");
      for (const t of data.todos) {
        await db.execute(
          "INSERT INTO todos (id, text, done, priority, due_date, due_time, deadline_notified, description, position, created_at, deleted_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
          [t.id, t.text, t.done, t.priority, t.due_date, t.due_time, t.deadline_notified, t.description ?? "", t.position, t.created_at, t.deleted_at ?? null]
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
      await Promise.all([loadTodos(), loadReminders(), loadNotes()]);
      showStatus("Data imported successfully", true);
    } catch {
      showStatus("Import failed — invalid file", false);
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
    <div className="overflow-y-auto flex-1 py-4 px-4">
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

      {status && (
        <p className={`text-center text-[11px] mt-2 ${status.ok ? "text-green-400" : "text-red-400"}`}>{status.msg}</p>
      )}

      {/* Import confirm modal */}
      {importConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="dropdown rounded-lg p-5 max-w-xs w-full mx-4 flex flex-col gap-3">
            <p className="text-[14px] font-semibold text-t1">Import new data?</p>
            <p className="text-[12px] text-t3 leading-relaxed">
              Your current data will be backed up automatically before importing. You'll find the backup in your data folder.
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
                onClick={handleImport}
                className="px-3 py-1.5 rounded text-[12px] text-blue-400 hover:text-blue-300 transition-colors"
                style={{ background: "rgba(59,130,246,0.15)" }}
              >
                Backup & Import
              </button>
            </div>
          </div>
        </div>
      )}
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

type Tab = "general" | "data" | "guide" | "about";

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>("general");

  const tabs: { id: Tab; label: string }[] = [
    { id: "general", label: "General" },
    { id: "data", label: "Data" },
    { id: "guide", label: "Guide" },
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
      {tab === "about" && <AboutTab />}
    </div>
  );
}
