const sections = [
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
    title: "Keyboard Navigation",
    items: [
      { keys: ["↑ ↓"], desc: "Navigate through tasks" },
      { keys: ["Space"], desc: "Toggle task done / undone" },
      { keys: ["⌫ Delete"], desc: "Move focused task to trash" },
      { keys: ["Esc"], desc: "Close Slate" },
      { keys: ["⌥S"], desc: "Toggle Slate from anywhere" },
    ],
  },
  {
    title: "Task Actions",
    items: [
      { keys: ["Double-click text"], desc: "Edit task text inline — Enter to save, Esc to cancel" },
      { keys: ["Hover → ●"], desc: "Click dot to cycle priority: none → low → medium → high" },
      { keys: ["Hover → 📅"], desc: "Set or change due date" },
      { keys: ["Hover → ✕"], desc: "Move task to trash" },
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
    title: "Due Dates & Countdown",
    items: [
      { keys: ["/tm", "task", "↵"], desc: "Set deadline via date & time picker" },
      { keys: ["Countdown"], desc: "Shows months · days · hours · minutes · seconds live" },
      { keys: ["Red label"], desc: "Task is overdue" },
    ],
  },
  {
    title: "Reminders",
    items: [
      { keys: ["Footer → ⏱"], desc: "View all upcoming and sent reminders" },
      { keys: ["Double-click text"], desc: "Edit reminder text inline" },
      { keys: ["Double-click time"], desc: "Edit the reminder date and time inline" },
      { keys: ["Filter bar"], desc: "Filter by All / Upcoming / Sent — sort by time or A–Z" },
      { keys: ["Blue dot"], desc: "Upcoming reminder" },
      { keys: ["Red dot"], desc: "Overdue — notification hasn't fired yet" },
      { keys: ["Grey dot · sent"], desc: "Notification already fired" },
    ],
  },
  {
    title: "Notes",
    items: [
      { keys: ["Footer → 📄"], desc: "Open notes — split view with list and editor" },
      { keys: ["+ button"], desc: "Create a new note" },
      { keys: ["Click note"], desc: "Select and edit title or content" },
      { keys: ["Auto-save"], desc: "Notes save automatically after 500ms" },
      { keys: ["Sort menu"], desc: "Sort by last edited, created, or A–Z" },
    ],
  },
  {
    title: "Deleted",
    items: [
      { keys: ["Footer → 🗑"], desc: "View all deleted tasks" },
      { keys: ["↺"], desc: "Restore a task back to the list" },
      { keys: ["✕"], desc: "Permanently delete a task" },
      { keys: ["Select all → Delete"], desc: "Wipe the entire deleted list at once" },
    ],
  },
];

export default function GuidePage() {
  return (
    <div className="overflow-y-auto flex-1 py-3 px-3">
      {sections.map((section) => (
        <div key={section.title} className="mb-5">
          <p className="px-2 pb-1.5 text-[10px] text-t4 uppercase tracking-widest select-none">
            {section.title}
          </p>
          <div className="rounded-xl overflow-hidden" style={{ background: "var(--c-surface-1)" }}>
            {section.items.map((item, i) => (
              <div
                key={i}
                className={`flex items-center gap-3 px-4 py-2.5 ${
                  i < section.items.length - 1 ? "border-b border-s" : ""
                }`}
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
                      {ki < item.keys.length - 1 && (
                        <span className="text-t5 text-[10px]">+</span>
                      )}
                    </span>
                  ))}
                </div>
                <span className="text-[12px] text-t3 ml-auto text-right">{item.desc}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
      <p className="text-center text-[11px] text-t6 pb-2 select-none">
        Type / in the main input to see all available commands
      </p>
    </div>
  );
}
