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

- **All data is stored locally** — everything lives in SQLite + on-disk image files on your machine. Nothing is synced or uploaded.
- **Offline by default** — no internet needed for any core feature.
- **No account or login** — open and start using immediately.
- **No telemetry, analytics, or network requests** — Slate has no backend.
- **AI features are opt-in.** They require an Anthropic API key in **Settings → General → AI Assistant**. When enabled, ✨ buttons send the relevant context (task text, IHK entries, etc.) to `api.anthropic.com` to generate output. Your API key is stored locally and is never included in exports.
- **Permissions requested:**
  - Notifications — used when a reminder fires, a deadline passes, or the timer auto-stops
  - Autostart — only if you enable it in Settings
  - No camera, microphone, location, contacts, or any other sensitive permissions

---

## Data & Recovery

Slate keeps **separate data folders per environment** — so dev mode can't touch your real data:

- **Production:** `~/Library/Application Support/slate-db/`
- **Development:** `~/Library/Application Support/slate-db-dev/`

Each folder contains `slate.db` (the SQLite database), `images/` (uploaded reference images stored as files, only paths in the DB), and `backups/` (auto-backup JSON snapshots if you enable the feature).

- **Auto-backup** — enable in **Settings → Data → Backup**. Writes a dated JSON snapshot to the `backups/` folder once per day on launch.
- **Manual backup** — **Settings → Data → Export** — produces a single JSON file containing every table (tasks, categories, reminders, notes, time logs, IHK entries + polished versions, dev checklist, images as base64). Save it somewhere outside `~/Library/` if you want it to survive an uninstall.
- **Restore** — **Settings → Data → Import** — replaces the current database from a JSON export. Optionally saves a one-shot backup of the current data before importing.
- **Fresh start** — quit Slate, delete the appropriate `slate-db*` folder, relaunch. A new empty database is created.

> ⚠ **Uninstaller tools like AppCleaner sweep the data folders** along with the app. **Export to outside `~/Library/` before uninstalling.**

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
- Click a card to open the **two-column task detail modal** — left side: Notes, Images, Subtasks (always open); right side: Created, Priority, Deadline, Reminder, Timer, Time Log
- Set deadlines at creation (`/tm`) or later via the detail panel — live countdown shows days · hours · minutes · seconds; deadline picker pre-fills and locks the task's category
- Overdue tasks show a soft red background and "overdue · date time" label
- Priority levels: none / low / medium / high — colour-coded dot inline with the task name
- **Subtasks** — toggle done, edit inline, drag to reorder; optional progress bar on the card
- **Images** — upload reference images; thumbnails grid with lightbox view, X to delete (with confirm). Stored as files on disk, only paths in the DB
- **Reminder integration** — "Set reminder" inside the task detail creates a reminder linked to the task and shows it in the task's Reminder section
- **Timer:** start, pause, finish, or extend sessions; all sessions are logged with start/end times. Total time can be shown on the card. See the Timer & Idle Detection section for auto-stop behaviour
- Creation date can be shown/hidden per task via the Eye icon in the detail panel
- **Categories:** create, rename, recolour, change icon, reorder by dragging tabs, or delete — right-click any tab for a context menu; each category has a searchable icon picker with 85+ Lucide icons
- Add tasks or clear columns directly from each column header
- Red dot on a category tab = one or more overdue tasks in that category

### Timer & Idle Detection
- One timer runs at a time — starting another blocks until the running one stops
- **Idle threshold** (Settings → General → Timer) — when no input is detected for longer than the threshold while a timer is running, a blur overlay asks: **Keep** the time, **Subtract** the idle minutes, or **Stop** the session at the moment you went idle
- **Display sleep / screen lock** — detected within 30 s; timer auto-stops at the last input moment. A blur overlay greets you on return with task info and a one-click "Start new session"
- **Mac sleep** (lid close, sleep schedule) — detected when polling resumes after a > 60 s gap; session is closed at the last poll before sleep so the recorded duration excludes the sleep period
- Each auto-stop also fires a macOS notification so you see it even when Slate is hidden
- Sessions can be edited or deleted manually from the task detail Time Log section

### Reminders
- Add with `/rm reminder text` — navigates to Reminders automatically
- Or set from inside a task detail — creates a reminder linked to the task, pre-filled with `⚠️ Ticket: {task name}`
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

### AI Features (opt-in)

Slate integrates with the Anthropic API via your own key. Sonnet 4.6 is the recommended default — typical cost for personal use is under $5/month across all features. Set up in **Settings → General → AI Assistant**.

- **✨ on the Home input bar** — describe a task in natural language; AI generates a title, description, priority, deadline, and 3-6 subtasks for review before creating
- **✨ in task detail → Subtasks** — first click breaks the task down; subsequent clicks open a refinement modal where you type what to change or add
- **✨ in task detail → Notes** — generates a markdown description when empty, using the task title and existing subtasks as context
- **✨ on each IHK week** — polishes all entries for the week into a German Berichtsheft document with one section per category (Betrieb/Schulung/Berufsschule). Saved per-week, regeneratable with a custom instruction. *"Teilnahme an täglichen Stand-ups"* is always appended to Betrieb when the week has any entries
- **✨ next to Dev → Add item** — generates checklist items tailored to the active Page + Category (e.g. Shopware → Backend produces Shopware-specific items, not generic ones). Existing items are sent as context so the AI doesn't duplicate them

### Trash
- Soft-delete for tasks, reminders, notes, and dev items — everything lands here first
- Tasks grouped by category; dev items grouped by page and category — expand to review before deleting permanently
- Restore individual items or permanently delete a whole group

### Settings

**General tab**
- **Theme** — Dark or Light
- **Text size** — Small, Normal, Large
- **Window mode** — Default or Compact
- **Autostart** — Launch Slate at login
- **Timer** — Idle threshold (3 / 5 / 10 / 15 / 30 min) + a short guide explaining the timer protection model
- **AI Assistant** — Anthropic API key + model picker (Haiku 4.5 / Sonnet 4.6 / Opus 4.8 / Fable 5)
- **Maintenance** — Copy a migration audit prompt for periodic schema / export / import verification

**Data tab**
- **Backup** — Auto-backup toggle + Export / Import buttons
- **Storage** — Open the active environment's data folder in Finder

**Guide tab** — Full in-app reference for slash commands, shortcuts, and every feature

**Privacy tab** — Summary of data storage and permission decisions

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
| UI | React 19 + TypeScript |
| Styling | Tailwind CSS v4 |
| Database | SQLite via `tauri-plugin-sql` |
| State | Zustand (with `persist` middleware for Settings) |
| Icons | lucide-react |
| Drag & drop | @dnd-kit/core + @dnd-kit/sortable |
| Markdown | react-markdown |
| AI (opt-in) | `@anthropic-ai/sdk` — Claude API, bring your own key |
| Native APIs | `CGEventSourceSecondsSinceLastEventType` (idle), `CGDisplayIsAsleep` (display state), `NSWorkspace` (window visibility) |

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

**Manual update (without the script):**

1. `pnpm tauri build`
2. Quit the running Slate app
3. Open Finder → Applications
4. Drag `src-tauri/target/release/bundle/macos/Slate.app` into Applications → click **Replace**

No need to delete the old app first — dragging over it and clicking Replace is enough.

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
