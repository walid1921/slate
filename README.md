# Slate

A minimal, keyboard-first productivity app for macOS. Manage tasks, set reminders, and write notes — all from a single floating window that lives quietly in your workflow.

Built with Tauri 2, React, TypeScript, SQLite, and Tailwind CSS v4.

---

## Features

### Tasks
- Add tasks by typing and pressing Enter
- Set deadlines with `/tm task name` — a live countdown shows months, days, hours, minutes, and seconds until due
- Inline editing by double-clicking any task
- Priority levels (none / low / medium / high) — click the dot to cycle through
- Drag and drop to reorder manually
- Filter by All / Active / Done — sort by manual order, due date, priority, or A–Z
- List and cards view
- Done tasks can be pushed to the bottom or cleared to trash in one click

### Reminders
- Add a reminder with `/rm reminder text` — navigates to the Reminders page automatically
- Live status: upcoming (blue), overdue (red), sent (gray)
- Inline editing for both text and time
- Filter by All / Upcoming / Sent — sort by time or A–Z
- List and cards view
- Clear all sent reminders in one click

### Notes
- Add a note with `/nt title` — opens the editor immediately
- Split-pane view: collapsible sidebar + full editor
- Auto-saves after 500 ms
- Sort by last edited, created date, or A–Z

### Deleted
- Soft-delete: all removed tasks land here
- Restore individual tasks or select multiple to wipe at once

### Settings
- **Theme** — Dark or Light mode
- **Row density** — Compact, Normal, or Roomy
- **Dividers** — Soft lines between tasks
- **Default priority** — Pre-assign a priority to new tasks
- **Default sort** — Set the initial sort order
- **Done tasks at bottom** — Visually separate completed work
- **Confirm before delete** — Optional confirmation dialog
- **Reminder check interval** — 30 s, 1 min, or 5 min

---

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| Type anything + ↵ | Add a new task |
| `/tm task ↵` | Add task with a deadline |
| `/rm text ↵` | Add a reminder |
| `/nt title ↵` | Create a new note |
| `↑ ↓` | Navigate tasks |
| `Space` | Toggle task done / undone |
| `⌫ Delete` | Move focused task to trash |
| `Esc` | Close Slate |
| `⌥S` | Toggle Slate from anywhere |
| Double-click text | Edit inline |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Desktop shell | [Tauri 2](https://tauri.app) |
| UI | React 18 + TypeScript |
| Styling | Tailwind CSS v4 |
| Database | SQLite via `tauri-plugin-sql` |
| State | Zustand (with persistence) |
| Icons | lucide-react |
| Drag & drop | @dnd-kit |

---

## Development

### Prerequisites

- [Rust](https://rustup.rs)
- [Node.js](https://nodejs.org) 18+
- macOS (required for `macOSPrivateApi` vibrancy)

### Getting started

```bash
npm install
npm run tauri dev
```

### Build

```bash
npm run tauri build
```

---

## Project Structure

```
src/
├── App.tsx              # Main view, keyboard handler, all top-level logic
├── store.ts             # Todo store (Zustand + SQLite)
├── reminderStore.ts     # Reminder store
├── notesStore.ts        # Notes store
├── settingsStore.ts     # Persisted settings (localStorage)
├── notifications.ts     # macOS notification scheduling
├── db.ts                # SQLite init & migrations
└── components/
    ├── FilterBar.tsx     # Filter + sort + view toggle bar
    ├── RemindersPage.tsx # Reminders list/cards with inline editing
    ├── NotesPage.tsx     # Notes split-pane editor
    ├── SettingsPage.tsx  # All settings
    ├── GuidePage.tsx     # Keyboard shortcut reference
    ├── DateTimeModal.tsx # Due date / reminder time picker
    └── ConfirmDialog.tsx # Delete confirmation dialog
```

---

## License

MIT
