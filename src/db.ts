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

  const reminderSeeded = await _db.select<{ value: string }[]>(
    "SELECT value FROM meta WHERE key = 'seeded_reminders'"
  );
  if (reminderSeeded.length === 0) {
    await _db.execute("INSERT INTO meta (key, value) VALUES ('seeded_reminders', '1')");
    const now = new Date();
    const localIso = (d: Date) => {
      const pad = (n: number) => String(n).padStart(2, "0");
      return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
    };
    const inMin = (m: number) => localIso(new Date(now.getTime() + m * 60000));
    const seeds: [string, string, number][] = [
      ["Team standup meeting",          inMin(30),       0],
      ["Review design mockups",         inMin(120),      0],
      ["Call with client",              inMin(60 * 24),  0],
      ["Submit expense report",         inMin(60 * 48),  0],
      ["Deploy staging build",          inMin(-60),      1],
      ["Check server logs",             inMin(-120),     1],
    ];
    for (const [text, remind_at, notified] of seeds) {
      await _db.execute(
        "INSERT INTO reminders (text, remind_at, notified) VALUES (?, ?, ?)",
        [text, remind_at, notified]
      );
    }
  }

  const notesSeeded = await _db.select<{ value: string }[]>(
    "SELECT value FROM meta WHERE key = 'seeded_notes'"
  );
  if (notesSeeded.length === 0) {
    await _db.execute("INSERT INTO meta (key, value) VALUES ('seeded_notes', '1')");
    const seedNotes: [string, string][] = [
      ["Release checklist", "- [ ] Bump version number\n- [ ] Update changelog\n- [ ] Run full test suite\n- [ ] Tag the release\n- [ ] Deploy to production\n- [ ] Notify the team"],
      ["Meeting notes — sprint planning", "Attendees: Walid, Sara, Tom\n\nGoals for this sprint:\n1. Finish auth refactor\n2. Ship the onboarding flow\n3. Fix the date formatter bug\n\nBlockers: waiting on design assets for onboarding screens."],
      ["Ideas", "- Dark mode toggle per user preference\n- Keyboard shortcut cheatsheet overlay\n- Export todos as markdown\n- Sync across devices via iCloud\n- Widget for macOS menu bar"],
      ["Useful commands", "pnpm tauri dev       → start dev server\npnpm tauri build     → production build\ngit log --oneline    → recent commits\ntccutil reset Notifications <id>"],
    ];
    for (const [title, content] of seedNotes) {
      await _db.execute(
        "INSERT INTO notes (title, content) VALUES (?, ?)",
        [title, content]
      );
    }
  }

  return _db;
}
