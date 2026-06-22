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

  await _db.execute(`
    CREATE TABLE IF NOT EXISTS dev_categories (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      name      TEXT    NOT NULL,
      color     TEXT    NOT NULL DEFAULT '99,102,241',
      icon      TEXT    NOT NULL DEFAULT 'code-2',
      position  INTEGER NOT NULL DEFAULT 0,
      is_preset INTEGER NOT NULL DEFAULT 0
    )
  `);

  await _db.execute(`
    CREATE TABLE IF NOT EXISTS dev_items (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      text        TEXT    NOT NULL,
      done        INTEGER NOT NULL DEFAULT 0,
      category_id INTEGER NOT NULL DEFAULT 1,
      priority    TEXT    NOT NULL DEFAULT 'none',
      position    INTEGER NOT NULL DEFAULT 0,
      created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
      deleted_at  TEXT
    )
  `);

  // Seed default categories + items once
  const devSeeded = await _db.select<{ value: string }[]>(`SELECT value FROM meta WHERE key = 'dev_seeded'`);
  if (!devSeeded.length) {
    const cats: [number, string, string, string, number][] = [
      [1, 'Design',      '168,85,247',  'palette',  0],
      [2, 'Frontend',    '59,130,246',  'code-2',   1],
      [3, 'Backend',     '16,185,129',  'server',   2],
      [4, 'Database',    '245,158,11',  'database', 3],
      [5, 'Security',    '239,68,68',   'shield',   4],
      [6, 'DevOps',      '100,116,139', 'terminal', 5],
      [7, 'Testing',     '20,184,166',  'flask',    6],
      [8, 'Performance', '251,191,36',  'zap',      7],
    ];
    for (const [id, name, color, icon, pos] of cats) {
      await _db.execute(`INSERT OR IGNORE INTO dev_categories (id,name,color,icon,position,is_preset) VALUES (?,?,?,?,?,1)`, [id, name, color, icon, pos]);
    }

    const items: [number, string, number, string, number][] = [
      // Design
      [1,  'Responsive on mobile, tablet & desktop',       1, 'high',   0],
      [2,  'Loading states for all async operations',      1, 'high',   1],
      [3,  'Empty states designed',                        1, 'medium', 2],
      [4,  'Error states & form validation feedback',      1, 'high',   3],
      [5,  'Color contrast meets WCAG AA',                 1, 'medium', 4],
      [6,  'Keyboard navigation accessible',               1, 'low',    5],
      [7,  'Consistent spacing & typography system',       1, 'low',    6],
      // Frontend
      [8,  'No console.log in production code',            2, 'high',   0],
      [9,  'Client-side form validation',                  2, 'high',   1],
      [10, 'HTTP errors handled gracefully in UI',         2, 'high',   2],
      [11, 'Lazy loading for heavy components',            2, 'medium', 3],
      [12, 'No hardcoded secrets or env vars',             2, 'high',   4],
      [13, 'Bundle size analyzed',                         2, 'low',    5],
      [14, 'Linter & formatter passes with zero errors',   2, 'medium', 6],
      // Backend
      [15, 'Input validated on all endpoints',             3, 'high',   0],
      [16, 'Correct HTTP status codes used',               3, 'medium', 1],
      [17, 'Pagination on all list endpoints',             3, 'high',   2],
      [18, 'Rate limiting configured',                     3, 'high',   3],
      [19, "Error messages don't leak internals",          3, 'high',   4],
      [20, 'Request logging in place',                     3, 'medium', 5],
      [21, 'CORS scoped correctly',                        3, 'high',   6],
      // Database
      [22, 'Indexes on frequently queried columns',        4, 'high',   0],
      [23, 'N+1 queries avoided',                          4, 'high',   1],
      [24, 'Migrations tested on fresh DB',                4, 'high',   2],
      [25, 'Sensitive data encrypted at rest',             4, 'high',   3],
      [26, 'Connection pooling configured',                4, 'medium', 4],
      [27, 'Backup strategy defined',                      4, 'medium', 5],
      // Security
      [28, 'Secrets in env vars, not in git',              5, 'high',   0],
      [29, 'Dependencies audited — no critical CVEs',      5, 'high',   1],
      [30, 'Auth tokens short-lived & properly secured',   5, 'high',   2],
      [31, 'SQL injection prevention in place',            5, 'high',   3],
      [32, 'XSS prevention (output encoding)',             5, 'high',   4],
      [33, 'HTTPS enforced everywhere',                    5, 'high',   5],
      [34, 'All protected routes require auth',            5, 'high',   6],
      // DevOps
      [35, 'Environment variables documented',             6, 'medium', 0],
      [36, 'CI/CD pipeline runs tests on push',            6, 'high',   1],
      [37, 'Health check endpoint exists',                 6, 'medium', 2],
      [38, 'Monitoring & alerts configured',               6, 'high',   3],
      [39, 'Deployment rollback plan ready',               6, 'medium', 4],
      [40, 'Production logs accessible',                   6, 'medium', 5],
      // Testing
      [41, 'Unit tests for critical business logic',       7, 'high',   0],
      [42, 'Integration tests for API endpoints',          7, 'high',   1],
      [43, 'Edge cases covered',                           7, 'medium', 2],
      [44, 'Tests run automatically in CI',                7, 'high',   3],
      [45, 'No flaky tests',                               7, 'medium', 4],
      // Performance
      [46, 'API responses < 300ms for main endpoints',     8, 'high',   0],
      [47, 'DB queries optimized (checked with EXPLAIN)',  8, 'high',   1],
      [48, 'Static assets cached / CDN configured',        8, 'medium', 2],
      [49, 'Images optimized & lazy loaded',               8, 'medium', 3],
      [50, 'No memory leaks detected',                     8, 'high',   4],
      [51, 'Core Web Vitals passing',                      8, 'medium', 5],
    ];
    for (const [id, text, cat_id, priority, pos] of items) {
      await _db.execute(`INSERT OR IGNORE INTO dev_items (id,text,category_id,priority,position) VALUES (?,?,?,?,?)`, [id, text, cat_id, priority, pos]);
    }

    await _db.execute(`INSERT OR IGNORE INTO meta (key,value) VALUES ('dev_seeded','1')`);
  }

  return _db;
}
