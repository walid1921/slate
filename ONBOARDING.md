# Slate — Project Onboarding

## What is Slate?

A macOS desktop productivity app built with **Tauri 2** (Rust + WKWebView), **React + TypeScript**, **Tailwind CSS v4**, and **Zustand**. Data is persisted in SQLite via `tauri-plugin-sql`. Drag-and-drop uses `@dnd-kit`.

---

## Stack at a Glance

| Layer | Tech |
|---|---|
| Desktop shell | Tauri 2 (Rust) |
| UI | React + TypeScript + Tailwind CSS v4 |
| State | Zustand (`src/store.ts`, `src/ihkStore.ts`) |
| DB | SQLite via `tauri-plugin-sql` (`src/db.ts`) |
| DnD | `@dnd-kit/core` + `@dnd-kit/sortable` |

---

## Key Files

- `src/App.tsx` — entire UI (main view, kanban, trash, settings, modals, tooltips)
- `src/store.ts` — todos, categories, trash state + all DB mutations
- `src/ihkStore.ts` — IHK journal entries + modules
- `src/db.ts` — SQLite schema + migrations (all via `IF NOT EXISTS` / `.catch(() => {})`)
- `src/components/ConfirmDialog.tsx` — shared confirm modal (`fixed inset-0, zIndex 100`)
- `src/components/IHKPage.tsx` — IHK weekly journal view

---

## Data Model

### Todos
`id, text, done, priority, due_date, due_time, deadline_notified, position, created_at, deleted_at, description, category_id, status`

- `status: 'todo' | 'in_progress' | 'done'` — synced with `done` boolean
- Soft-deleted via `deleted_at`

### Categories (`task_categories`)
`id, name, color (RGB string e.g. "59,130,246"), position`

- `id=1` is always **General** (protected, cannot be deleted)
- `PRESET_COLORS` — 18 RGB strings exported from `store.ts`

### Deleted Categories (`deleted_categories`)
Saved on category delete so trash view can show real names.

---

## Architecture Notes

### Scale Transform
The root app container uses `transform: scale(textScale)` with `transformOrigin: top left` for text size settings. This breaks `position: fixed` for anything rendered inside it — those elements become positioned relative to the scaled container, not the viewport.

**Rule:** Any overlay that must float above everything (tooltips, context menus) must be rendered **outside** the scaled container div. They are currently placed just before the outer closing `</div>` in `App.tsx`.

### Tooltip System
`Tooltip` is a thin wrapper — on hover it fires coordinates into a global singleton (`_setGlobalTooltip`). `GlobalTooltip` mounts **outside** the scale transform and renders the actual floating label at `zIndex: 99999` using `position: fixed` with viewport coordinates.

### Category Context Menu
Same pattern — rendered outside the scale transform. Triggered by right-click on a category tab; position from `e.currentTarget.getBoundingClientRect()`.

---

## Views

| View | Key |
|---|---|
| Main | Home feed + quick input |
| Tasks (Kanban) | 3 columns: To Do · In Progress · Done |
| Trash | Soft-deleted tasks grouped by category |
| Reminders | Time-based alerts |
| Notes | Free-form markdown notes |
| IHK | Weekly journal for apprenticeship records |
| Settings | Theme, text size, notifications |

---

## Main Input Commands

Type these in the main input bar:

| Command | Action |
|---|---|
| `/tm <text>` | Add task with deadline picker |
| `/rm <text>` | Add a reminder |
| `/nt <text>` | Create a new note |
| `/t <category> <text>` | Add task to a specific category |
| `/i <module> <text>` | Quick IHK entry for a module |

`/t` and `/i` show inline autocomplete pickers (fuzzy filter on name).

---

## Categories

- **Add:** FolderPlus icon in the tab bar → "New category" modal (name + color picker)
- **Edit/Delete:** Right-click any category tab → context dropdown → Edit or Delete
- **Reorder:** Drag category tabs left/right
- Colors are stored as RGB strings (`"59,130,246"`), rendered as `rgb(${color})` / `rgba(${color}, opacity)`

---

## Kanban Board

- 3 fixed columns: To Do (gray `156,163,175`), In Progress (orange `249,115,22`), Done (green `16,185,129`)
- Drag cards between columns or within a column to reorder
- Cards show pointer cursor; grabbing cursor only activates during drag
- Overdue cards get soft red background + border
- Column header: Add task (+) and Clear column (trash) buttons with tooltips

---

## Commit Convention

Short imperative sentence. No co-author line. Example:
```
Category tabs: drag and drop to reorder
```
