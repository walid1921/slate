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
  await _db.execute(`
    CREATE TABLE IF NOT EXISTS task_images (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id    INTEGER NOT NULL,
      filename   TEXT    NOT NULL,
      data       TEXT    NOT NULL DEFAULT '',
      path       TEXT    NOT NULL DEFAULT '',
      created_at TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `);
  await _db.execute(`ALTER TABLE task_images ADD COLUMN path TEXT NOT NULL DEFAULT ''`).catch(() => {});

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

  // v4 — Shopware + Odoo pages + Server category in General
  const devSectionsV2 = await _db.select<{ value: string }[]>(`SELECT value FROM meta WHERE key = 'dev_sections_v2'`);
  if (!devSectionsV2.length) {
    await _db.execute(`INSERT OR IGNORE INTO dev_sections (id, name, position) VALUES (2, 'Shopware', 1)`);
    await _db.execute(`INSERT OR IGNORE INTO dev_sections (id, name, position) VALUES (3, 'Odoo', 2)`);

    // Server category → General
    await _db.execute(`INSERT OR IGNORE INTO dev_categories (id,name,color,icon,position,is_preset,section_id) VALUES (12,'Server','14,165,233','server',11,1,1)`);

    // Shopware categories
    const swCats: [number, string, string, string, number, number][] = [
      [13, 'Setup & Config',    '16,185,129',  'settings', 0, 2],
      [14, 'Theme & Storefront','168,85,247',  'layout',   1, 2],
      [15, 'Plugin Dev',        '59,130,246',  'code-2',   2, 2],
      [16, 'Products',          '245,158,11',  'package',  3, 2],
      [17, 'Checkout & Pay',    '14,165,233',  'shopping', 4, 2],
      [18, 'Performance',       '251,191,36',  'zap',      5, 2],
      [19, 'Deployment',        '100,116,139', 'rocket',   6, 2],
    ];
    for (const [id, name, color, icon, pos, sid] of swCats) {
      await _db.execute(`INSERT OR IGNORE INTO dev_categories (id,name,color,icon,position,is_preset,section_id) VALUES (?,?,?,?,?,1,?)`, [id, name, color, icon, pos, sid]);
    }

    // Odoo categories
    const ooCats: [number, string, string, string, number, number][] = [
      [20, 'Setup & Config', '16,185,129',  'settings', 0, 3],
      [21, 'Module Dev',     '59,130,246',  'code-2',   1, 3],
      [22, 'Models & ORM',   '245,158,11',  'database', 2, 3],
      [23, 'Access Rights',  '239,68,68',   'shield',   3, 3],
      [24, 'Views & UI',     '168,85,247',  'layout',   4, 3],
      [25, 'Testing',        '20,184,166',  'flask',    5, 3],
      [26, 'Deployment',     '100,116,139', 'rocket',   6, 3],
    ];
    for (const [id, name, color, icon, pos, sid] of ooCats) {
      await _db.execute(`INSERT OR IGNORE INTO dev_categories (id,name,color,icon,position,is_preset,section_id) VALUES (?,?,?,?,?,1,?)`, [id, name, color, icon, pos, sid]);
    }

    const newItems: [number, string, number, string, number][] = [
      // ── General: Server (category_id=12) ──────────────────────────────────
      [115, 'Web server (Nginx/Apache) configured — server_name, root, index correct',          12, 'high',   0],
      [116, 'SSL/TLS certificate installed and auto-renewal verified (Certbot)',                 12, 'high',   1],
      [117, 'HTTP to HTTPS redirect enforced at server level',                                  12, 'high',   2],
      [118, 'Firewall active — only required ports open (80, 443, 22)',                         12, 'high',   3],
      [119, 'SSH hardened — PasswordAuthentication no, root login disabled',                    12, 'high',   4],
      [120, 'fail2ban or equivalent brute-force protection enabled',                            12, 'medium', 5],
      [121, 'Automatic security updates enabled (unattended-upgrades)',                         12, 'medium', 6],
      [122, 'Server monitoring configured — CPU, disk, memory alerts active',                   12, 'high',   7],
      [123, 'Log rotation configured for web server and application logs',                      12, 'low',    8],
      [124, 'NTP time synchronisation active — server clock accurate',                          12, 'low',    9],

      // ── Shopware: Setup & Config (category_id=13) ─────────────────────────
      [125, 'Shopware installed via Composer — system requirements verified',                   13, 'high',   0],
      [126, '.env configured — APP_URL, database, APP_SECRET, and mailer set',                  13, 'high',   1],
      [127, 'APP_ENV=prod and APP_DEBUG=0 in production',                                       13, 'high',   2],
      [128, 'Admin account password changed from default',                                      13, 'high',   3],
      [129, 'Sales channel set up — storefront URL, languages, and currencies configured',      13, 'high',   4],
      [130, 'Transactional emails tested — order confirmation and password reset deliver',      13, 'high',   5],
      [131, 'Scheduled tasks running: bin/console scheduled-task:run',                         13, 'medium', 6],
      [132, 'File permissions correct — var/ and public/media/ writable by web user',          13, 'medium', 7],

      // ── Shopware: Theme & Storefront (category_id=14) ─────────────────────
      [133, 'Custom theme extends Storefront — no core files modified directly',                14, 'high',   0],
      [134, 'Theme compiled for production: npm run build -- --mode=production',               14, 'high',   1],
      [135, 'Custom SCSS/JS in theme src/ only — no inline styles in Twig templates',          14, 'medium', 2],
      [136, 'Twig overrides use sw_extends and block tags — no full template copies',          14, 'high',   3],
      [137, 'Storefront tested on mobile, tablet, and desktop',                                14, 'high',   4],
      [138, 'Theme assets version-bumped after changes to bust HTTP cache',                    14, 'medium', 5],
      [139, 'Custom storefront JS registered as plugin in main.js',                            14, 'medium', 6],

      // ── Shopware: Plugin Dev (category_id=15) ─────────────────────────────
      [140, 'Plugin follows PSR-4 structure — Plugin.php and services.xml present',            15, 'high',   0],
      [141, 'Database changes use MigrationCollection — no DDL in PHP class files',            15, 'high',   1],
      [142, 'Business logic lives in service classes — not in event subscribers',              15, 'medium', 2],
      [143, 'Plugin config read via SystemConfigService — no hardcoded values',                15, 'medium', 3],
      [144, 'Uninstall method removes all plugin tables, config entries, and media',           15, 'high',   4],
      [145, 'Admin component compiled: npm run build in Resources/app/administration',        15, 'high',   5],
      [146, 'Plugin tested on the minimum supported Shopware version',                        15, 'medium', 6],

      // ── Shopware: Products (category_id=16) ───────────────────────────────
      [147, 'Product variants and properties display correctly in the storefront',             16, 'high',   0],
      [148, 'SEO URLs defined for all products and categories',                               16, 'high',   1],
      [149, 'Product images optimised — under 2MB, alt text filled in',                      16, 'medium', 2],
      [150, 'Cross-selling and upsell products configured where relevant',                    16, 'low',    3],
      [151, 'Search index rebuilt after bulk imports: dal:refresh:index',                     16, 'medium', 4],
      [152, 'Tax rules and shipping exclusions correct per sales channel',                    16, 'high',   5],
      [153, 'Out-of-stock behaviour and stock threshold notifications defined',               16, 'medium', 6],

      // ── Shopware: Checkout & Pay (category_id=17) ─────────────────────────
      [154, 'Payment providers tested in sandbox mode before go-live',                        17, 'high',   0],
      [155, 'Sandbox credentials replaced with live credentials before launch',               17, 'high',   1],
      [156, 'Order confirmation email triggers automatically after purchase',                  17, 'high',   2],
      [157, 'Guest checkout available and tested end-to-end',                                 17, 'high',   3],
      [158, 'Shipping methods cover all required zones, weights, and delivery times',         17, 'high',   4],
      [159, 'Full cart and checkout flow tested on mobile',                                   17, 'high',   5],
      [160, 'Voucher and discount codes apply correctly at checkout',                         17, 'medium', 6],
      [161, 'Payment failure handled gracefully — user returns to cart, no duplicate orders', 17, 'high',   7],

      // ── Shopware: Performance (category_id=18) ────────────────────────────
      [162, 'Reverse proxy cache enabled (Varnish or Nginx FastCGI cache)',                   18, 'high',   0],
      [163, 'OPcache enabled and sized correctly for PHP process count',                      18, 'high',   1],
      [164, 'Redis configured for object cache, sessions, and message queue',                 18, 'high',   2],
      [165, 'CDN configured for media files and storefront static assets',                    18, 'medium', 3],
      [166, 'Elasticsearch / OpenSearch used for product search on large catalogs',           18, 'medium', 4],
      [167, 'Slow MySQL queries identified and indexed',                                      18, 'high',   5],
      [168, 'Unnecessary apps and plugins disabled to reduce request overhead',               18, 'medium', 6],

      // ── Shopware: Deployment (category_id=19) ─────────────────────────────
      [169, 'Post-deploy commands run: cache:clear, theme:compile, dal:refresh:index',       19, 'high',   0],
      [170, 'Maintenance mode enabled during deploy — disabled after verification',          19, 'high',   1],
      [171, 'HTTP cache warmed up after each deployment',                                    19, 'medium', 2],
      [172, 'App server sessions stored in Redis — safe behind a load balancer',             19, 'medium', 3],
      [173, 'Automated tests pass in CI before deploy reaches production',                   19, 'high',   4],
      [174, 'Rollback procedure documented and tested',                                      19, 'medium', 5],

      // ── Odoo: Setup & Config (category_id=20) ─────────────────────────────
      [175, 'Odoo installed from official source — version pinned in requirements',          20, 'high',   0],
      [176, 'odoo.conf configured — db_name, addons_path, admin_passwd, workers set',        20, 'high',   1],
      [177, 'Worker count set based on CPUs: workers = 2 × CPUs + 1',                       20, 'medium', 2],
      [178, 'Log level set to warn in production — debug only in development',               20, 'medium', 3],
      [179, 'Attachment filestore path configured and included in backup strategy',          20, 'high',   4],
      [180, 'Scheduled actions (ir.cron) verified to run on correct schedule',               20, 'medium', 5],
      [181, 'Master password set and stored securely — not left as default admin',           20, 'high',   6],
      [182, 'Two-factor authentication enabled for admin and privileged users',              20, 'high',   7],

      // ── Odoo: Module Dev (category_id=21) ─────────────────────────────────
      [183, 'Module follows addon structure — __manifest__.py and __init__.py present',      21, 'high',   0],
      [184, '__manifest__.py declares correct version, depends, and license',                21, 'high',   1],
      [185, 'No raw SQL — all data access uses ORM methods',                                 21, 'high',   2],
      [186, 'Compute fields use store=True only when query performance requires it',         21, 'medium', 3],
      [187, 'Onchange methods do not trigger unwanted write or create calls',                21, 'medium', 4],
      [188, 'API decorators used correctly — @api.model, @api.depends, @api.constrains',    21, 'high',   5],
      [189, 'Module installs cleanly on a fresh database with no warnings or errors',        21, 'high',   6],
      [190, 'Upgrade tested: -u module_name on a database with real production data',       21, 'high',   7],

      // ── Odoo: Models & ORM (category_id=22) ───────────────────────────────
      [191, '_name, _description, and _rec_name defined on every model',                    22, 'high',   0],
      [192, 'Required fields use required=True — no manual Python presence checks',         22, 'medium', 1],
      [193, 'Relational fields declare ondelete (cascade, restrict, or set null)',           22, 'high',   2],
      [194, 'Computed fields have correct @api.depends — no stale cached values',           22, 'high',   3],
      [195, 'Uniqueness enforced via _sql_constraints — not duplicated in Python',          22, 'medium', 4],
      [196, '_name_search overridden on models used in many2one search fields',             22, 'low',    5],
      [197, 'Domains filter at DB level — no Python-side full-table iteration',             22, 'high',   6],

      // ── Odoo: Access Rights (category_id=23) ──────────────────────────────
      [198, 'ir.model.access.csv defines CRUD rights for every model in the module',        23, 'high',   0],
      [199, 'Record rules (ir.rule) applied for multi-company or user-scoped data',         23, 'high',   1],
      [200, 'No sensitive data readable by portal or public users by default',              23, 'high',   2],
      [201, 'Groups defined per feature area — not every user gets admin access',           23, 'high',   3],
      [202, 'Access tested with a regular employee user, not only administrator',           23, 'high',   4],
      [203, 'sudo() used only where justified — not as a way to bypass security checks',   23, 'medium', 5],

      // ── Odoo: Views & UI (category_id=24) ─────────────────────────────────
      [204, 'Form views use <sheet>, <group>, and <notebook> where appropriate',            24, 'medium', 0],
      [205, 'List views define visible columns and optional columns for dense data',        24, 'medium', 1],
      [206, 'Kanban views set default_group_by and card content fields correctly',          24, 'medium', 2],
      [207, 'QWeb templates follow Odoo naming conventions — core templates not patched',   24, 'high',   3],
      [208, 'Action windows open in the correct view_mode order (list,form or kanban,form)', 24, 'medium', 4],
      [209, 'Breadcrumbs work correctly when navigating between related records',           24, 'low',    5],
      [210, 'OWL / JS components load without errors in browser dev tools',                24, 'high',   6],

      // ── Odoo: Testing (category_id=25) ────────────────────────────────────
      [211, 'Tests written using TransactionCase or SavepointCase',                         25, 'high',   0],
      [212, 'Test class named Test* and all test methods prefixed test_*',                  25, 'medium', 1],
      [213, 'Tests run cleanly: ./odoo-bin test --test-enable -d testdb',                   25, 'high',   2],
      [214, 'Test records created via self.env[...].create() — no hard-coded IDs',         25, 'high',   3],
      [215, 'Wizard and multi-step flows have end-to-end test coverage',                   25, 'medium', 4],
      [216, 'Access rights tested for both permitted and forbidden user groups',            25, 'high',   5],

      // ── Odoo: Deployment (category_id=26) ─────────────────────────────────
      [217, 'Production deploy uses --update all or a targeted module list',               26, 'high',   0],
      [218, 'Database backup taken before every update — restore procedure verified',      26, 'high',   1],
      [219, 'Staging server mirrors production DB schema for pre-deploy validation',       26, 'high',   2],
      [220, 'Python dependencies installed in a dedicated virtualenv',                     26, 'medium', 3],
      [221, 'Nginx reverse proxy configured — proxy_pass to Odoo and longpolling port',   26, 'high',   4],
      [222, 'SSL certificate installed and HTTP redirected to HTTPS at Nginx level',      26, 'high',   5],
      [223, 'Odoo service managed by systemd — auto-restarts on crash',                   26, 'medium', 6],
      [224, 'Filestore and database backed up daily to offsite storage',                   26, 'high',   7],
    ];
    for (const [id, text, cat_id, priority, pos] of newItems) {
      await _db.execute(`INSERT OR IGNORE INTO dev_items (id,text,category_id,priority,position) VALUES (?,?,?,?,?)`, [id, text, cat_id, priority, pos]);
    }

    await _db.execute(`INSERT OR IGNORE INTO meta (key,value) VALUES ('dev_sections_v2','1')`);
  }

  return _db;
}

export async function resetDevDb(): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM dev_items");
  await db.execute("DELETE FROM dev_categories");
  await db.execute("DELETE FROM dev_sections");
  await db.execute("DELETE FROM meta WHERE key IN ('dev_seeded', 'dev_content_v2', 'dev_sections_v1', 'dev_sections_v2')");
  _db = null;
}
