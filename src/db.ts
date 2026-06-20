import Database from "@tauri-apps/plugin-sql";

let _db: Database | null = null;

export async function getDb(): Promise<Database> {
  if (_db) return _db;
  _db = await Database.load("sqlite:slate.db");

  await _db.execute(`
    CREATE TABLE IF NOT EXISTS todos (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      text       TEXT    NOT NULL,
      done       INTEGER NOT NULL DEFAULT 0,
      priority   TEXT    NOT NULL DEFAULT 'none',
      due_date   TEXT,
      position   INTEGER NOT NULL DEFAULT 0,
      created_at TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `);
  // Migrations for older DBs
  await _db.execute(`ALTER TABLE todos ADD COLUMN position   INTEGER NOT NULL DEFAULT 0`).catch(() => {});
  await _db.execute(`ALTER TABLE todos ADD COLUMN deleted_at TEXT`).catch(() => {});
  await _db.execute(`ALTER TABLE todos ADD COLUMN due_time            TEXT`).catch(() => {});
  await _db.execute(`ALTER TABLE todos ADD COLUMN deadline_notified   INTEGER NOT NULL DEFAULT 0`).catch(() => {});
  await _db.execute(`ALTER TABLE reminders ADD COLUMN deleted_at TEXT`).catch(() => {});
  await _db.execute(`ALTER TABLE notes ADD COLUMN deleted_at TEXT`).catch(() => {});
  await _db.execute(`ALTER TABLE todos ADD COLUMN description TEXT NOT NULL DEFAULT ''`).catch(() => {});
  await _db.execute(`ALTER TABLE todos ADD COLUMN show_created_at INTEGER NOT NULL DEFAULT 0`).catch(() => {});
  await _db.execute(`ALTER TABLE todos ADD COLUMN show_timer INTEGER NOT NULL DEFAULT 0`).catch(() => {});
  await _db.execute(`ALTER TABLE todos ADD COLUMN subtasks TEXT NOT NULL DEFAULT '[]'`).catch(() => {});
  await _db.execute(`ALTER TABLE todos ADD COLUMN show_subtask_bar INTEGER NOT NULL DEFAULT 0`).catch(() => {});

  await _db.execute(`
    CREATE TABLE IF NOT EXISTS task_sessions (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id    INTEGER NOT NULL,
      started_at TEXT    NOT NULL,
      ended_at   TEXT
    )
  `);

  await _db.execute(`
    CREATE TABLE IF NOT EXISTS task_categories (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT    NOT NULL UNIQUE,
      color      TEXT    NOT NULL DEFAULT '99,102,241',
      position   INTEGER NOT NULL DEFAULT 0,
      created_at TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `);
  // Seed the always-present General category
  await _db.execute(`INSERT OR IGNORE INTO task_categories (id, name, color, position) VALUES (1, 'General', '99,102,241', 0)`);
  await _db.execute(`ALTER TABLE todos ADD COLUMN category_id INTEGER NOT NULL DEFAULT 1`).catch(() => {});
  await _db.execute(`ALTER TABLE todos ADD COLUMN status TEXT NOT NULL DEFAULT 'todo'`).catch(() => {});
  await _db.execute(`UPDATE todos SET status = 'done' WHERE done = 1 AND status = 'todo'`).catch(() => {});
  await _db.execute(`
    CREATE TABLE IF NOT EXISTS deleted_categories (
      id    INTEGER PRIMARY KEY,
      name  TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT '156,163,175'
    )
  `);

  await _db.execute(`
    CREATE TABLE IF NOT EXISTS reminders (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      text       TEXT    NOT NULL,
      remind_at  TEXT    NOT NULL,
      notified   INTEGER NOT NULL DEFAULT 0,
      created_at TEXT    NOT NULL DEFAULT (datetime('now')),
      deleted_at TEXT
    )
  `);

  await _db.execute(`
    CREATE TABLE IF NOT EXISTS notes (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      title      TEXT    NOT NULL DEFAULT 'Untitled',
      content    TEXT    NOT NULL DEFAULT '',
      created_at TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT    NOT NULL DEFAULT (datetime('now')),
      deleted_at TEXT
    )
  `);

  await _db.execute(`
    CREATE TABLE IF NOT EXISTS meta (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);

  await _db.execute(`
    CREATE TABLE IF NOT EXISTS activity (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      date       TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  await _db.execute(`
    CREATE TABLE IF NOT EXISTS ihk_entries (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      text       TEXT    NOT NULL,
      category   INTEGER NOT NULL DEFAULT 0,
      date       TEXT    NOT NULL,
      position   INTEGER NOT NULL DEFAULT 0,
      created_at TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `);
  await _db.execute(`ALTER TABLE ihk_entries ADD COLUMN position INTEGER NOT NULL DEFAULT 0`).catch(() => {});
  await _db.execute(`
    CREATE TABLE IF NOT EXISTS ihk_modules (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT    NOT NULL UNIQUE,
      type       INTEGER NOT NULL DEFAULT 2,
      created_at TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `);

  await _db.execute(`
    CREATE TABLE IF NOT EXISTS ihk_weeks (
      week_key TEXT PRIMARY KEY,
      sent     INTEGER NOT NULL DEFAULT 0
    )
  `);
  // Seed position from id for existing rows so order is preserved
  await _db.execute(`UPDATE ihk_entries SET position = id WHERE position = 0`).catch(() => {});

  return _db;
}
