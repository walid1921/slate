import Database from "@tauri-apps/plugin-sql";

let _db: Database | null = null;
let _seeded = false;

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

  await _db.execute(`
    CREATE TABLE IF NOT EXISTS meta (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);

  if (!_seeded) {
    _seeded = true;
    const flag = await _db.select<{ value: string }[]>(
      "SELECT value FROM meta WHERE key = 'seeded'"
    );
    if (flag.length === 0) {
      await _db.execute("INSERT INTO meta (key, value) VALUES ('seeded', '1')");

      const today = new Date();
      const fmt = (d: Date) => d.toISOString().split("T")[0];
      const yesterday = fmt(new Date(today.getTime() - 86400000));
      const tomorrow  = fmt(new Date(today.getTime() + 86400000));
      const nextWeek  = fmt(new Date(today.getTime() + 7 * 86400000));

      const seeds: [string, string, string | null][] = [
        ["Review pull request for auth module",   "high",   fmt(today)],
        ["Write unit tests for todo store",        "medium", tomorrow],
        ["Update README with setup instructions",  "low",    nextWeek],
        ["Fix overdue bug in date formatter",      "high",   yesterday],
        ["Design new onboarding flow",             "medium", null],
        ["Refactor database schema",               "low",    null],
        ["Ship v1.0 to TestFlight",                "high",   tomorrow],
        ["Buy groceries",                          "none",   fmt(today)],
      ];

      for (const [text, priority, due_date] of seeds) {
        await _db.execute(
          "INSERT INTO todos (text, priority, due_date) VALUES (?, ?, ?)",
          [text, priority, due_date]
        );
      }
      await _db.execute(
        "UPDATE todos SET done = 1 WHERE text = 'Update README with setup instructions'"
      );
    }
  }

  return _db;
}
