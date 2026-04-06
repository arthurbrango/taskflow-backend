const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'taskflow.db');

// Ensure data directory exists
const fs = require('fs');
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent reads
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ── Schema ───────────────────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    google_id     TEXT UNIQUE NOT NULL,
    email         TEXT UNIQUE NOT NULL,
    name          TEXT,
    avatar_url    TEXT,
    access_token  TEXT,
    refresh_token TEXT,
    token_expiry  INTEGER,
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS projects (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL,
    color      TEXT DEFAULT '#6366f1',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS team_members (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    name     TEXT NOT NULL,
    email    TEXT,
    initials TEXT,
    color    TEXT DEFAULT '#6366f1'
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id  INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title       TEXT NOT NULL,
    description TEXT DEFAULT '',
    status      TEXT NOT NULL DEFAULT 'todo' CHECK(status IN ('todo','in_progress','done')),
    priority    TEXT NOT NULL DEFAULT 'medium' CHECK(priority IN ('low','medium','high','urgent')),
    assignee_id INTEGER REFERENCES team_members(id) ON DELETE SET NULL,
    due_date    TEXT,
    position    INTEGER DEFAULT 0,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS task_notes (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id    INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    author_id  INTEGER REFERENCES users(id),
    author_name TEXT,
    content    TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_email TEXT NOT NULL,
    type       TEXT NOT NULL,
    title      TEXT NOT NULL,
    body       TEXT DEFAULT '',
    is_read    INTEGER DEFAULT 0,
    task_id    INTEGER,
    project_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS sessions (
    sid       TEXT PRIMARY KEY,
    sess      TEXT NOT NULL,
    expired   DATETIME NOT NULL
  );
`);

// ── Seed data (only if tables are empty) ─────────────────

function seedIfEmpty() {
  const projectCount = db.prepare('SELECT COUNT(*) as c FROM projects').get().c;
  if (projectCount > 0) return;

  // Projects
  db.prepare("INSERT INTO projects (name, color) VALUES (?, ?)").run('Brango', '#6366f1');
  db.prepare("INSERT INTO projects (name, color) VALUES (?, ?)").run('Rapid Hire', '#f59e0b');

  // Team members
  const members = [
    { name: 'Mark',    initials: 'MK', color: '#6366f1' },
    { name: 'Sarah',   initials: 'SA', color: '#ec4899' },
    { name: 'James',   initials: 'JA', color: '#14b8a6' },
    { name: 'Allison', initials: 'AL', color: '#f59e0b' },
    { name: 'Mike',    initials: 'MI', color: '#8b5cf6' },
  ];
  const insertMember = db.prepare('INSERT INTO team_members (name, initials, color) VALUES (?, ?, ?)');
  for (const m of members) insertMember.run(m.name, m.initials, m.color);

  // Sample tasks for Brango (project 1)
  const insertTask = db.prepare(
    'INSERT INTO tasks (project_id, title, description, status, priority, assignee_id, due_date, position) VALUES (?,?,?,?,?,?,?,?)'
  );

  // Today + offset helper
  const d = (offset) => {
    const dt = new Date(); dt.setDate(dt.getDate() + offset);
    return dt.toISOString().split('T')[0];
  };

  insertTask.run(1, 'Design brand guidelines',       'Create color palette, typography, and logo usage rules', 'todo',        'high',   2, d(3),  0);
  insertTask.run(1, 'Build landing page',             'Responsive hero section and features grid',              'todo',        'medium', 1, d(7),  1);
  insertTask.run(1, 'Set up analytics',               'Google Analytics + conversion tracking',                 'todo',        'low',    5, null,  2);
  insertTask.run(1, 'Write ad copy for launch',       'Facebook + Google Ads copy variants',                    'in_progress', 'high',   4, d(1),  0);
  insertTask.run(1, 'Configure email sequences',      'Welcome series + onboarding drip',                      'in_progress', 'medium', 3, d(5),  1);
  insertTask.run(1, 'Competitor research',             'Analyze top 5 competitors',                             'done',        'medium', 1, d(-2), 0);
  insertTask.run(1, 'Set up project repo',            'GitHub repo, CI, and branch protection rules',          'done',        'low',    3, d(-5), 1);

  // Sample tasks for Rapid Hire (project 2)
  insertTask.run(2, 'Draft job description template', 'Standard template for all openings',                    'todo',        'high',   4, d(2),  0);
  insertTask.run(2, 'Screening form builder',         'Build dynamic screening question form',                 'todo',        'medium', 1, d(10), 1);
  insertTask.run(2, 'API integration with LinkedIn',  'Pull candidate profiles via API',                       'in_progress', 'high',   3, d(4),  0);
  insertTask.run(2, 'Dashboard wireframe',            'Design the recruiter dashboard layout',                 'in_progress', 'medium', 2, d(6),  1);
  insertTask.run(2, 'Define user personas',           'Recruiter, hiring manager, candidate personas',         'done',        'medium', 5, d(-3), 0);
}

seedIfEmpty();

module.exports = db;
