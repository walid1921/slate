# Slate

A minimal, keyboard-first productivity app for macOS. Manage tasks across a Kanban board, set reminders, write notes, and log training entries — all from a single floating window that lives quietly in your workflow.

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

- **All data is stored locally** — everything lives in a SQLite database on your machine (`~/Library/Application Support/slate-db/`). Nothing is synced or uploaded.
- **No internet connection needed** — fully offline by default.
- **No account or login** — open and start using immediately.
- **No telemetry, analytics, or network requests** — Slate has no backend and never phones home.
- **Permissions requested:**
  - Notifications — used only when a reminder or deadline fires
  - Autostart — only if you enable it in Settings
  - No camera, microphone, location, contacts, or any other sensitive permissions

---

## Features

### Home Dashboard
- Quick-add a task by typing and pressing Enter — goes into the active category
- Slash commands: `/tm`, `/t`, `/rm`, `/nt`, `/i` (see Slash Commands below)
- Activity heatmap — visualize your daily output across the year
- Streak counter — current and longest active streaks
- Preview cards for Tasks, Reminders, Notes, and IHK records

### Tasks (Kanban Board)
- Tasks are organised into **categories** (tabs) and across three status columns: **To Do**, **In Progress**, **Done**
- Drag cards between columns or reorder within a column
- Click a card to open the task detail panel — edit title, description, deadline, and priority
- Set deadlines at creation (`/tm`) or later via the detail panel — live countdown shows days · hours · minutes · seconds
- Overdue tasks show a soft red background and "overdue · date time" label
- Priority levels: none / low / medium / high — colour-coded dot inline with the task name
- **Categories:** create, rename, recolour, reorder by dragging tabs, or delete — right-click any tab for a context menu
- Add tasks or clear columns directly from each column header
- Red dot on a category tab = one or more overdue tasks in that category

### Reminders
- Add with `/rm reminder text` — navigates to Reminders automatically
- Full-screen notification overlay when a reminder fires — dismiss or reschedule in one click
- Live status: upcoming (indigo dot), overdue (red dot), sent (grey dot)
- Inline editing for text and scheduled time
- Clear all sent reminders in one click

### Notes
- Add with `/nt title` — opens the editor immediately
- Split-pane view: collapsible sidebar + full editor
- Auto-saves after 500 ms
- Right-click a note in the sidebar to delete it

### IHK Training Log
- Structured weekly log for apprenticeship / training records (German IHK format)
- Add entries with `/i module ↵ entry text ↵` from anywhere in the app
- Organised by calendar week — drag entries to reorder within a week
- Mark weeks as submitted; fill a week from a previous one
- Module management: add company, school, or custom modules

### Trash
- Soft-delete for tasks, reminders, and notes — everything lands here first
- Tasks grouped by category — expand to review before deleting permanently
- Restore individual items or permanently delete a whole group

### Settings
- **Theme** — Dark or Light
- **Text size** — Small, Normal, Large
- **Window mode** — Default or Compact
- **Autostart** — Launch Slate at login
- **Data** — Export / import all data as JSON; open data folder in Finder
- **Guide** — Full in-app reference for all commands and shortcuts
- **Privacy** — Summary of all data and permission decisions

---

## Slash Commands

| Command | Action |
|---|---|
| `Type anything ↵` | Add a quick task to the active category |
| `/tm task name ↵` | Add a task with deadline — opens date & time picker |
| `/t category ↵ task ↵` | Add a task to a specific category |
| `/rm reminder text ↵` | Add a reminder |
| `/nt title ↵` | Create a new note and open it |
| `/i module ↵ entry ↵` | Add an IHK training entry |

---

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `⌥S` | Toggle Slate from anywhere on macOS |
| `⌥N` | Open quick-note window from anywhere |
| `↑ ↓` | Navigate command / category / module picker |
| `⌫ Delete` | Move focused task to trash |
| `Esc` | Close Slate (or clear search) |

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
| Drag & drop | @dnd-kit/core + @dnd-kit/sortable |

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
├── App.tsx                  # Main layout, views, kanban board, slash commands
├── store.ts                 # Todo + category store (Zustand + SQLite)
├── reminderStore.ts         # Reminder store + notification checker
├── notesStore.ts            # Notes store
├── settingsStore.ts         # Persisted settings (localStorage)
├── notifications.ts         # macOS notification permission + send
├── activity.ts              # Activity logging for heatmap + streak
├── db.ts                    # SQLite init & migrations
└── components/
    ├── ActivityHeatmap.tsx      # GitHub-style activity heatmap
    ├── ConfirmDialog.tsx        # Reusable delete confirmation dialog
    ├── DateTimeModal.tsx        # Due date / reminder time picker
    ├── FilterBar.tsx            # Filter + sort bar
    ├── IHKPage.tsx              # IHK training log (weeks, modules, entries)
    ├── NotesPage.tsx            # Notes split-pane editor
    ├── ReminderAlert.tsx        # Triggers the notification overlay window
    ├── ReminderOverlay.tsx      # Full-screen reminder notification UI
    ├── RemindersPage.tsx        # Reminders list with inline editing
    ├── SettingsPage.tsx         # Settings + Guide + Privacy + Data tabs
    └── Toast.tsx                # Transient feedback toasts
```

---

## License

MIT
