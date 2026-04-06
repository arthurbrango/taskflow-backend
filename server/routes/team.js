const router = require('express').Router();
const db = require('../db');
const { requireAuth } = require('../middleware');

// GET /api/team
router.get('/', requireAuth, (req, res) => {
  const members = db.prepare('SELECT * FROM team_members ORDER BY name ASC').all();
  res.json(members);
});

// POST /api/team
router.post('/', requireAuth, (req, res) => {
  const { name, email, color } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });
  const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const info = db.prepare('INSERT INTO team_members (name, email, initials, color) VALUES (?,?,?,?)')
    .run(name, email || null, initials, color || '#6366f1');
  res.status(201).json(db.prepare('SELECT * FROM team_members WHERE id = ?').get(info.lastInsertRowid));
});

// DELETE /api/team/:id
router.delete('/:id', requireAuth, (req, res) => {
  db.prepare('DELETE FROM team_members WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
