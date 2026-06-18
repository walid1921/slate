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

  await _db.execute(`
    CREATE TABLE IF NOT EXISTS reminders (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      text       TEXT    NOT NULL,
      remind_at  TEXT    NOT NULL,
      notified   INTEGER NOT NULL DEFAULT 0,
      created_at TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `);

  await _db.execute(`
    CREATE TABLE IF NOT EXISTS notes (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      title      TEXT    NOT NULL DEFAULT 'Untitled',
      content    TEXT    NOT NULL DEFAULT '',
      created_at TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `);

  await _db.execute(`
    CREATE TABLE IF NOT EXISTS meta (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);


  return _db;
}
