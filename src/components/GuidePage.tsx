const sections = [
  {
    title: "Adding Tasks",
    items: [
      { keys: ["Type anything", "↵"], desc: "Add a new task" },
      { keys: ["/tm", "task name", "↵"], desc: "Add a task with a deadline — picks date & time" },
      { keys: ["/rm", "reminder text", "↵"], desc: "Add a standalone reminder with notification" },
      { keys: ["/nt", "title", "↵"], desc: "Create a new note and open it immediately" },
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
      { keys: ["Hover → ●"], desc: "Click dot to cycle priority: none → low → medium → high" },
      { keys: ["Hover → 📅"], desc: "Set or change due date" },
      { keys: ["Hover → ✕"], desc: "Move task to trash" },
      { keys: ["Drag ⠿"], desc: "Drag handle to reorder tasks" },
    ],
  },
  {
    title: "Search & Filter",
    items: [
      { keys: ["Type to search"], desc: "Input doubles as a live search filter" },
      { keys: ["✕ button"], desc: "Clear search and return to full list" },
    ],
  },
  {
    title: "Trash",
    items: [
      { keys: ["Footer → Trash"], desc: "View all deleted tasks" },
      { keys: ["↺"], desc: "Restore a task back to the list" },
      { keys: ["✕"], desc: "Permanently delete a task" },
      { keys: ["Select all → Delete"], desc: "Wipe the entire trash at once" },
    ],
  },
  {
    title: "Reminders",
    items: [
      { keys: ["Footer → Reminders"], desc: "View all upcoming and sent reminders" },
      { keys: ["Blue dot"], desc: "Upcoming reminder" },
      { keys: ["Red dot"], desc: "Overdue reminder" },
      { keys: ["✕"], desc: "Delete a reminder" },
    ],
  },
];

export default function GuidePage() {
  return (
    <div className="overflow-y-auto flex-1 py-3 px-3">
      {sections.map((section) => (
        <div key={section.title} className="mb-5">
          <p className="px-2 pb-1.5 text-[10px] text-white/30 uppercase tracking-widest select-none">
            {section.title}
          </p>
          <div className="rounded-xl overflow-hidden" style={{ background: "rgba(255,255,255,0.04)" }}>
            {section.items.map((item, i) => (
              <div
                key={i}
                className={`flex items-center gap-3 px-4 py-2.5 ${
                  i < section.items.length - 1 ? "border-b border-white/[0.05]" : ""
                }`}
              >
                <div className="flex items-center gap-1 shrink-0 flex-wrap">
                  {item.keys.map((k, ki) => (
                    <span key={ki} className="flex items-center gap-1">
                      <kbd
                        className="px-1.5 py-0.5 rounded text-[11px] font-mono text-white/60"
                        style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)" }}
                      >
                        {k}
                      </kbd>
                      {ki < item.keys.length - 1 && (
                        <span className="text-white/20 text-[10px]">+</span>
                      )}
                    </span>
                  ))}
                </div>
                <span className="text-[12px] text-white/45 ml-auto text-right">{item.desc}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
      <p className="text-center text-[11px] text-white/15 pb-2 select-none">
        Type / in the main input to see available commands
      </p>
    </div>
  );
}
