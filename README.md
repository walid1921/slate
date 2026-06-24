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

## Data & Recovery

Slate's SQLite database **persists across builds and reinstalls** — it lives at `~/Library/Application Support/slate-db/` and is never wiped automatically.

- **After importing data or if the app shows a loading spinner on launch:** re-import your JSON backup from **Settings → Data → Import**. The app now recovers gracefully from load errors and won't get stuck.
- **To start with a completely fresh database:** quit Slate, delete `~/Library/Application Support/slate-db/`, then relaunch. The app will create a new empty database on next start.
- **To back up your data:** use **Settings → Data → Export** — this produces a single JSON file containing all tasks, categories, reminders, notes, time logs, and IHK entries.

---

## Features

### Home Dashboard
- Quick-add a task by typing and pressing Enter — goes into the active category
- Slash commands: `/tm`, `/t`, `/rm`, `/nt`, `/i` (see Slash Commands below)
- Activity heatmap — shows today's action count; darker squares = more activity that day
- Counted actions: opening the app, adding/editing tasks (text, priority, deadline, description, status), adding/rescheduling/sending reminders, creating/editing notes, adding/editing IHK entries, marking a week as sent, starting or extending a task timer
- **Clockify card** — focus widget beside the heatmap; header shows category icon + task name with a dropdown to switch tasks; search icon expands to a full-width filter bar; card body shows priority badge, subtask progress bar, 3-line description, created date, and deadline; Play / Pause / Done controls with per-session time logging; card turns red when overdue, green when done
- Preview cards for Tasks, Reminders, Notes, and IHK records

### Tasks (Kanban Board)
- Tasks are organised into **categories** (tabs) and across three status columns: **To Do**, **In Progress**, **Done**
- Drag cards between columns or reorder within a column
- Click a card to open the task detail panel — edit title, description, deadline, and priority
- Set deadlines at creation (`/tm`) or later via the detail panel — live countdown shows days · hours · minutes · seconds; deadline picker pre-fills and locks the task's category
- Overdue tasks show a soft red background and "overdue · date time" label
- Priority levels: none / low / medium / high — colour-coded dot inline with the task name
- **Timer:** each task can have a timer — show/hide the timer controls on the card via the Eye icon in the detail panel; start, pause, finish, or extend sessions; all sessions are logged with start/end times and shown as a collapsible time log in the detail panel; total time and session count are tracked
- Creation date can be shown/hidden per task via the Eye icon in the detail panel
- **Categories:** create, rename, recolour, change icon, reorder by dragging tabs, or delete — right-click any tab for a context menu; each category has a searchable icon picker with 85+ Lucide icons
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

### Dev Checklist
- Pre-loaded checklist covering 11 areas: Design, Frontend, Backend, Database, Security, DevOps, Testing, Performance, Accessibility, E-Commerce, and SEO — 114 items in total
- Organised into **pages** (top bar) and **categories** per page — each with a custom name, colour, and icon
- Tick items off, edit text and description, set priority, drag to reorder
- Filter items by priority: All / Low / Medium / High
- **Send to Tasks** — copies the active category to the Tasks page as a new category, preserving the icon
- **Reset (↺)** — wipes all custom content and restores the full default checklist
- Deleted dev items are recoverable from the Deleted view, grouped by page and category

### Trash
- Soft-delete for tasks, reminders, notes, and dev items — everything lands here first
- Tasks grouped by category; dev items grouped by page and category — expand to review before deleting permanently
- Restore individual items or permanently delete a whole group

### Settings
- **Theme** — Dark or Light
- **Text size** — Small, Normal, Large
- **Window mode** — Default or Compact
- **Autostart** — Launch Slate at login
- **Data** — Export / import all data as JSON (tasks, categories, reminders, notes, time logs, IHK entries, dev checklist); open data folder in Finder
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

### Deploy (local)

For day-to-day development on your own machine, `pnpm deploy` builds the app, replaces `/Applications/Slate.app` with the new build, and relaunches it — closest equivalent to a "push to production" for a desktop app.

```bash
pnpm deploy
```

Under the hood, `scripts/deploy.sh`:

1. Runs `pnpm tauri build`
2. Quits the running `Slate` (so SQLite checkpoints the WAL into `slate.db`)
3. Snapshots the prod data folder to `~/Library/Application Support/slate-db.backup-<timestamp>/` for rollback
4. Replaces `/Applications/Slate.app` with the new build
5. Reopens it

**Rolling back a bad deploy:**

```bash
rm -rf ~/Library/Application\ Support/slate-db
mv ~/Library/Application\ Support/slate-db.backup-<timestamp> ~/Library/Application\ Support/slate-db
```

Snapshots accumulate — clean up old ones manually when you're confident a deploy is healthy.

**Dev vs prod data isolation:** dev mode (`pnpm tauri dev`) writes to `~/Library/Application Support/slate-db-dev/`; the production app uses `~/Library/Application Support/slate-db/`. They never share a database, so daily development can't touch your real data.

---

## Project Structure

```
src/
├── App.tsx                  # Main layout, views, kanban board, slash commands
├── store.ts                 # Todo + category store (Zustand + SQLite)
├── devStore.ts              # Dev checklist store (items, categories, sections)
├── reminderStore.ts         # Reminder store + notification checker
├── notesStore.ts            # Notes store
├── settingsStore.ts         # Persisted settings (localStorage)
├── notifications.ts         # macOS notification permission + send
├── activity.ts              # Activity logging for heatmap
├── timerStore.ts            # Task session timer store (start/stop/finish, session log)
├── db.ts                    # SQLite init, migrations & dev seed data
└── components/
    ├── ActivityHeatmap.tsx      # GitHub-style activity heatmap
    ├── CategoryModal.tsx        # Shared add/edit category modal (name, color, icon)
    ├── ConfirmDialog.tsx        # Reusable delete confirmation dialog
    ├── DateTimeModal.tsx        # Due date / reminder time picker
    ├── DevPage.tsx              # Dev checklist — pages, categories, items, reset
    ├── FilterBar.tsx            # Filter + sort bar
    ├── IconPicker.tsx           # Searchable icon picker + IconDisplay (85+ Lucide icons)
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
