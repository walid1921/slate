# Slate

A minimal, keyboard-first productivity app for macOS. Manage tasks, set reminders, and write notes — all from a single floating window that lives quietly in your workflow.

Built with Tauri 2, React, TypeScript, SQLite, and Tailwind CSS v4.

---

## Demo

<!-- Screen recording coming soon -->

---

## Installation

1. Download the latest `Slate.app` from the [Releases](https://github.com/walid1921/slate/releases) page
2. Unzip if needed, then drag **Slate.app** into your **Applications** folder
3. Open Slate from your Applications folder or Spotlight

> **Tip:** If you can't drag it directly, press `⌘ Shift G` in Finder, type `/Applications`, and drop Slate.app there manually.

> **First launch:** macOS may say the app is from an unidentified developer. Go to **System Settings → Privacy & Security** and click **Open Anyway**.

---

## Privacy & Safety

- **All data is stored locally** — tasks, reminders, and notes live in a SQLite database on your machine (`~/Library/Application Support/slate-db/`). Nothing is synced or uploaded.
- **No internet connection needed** — everything runs locally, offline by default.
- **No account or login** — open the app and start using it immediately.
- **No accounts, no telemetry, no analytics, no network requests** — Slate has no backend and never phones home.
- **Permissions requested:**
  - Notifications — used only when a reminder fires
  - Autostart — only if you enable it in Settings
  - No camera, microphone, location, contacts, or any other sensitive permissions

---

## Features

### Home
- Type and press Enter to add a task instantly
- Slash commands: `/tm`, `/rm`, `/nt` to create tasks, reminders, or notes
- Preview cards at the bottom for Tasks, Reminders, and Notes
- Click any card to jump straight to that section

### Tasks
- Set deadlines with `/tm task name` — a live countdown shows months, days, hours, minutes, and seconds
- Inline editing by double-clicking any task
- Priority levels (none / low / medium / high) — click the dot to cycle through
- Drag and drop to reorder manually
- Filter by All / Active / Done — sort by manual order, due date, priority, or A–Z
- Done tasks can be pushed to the bottom or cleared to trash in one click

### Reminders
- Add a reminder with `/rm reminder text` — navigates to Reminders automatically
- Full-screen notification overlay when a reminder fires — dismiss or reschedule in one click
- Live status: upcoming (indigo dot), overdue (red dot), sent (grey dot)
- Inline editing for both text and scheduled time
- Filter by All / Upcoming / Sent — sort by time or A–Z
- Clear all sent reminders in one click

### Notes
- Add a note with `/nt title` — opens the editor immediately
- Split-pane view: collapsible sidebar + full editor
- Auto-saves after 500 ms
- Right-click a note in the sidebar to delete it

### Trash
- Soft-delete for tasks, reminders, and notes — everything lands here first
- Restore individual items or select multiple to wipe at once
- Back button returns to the page you came from

### Settings
- **Theme** — Dark or Light mode
- **Row density** — Compact, Normal, or Roomy
- **Dividers** — Soft lines between rows
- **Default priority** — Pre-assign a priority to new tasks
- **Default sort** — Set the initial sort order
- **Done tasks at bottom** — Visually separate completed work
- **Confirm before delete** — Optional confirmation dialog

---

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| Type anything + ↵ | Add a new task |
| `/tm task ↵` | Add task with deadline |
| `/rm text ↵` | Add a reminder |
| `/nt title ↵` | Create a new note |
| `⌥S` | Toggle Slate from anywhere on macOS |
| `⌥N` | Open quick-note window from anywhere |
| `↑ ↓` | Navigate tasks |
| `Space` | Toggle task done / undone |
| `⌫ Delete` | Move focused task to trash |
| `Esc` | Close Slate |
| Double-click text | Edit inline |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Desktop shell | [Tauri 2](https://tauri.app) |
| UI | React 18 + TypeScript |
| Styling | Tailwind CSS v4 |
| Database | SQLite via `tauri-plugin-sql` |
| State | Zustand |
| Icons | lucide-react |
| Drag & drop | @dnd-kit |

---

## Development

### Prerequisites

- [Rust](https://rustup.rs)
- [Node.js](https://nodejs.org) 18+
- macOS (required for vibrancy / `macOSPrivateApi`)

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
├── App.tsx              # Main layout, routing, keyboard handler
├── store.ts             # Todo store (Zustand + SQLite)
├── reminderStore.ts     # Reminder store + notification checker
├── notesStore.ts        # Notes store
├── settingsStore.ts     # Persisted settings (localStorage)
├── notifications.ts     # macOS notification permission + send
├── db.ts                # SQLite init & migrations
└── components/
    ├── FilterBar.tsx        # Filter + sort bar (todos & reminders)
    ├── RemindersPage.tsx    # Reminders list with inline editing
    ├── NotesPage.tsx        # Notes split-pane editor
    ├── WeatherWidget.tsx    # 7-day weather forecast card
    ├── ReminderAlert.tsx    # Triggers the notification overlay window
    ├── ReminderOverlay.tsx  # Full-screen reminder notification UI
    ├── SettingsPage.tsx     # All settings
    ├── GuidePage.tsx        # Keyboard shortcut reference
    ├── DateTimeModal.tsx    # Due date / reminder time picker
    └── ConfirmDialog.tsx    # Delete confirmation dialog
```

---

## License

MIT
