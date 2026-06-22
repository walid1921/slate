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
  await _db.execute(`ALTER TABLE task_categories ADD COLUMN icon TEXT NOT NULL DEFAULT 'folder'`).catch(() => {});
  await _db.execute(`
    CREATE TABLE IF NOT EXISTS deleted_categories (
      id    INTEGER PRIMARY KEY,
      name  TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT '156,163,175'
    )
  `);
  await _db.execute(`ALTER TABLE deleted_categories ADD COLUMN icon TEXT NOT NULL DEFAULT 'folder'`).catch(() => {});

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

  await _db.execute(`ALTER TABLE dev_categories ADD COLUMN deleted_at TEXT`).catch(() => {});
  await _db.execute(`ALTER TABLE dev_items ADD COLUMN description TEXT NOT NULL DEFAULT ''`).catch(() => {});

  await _db.execute(`
    CREATE TABLE IF NOT EXISTS dev_sections (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT    NOT NULL,
      position   INTEGER NOT NULL DEFAULT 0,
      created_at TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `);
  await _db.execute(`ALTER TABLE dev_categories ADD COLUMN section_id INTEGER NOT NULL DEFAULT 1`).catch(() => {});
  await _db.execute(`ALTER TABLE dev_sections ADD COLUMN deleted_at TEXT`).catch(() => {});

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

  // v2 — new categories + expanded items
  const devV2 = await _db.select<{ value: string }[]>(`SELECT value FROM meta WHERE key = 'dev_content_v2'`);
  if (!devV2.length) {
    const v2Cats: [number, string, string, string, number][] = [
      [9,  'Accessibility', '34,197,94',   'shield',   8],
      [10, 'E-Commerce',    '251,146,60',  'layers',   9],
      [11, 'SEO',           '139,92,246',  'zap',      10],
    ];
    for (const [id, name, color, icon, pos] of v2Cats) {
      await _db.execute(`INSERT OR IGNORE INTO dev_categories (id,name,color,icon,position,is_preset) VALUES (?,?,?,?,?,1)`, [id, name, color, icon, pos]);
    }

    const v2Items: [number, string, number, string, number][] = [
      // Design extras
      [52, 'Define color tokens — CSS variables for primary, secondary, accent, and neutral colors', 1, 'high',   7],
      [53, 'Establish typography scale — font sizes & line heights for heading/body/caption on all breakpoints', 1, 'high',   8],
      [54, 'Design all interactive states — hover, focus, active, disabled, loading, error for every component', 1, 'high',   9],
      [55, 'Navigation designed for mobile — hamburger, slide-in drawer, touch targets ≥ 44×44px', 1, 'medium', 10],
      [56, 'Consistent icon style across the app — outline vs fill, same size grid', 1, 'low',    11],
      [57, 'Skeleton loaders and fallback images defined for all async content', 1, 'medium', 12],
      [58, 'Dark mode variants designed and tested for every component', 1, 'medium', 13],
      // Frontend extras
      [59, 'Error boundaries wrap major UI sections — one crash does not blank the whole page', 2, 'high',   7],
      [60, 'Component library documented with usage examples — Storybook or inline stories', 2, 'low',    8],
      [61, 'All async states handled — loading, success, error, and empty', 2, 'high',   9],
      [62, 'Progressive enhancement — core action works without JS, enhanced with JS', 2, 'medium', 10],
      [63, 'Web fonts preloaded and loaded with font-display: swap', 2, 'medium', 11],
      // Backend extras
      [64, 'API versioned (/v1/, /v2/) so clients can migrate on their own schedule', 3, 'medium', 7],
      [65, 'Caching strategy defined — Redis or CDN for hot data, invalidation planned', 3, 'high',   8],
      [66, 'Background job queue for slow operations — email, exports, image processing', 3, 'high',   9],
      [67, 'OpenAPI / Swagger docs generated from code and kept in sync', 3, 'medium', 10],
      [68, 'Webhooks validated by HMAC signature before processing', 3, 'high',   11],
      // Database extras
      [69, 'Soft deletes with deleted_at timestamp instead of hard DELETE', 4, 'medium', 6],
      [70, 'Audit log table for sensitive mutations — who changed what and when', 4, 'high',   7],
      [71, 'Database credentials rotated and never stored in application code', 4, 'high',   8],
      // Security extras
      [72, 'Content Security Policy (CSP) header blocks unauthorized script sources', 5, 'high',   7],
      [73, 'Security headers set — X-Frame-Options, X-Content-Type-Options, Referrer-Policy', 5, 'high',   8],
      [74, 'User-supplied HTML sanitized server-side before storing or rendering', 5, 'high',   9],
      [75, 'Session ID regenerated on login to prevent session fixation attacks', 5, 'high',   10],
      // DevOps extras
      [76, 'Docker image built in CI — no manual builds on production servers', 6, 'medium', 6],
      [77, 'Staging environment mirrors production — every deploy tested there first', 6, 'high',   7],
      [78, 'Database migrations applied automatically as part of the deploy pipeline', 6, 'high',   8],
      [79, 'Incident runbook documented — on-call knows exactly what to do at 3am', 6, 'medium', 9],
      // Testing extras
      [80, 'E2E tests cover critical flows — signup, login, checkout, main CRUD actions', 7, 'high',   5],
      [81, 'Visual regression tests catch unexpected UI changes between deployments', 7, 'medium', 6],
      [82, 'Load tested before launch — know the breaking point before users find it', 7, 'high',   7],
      // Performance extras
      [83, 'Images served in modern formats (WebP / AVIF) with legacy fallback', 8, 'high',   6],
      [84, 'Font loading optimized — preloaded, font-display: swap, subset to used glyphs', 8, 'medium', 7],
      [85, 'Third-party scripts deferred or async — no render-blocking analytics or chat widgets', 8, 'high',   8],
      [86, 'HTTP caching headers set — Cache-Control for static assets, ETag for dynamic', 8, 'medium', 9],
      [87, 'GZIP or Brotli compression enabled at server or CDN level', 8, 'medium', 10],
      // Accessibility
      [88, 'Semantic HTML used throughout — header, nav, main, article, footer, section', 9, 'high',   0],
      [89, 'Heading hierarchy correct — h1 → h2 → h3, no levels skipped', 9, 'high',   1],
      [90, 'All images have descriptive alt text; decorative images use alt=""', 9, 'high',   2],
      [91, 'Full keyboard navigation — Tab, Enter, Space, arrow keys work everywhere', 9, 'high',   3],
      [92, 'Focus rings visible — outline:none never used without a visible replacement', 9, 'high',   4],
      [93, 'ARIA attributes used for dynamic content — aria-live, aria-expanded, aria-label', 9, 'medium', 5],
      [94, 'Color is not the only information channel — icons and labels accompany color cues', 9, 'medium', 6],
      [95, 'Forms use <label> elements linked to inputs — placeholder is not a label', 9, 'high',   7],
      [96, 'Lighthouse accessibility score > 90 on all key pages', 9, 'high',   8],
      // E-Commerce
      [97,  'Product gallery with main image, thumbnails, and zoom / 360° view', 10, 'high',   0],
      [98,  'Stock status clearly visible — available, low stock, and out-of-stock handled on PDP', 10, 'high',   1],
      [99,  'Variant selectors (size, color) update price and stock availability dynamically', 10, 'high',   2],
      [100, 'Add-to-cart gives visual feedback — cart count animation or toast < 300ms', 10, 'medium', 3],
      [101, 'Cart persists across sessions — items survive a page refresh or browser close', 10, 'high',   4],
      [102, 'Promo / coupon code field in cart with clear success and error feedback', 10, 'medium', 5],
      [103, 'Shipping cost shown before the payment step — no surprise fees at checkout', 10, 'high',   6],
      [104, 'Guest checkout available — account creation must never block a purchase', 10, 'high',   7],
      [105, 'Order confirmation page shown + transactional email sent automatically after purchase', 10, 'high',   8],
      [106, 'Return policy and shipping info visible on product page and at checkout', 10, 'medium', 9],
      // SEO
      [107, 'Each page has a unique <title> tag and meta description under 160 characters', 11, 'high',   0],
      [108, 'Open Graph tags set — og:title, og:description, og:image for every shareable page', 11, 'medium', 1],
      [109, 'Canonical URLs defined to prevent duplicate content penalties', 11, 'high',   2],
      [110, 'XML sitemap generated and submitted to Google Search Console', 11, 'medium', 3],
      [111, 'robots.txt configured — crawlable pages allowed, staging and admin blocked', 11, 'medium', 4],
      [112, 'Structured data (JSON-LD) added for products, breadcrumbs, and reviews', 11, 'medium', 5],
      [113, 'Internal linking strategy defined — related content linked with descriptive anchor text', 11, 'low',    6],
      [114, 'Core Web Vitals monitored in Google Search Console — a drop to Poor affects rankings', 11, 'high',   7],
    ];
    for (const [id, text, cat_id, priority, pos] of v2Items) {
      await _db.execute(`INSERT OR IGNORE INTO dev_items (id,text,category_id,priority,position) VALUES (?,?,?,?,?)`, [id, text, cat_id, priority, pos]);
    }
    await _db.execute(`INSERT OR IGNORE INTO meta (key,value) VALUES ('dev_content_v2','1')`);
  }

  // v3 — sections (subpages)
  const devSectionsV1 = await _db.select<{ value: string }[]>(`SELECT value FROM meta WHERE key = 'dev_sections_v1'`);
  if (!devSectionsV1.length) {
    await _db.execute(`INSERT OR IGNORE INTO dev_sections (id, name, position) VALUES (1, 'General', 0)`);
    await _db.execute(`UPDATE dev_categories SET section_id = 1`);
    await _db.execute(`INSERT OR IGNORE INTO meta (key,value) VALUES ('dev_sections_v1','1')`);
  }

  return _db;
}

export async function resetDevDb(): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM dev_items");
  await db.execute("DELETE FROM dev_categories");
  await db.execute("DELETE FROM dev_sections");
  await db.execute("DELETE FROM meta WHERE key IN ('dev_seeded', 'dev_content_v2', 'dev_sections_v1')");
  _db = null;
}
