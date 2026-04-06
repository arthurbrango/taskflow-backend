const router = require('express').Router();
const db = require('../db');
const { requireAuth } = require('../middleware');

// GET /api/team — all members (optionally filter active only)
router.get('/', requireAuth, (req, res) => {
  const activeOnly = req.query.active === '1';
  const sql = activeOnly
    ? 'SELECT * FROM team_members WHERE active = 1 ORDER BY name ASC'
    : 'SELECT * FROM team_members ORDER BY name ASC';
  res.json(db.prepare(sql).all());
});

// POST /api/team — add member
router.post('/', requireAuth, (req, res) => {
  const { name, email, color, role } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });
  const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const info = db.prepare('INSERT INTO team_members (name, email, initials, color, role) VALUES (?,?,?,?,?)')
    .run(name, email || null, initials, color || '#6366f1', role || 'member');
  res.status(201).json(db.prepare('SELECT * FROM team_members WHERE id = ?').get(info.lastInsertRowid));
});

// PUT /api/team/:id — update member
router.put('/:id', requireAuth, (req, res) => {
  const { name, email, color, role, active } = req.body;
  const fields = [];
  const params = [];

  if (name !== undefined)   { fields.push('name = ?');     params.push(name); fields.push('initials = ?'); params.push(name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)); }
  if (email !== undefined)  { fields.push('email = ?');    params.push(email || null); }
  if (color !== undefined)  { fields.push('color = ?');    params.push(color); }
  if (role !== undefined)   { fields.push('role = ?');     params.push(role); }
  if (active !== undefined) { fields.push('active = ?');   params.push(active ? 1 : 0); }

  if (fields.length === 0) return res.status(400).json({ error: 'Nothing to update' });
  params.push(req.params.id);

  db.prepare(`UPDATE team_members SET ${fields.join(', ')} WHERE id = ?`).run(...params);
  res.json(db.prepare('SELECT * FROM team_members WHERE id = ?').get(req.params.id));
});

// PUT /api/team/:id/toggle-active — deactivate/activate
router.put('/:id/toggle-active', requireAuth, (req, res) => {
  const member = db.prepare('SELECT * FROM team_members WHERE id = ?').get(req.params.id);
  if (!member) return res.status(404).json({ error: 'Not found' });
  const newActive = member.active ? 0 : 1;
  db.prepare('UPDATE team_members SET active = ? WHERE id = ?').run(newActive, req.params.id);
  res.json(db.prepare('SELECT * FROM team_members WHERE id = ?').get(req.params.id));
});

// PUT /api/team/:id/toggle-role — switch admin/member
router.put('/:id/toggle-role', requireAuth, (req, res) => {
  const member = db.prepare('SELECT * FROM team_members WHERE id = ?').get(req.params.id);
  if (!member) return res.status(404).json({ error: 'Not found' });
  const newRole = member.role === 'admin' ? 'member' : 'admin';
  db.prepare('UPDATE team_members SET role = ? WHERE id = ?').run(newRole, req.params.id);
  res.json(db.prepare('SELECT * FROM team_members WHERE id = ?').get(req.params.id));
});

// DELETE /api/team/:id
router.delete('/:id', requireAuth, (req, res) => {
  db.prepare('DELETE FROM team_members WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
