const sections = [
  {
    title: "Home",
    items: [
      { keys: ["Type anything", "↵"], desc: "Add a new task" },
      { keys: ["/tm", "task name", "↵"], desc: "Add a task with a deadline — picks date & time" },
      { keys: ["/rm", "reminder text", "↵"], desc: "Add a reminder — navigates to Reminders after" },
      { keys: ["/nt", "title", "↵"], desc: "Create a new note — opens it immediately" },
      { keys: ["Preview cards"], desc: "Click Tasks, Reminders, Notes or Weather cards to navigate" },
    ],
  },
  {
    title: "Keyboard Shortcuts",
    items: [
      { keys: ["⌥S"], desc: "Toggle Slate from anywhere on your Mac" },
      { keys: ["⌥N"], desc: "Open quick-note window from anywhere" },
      { keys: ["↑ ↓"], desc: "Navigate through tasks" },
      { keys: ["Space"], desc: "Toggle task done / undone" },
      { keys: ["⌫ Delete"], desc: "Move focused task to trash" },
      { keys: ["Esc"], desc: "Close Slate" },
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
      { keys: ["Filter bar"], desc: "Filter by All / Active / Done — sort by order, due, priority, A–Z" },
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
      { keys: ["Indigo dot"], desc: "Upcoming reminder" },
      { keys: ["Red dot"], desc: "Overdue — notification missed while app was closed" },
      { keys: ["Grey dot · sent"], desc: "Notification already fired" },
      { keys: ["Notification overlay"], desc: "Full-screen alert when a reminder fires — Done or Reschedule" },
    ],
  },
  {
    title: "Notes",
    items: [
      { keys: ["Footer → 📄"], desc: "Open notes — split view with sidebar and editor" },
      { keys: ["+ button"], desc: "Create a new note" },
      { keys: ["Click note"], desc: "Select and edit title or content" },
      { keys: ["Sidebar toggle"], desc: "Hide or show the notes sidebar" },
      { keys: ["Auto-save"], desc: "Notes save automatically after 500ms" },
      { keys: ["Right-click note"], desc: "Context menu to delete the note" },
    ],
  },
  {
    title: "Trash",
    items: [
      { keys: ["Footer → 🗑"], desc: "View deleted tasks, reminders, and notes" },
      { keys: ["↺"], desc: "Restore an item back" },
      { keys: ["✕"], desc: "Permanently delete an item" },
      { keys: ["Select all → Delete"], desc: "Wipe the entire deleted list at once" },
      { keys: ["Back button"], desc: "Returns to the page you came from" },
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
