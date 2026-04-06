const router = require('express').Router();
const db = require('../db');
const { requireAuth } = require('../middleware');

// GET /api/projects
router.get('/', requireAuth, (req, res) => {
  const projects = db.prepare('SELECT * FROM projects ORDER BY created_at ASC').all();
  res.json(projects);
});

// POST /api/projects
router.post('/', requireAuth, (req, res) => {
  const { name, color } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Name is required' });
  const info = db.prepare('INSERT INTO projects (name, color) VALUES (?, ?)').run(name.trim(), color || '#6366f1');
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(project);
});

// DELETE /api/projects/:id
router.delete('/:id', requireAuth, (req, res) => {
  db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// PUT /api/projects/:id
router.put('/:id', requireAuth, (req, res) => {
  const { name, color } = req.body;
  db.prepare('UPDATE projects SET name = COALESCE(?, name), color = COALESCE(?, color) WHERE id = ?')
    .run(name || null, color || null, req.params.id);
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  res.json(project);
});

module.exports = router;
