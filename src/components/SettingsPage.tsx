import { useSettingsStore, Theme } from "../settingsStore";

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



function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div
      className="flex gap-0.5 p-0.5 rounded-lg"
      style={{ background: "var(--c-surface-2)" }}
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`flex-1 px-2 py-0.5 rounded-md text-[11px] transition-colors ${
            value === opt.value ? "text-t1" : "text-t4 hover:text-t3"
          }`}
          style={value === opt.value ? { background: "var(--c-surface-3)" } : {}}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
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
    <div className="mb-4">
      <p className="px-4 pb-1.5 text-[10px] text-t4 uppercase tracking-widest select-none">{title}</p>
      <div className="rounded-xl overflow-hidden mx-1" style={{ background: "var(--c-surface-1)" }}>
        {children}
      </div>
    </div>
  );
}

function Divider() {
  return <div className="h-px mx-4" style={{ background: "var(--c-border-subtle)" }} />;
}

export default function SettingsPage() {
  const { theme, set, reset } = useSettingsStore();

  return (
    <div className="view-animate overflow-y-auto flex-1 py-3">
      <Section title="Appearance">
        <Row label="Theme" hint="Switch between dark and light appearance">
          <SegmentedControl<Theme>
            options={[
              { value: "dark", label: "Dark" },
              { value: "light", label: "Light" },
            ]}
            value={theme}
            onChange={(v) => set("theme", v)}
          />
        </Row>
      </Section>

      <Section title="Data">
        <Divider />
        <Row label="Reset all settings" hint="Restore defaults">
          <button
            onClick={reset}
            className="px-3 py-1 rounded-md text-[11px] text-red-400/60 hover:text-red-400 transition-colors"
            style={{ background: "var(--c-surface-2)" }}
          >
            Reset
          </button>
        </Row>
      </Section>

      <div className="mb-4">
        <p className="px-4 pb-1.5 text-[10px] text-t4 uppercase tracking-widest select-none">Guide</p>
        {guideSections.map((section) => (
          <div key={section.title} className="mb-3">
            <p className="px-4 pb-1 text-[10px] text-t5 uppercase tracking-widest select-none">{section.title}</p>
            <div className="rounded-xl overflow-hidden mx-1" style={{ background: "var(--c-surface-1)" }}>
              {section.items.map((item, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-3 px-4 py-2 ${i < section.items.length - 1 ? "border-b border-s" : ""}`}
                >
                  <div className="flex items-center gap-1 shrink-0 flex-wrap">
                    {item.keys.map((k, ki) => (
                      <span key={ki} className="flex items-center gap-1">
                        <kbd
                          className="px-1.5 py-0.5 rounded text-[11px] font-mono text-t2"
                          style={{ background: "var(--c-surface-2)", border: "1px solid var(--c-border)" }}
                        >
                          {k}
                        </kbd>
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
        <p className="text-center text-[11px] text-t5 pt-1 pb-1 select-none">Type / in the main input to see all available commands</p>
      </div>

      <p className="text-center text-[10px] text-t6 pb-2 select-none">Slate · settings are saved locally</p>
    </div>
  );
}
