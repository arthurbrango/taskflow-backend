const router = require('express').Router();
const db = require('../db');
const { requireAuth } = require('../middleware');

// GET /api/notifications — get notifications for current user
router.get('/', requireAuth, (req, res) => {
  const user = db.prepare('SELECT email FROM users WHERE id = ?').get(req.session.userId);
  if (!user) return res.json([]);
  const notifs = db.prepare(
    'SELECT * FROM notifications WHERE user_email = ? ORDER BY created_at DESC LIMIT 50'
  ).all(user.email.toLowerCase());
  res.json(notifs);
});

// GET /api/notifications/unread-count
router.get('/unread-count', requireAuth, (req, res) => {
  const user = db.prepare('SELECT email FROM users WHERE id = ?').get(req.session.userId);
  if (!user) return res.json({ count: 0 });
  const row = db.prepare(
    'SELECT COUNT(*) as count FROM notifications WHERE user_email = ? AND is_read = 0'
  ).get(user.email.toLowerCase());
  res.json({ count: row.count });
});

// POST /api/notifications/mark-read
router.post('/mark-read', requireAuth, (req, res) => {
  const user = db.prepare('SELECT email FROM users WHERE id = ?').get(req.session.userId);
  if (!user) return res.json({ ok: true });
  db.prepare('UPDATE notifications SET is_read = 1 WHERE user_email = ? AND is_read = 0')
    .run(user.email.toLowerCase());
  res.json({ ok: true });
});

// POST /api/notifications/:id/read
router.post('/:id/read', requireAuth, (req, res) => {
  db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
