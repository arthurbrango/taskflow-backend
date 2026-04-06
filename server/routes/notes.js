const router = require('express').Router();
const db = require('../db');
const { requireAuth } = require('../middleware');
const { notify } = require('../notify');

// GET /api/notes?task_id=1
router.get('/', requireAuth, (req, res) => {
  const { task_id } = req.query;
  if (!task_id) return res.status(400).json({ error: 'task_id required' });
  const notes = db.prepare('SELECT * FROM task_notes WHERE task_id = ? ORDER BY created_at ASC').all(task_id);
  res.json(notes);
});

// POST /api/notes
router.post('/', requireAuth, async (req, res) => {
  const { task_id, content } = req.body;
  if (!task_id || !content?.trim()) return res.status(400).json({ error: 'task_id and content required' });

  const user = db.prepare('SELECT id, name, email FROM users WHERE id = ?').get(req.session.userId);
  const authorName = user?.name || 'Unknown';

  const info = db.prepare('INSERT INTO task_notes (task_id, author_id, author_name, content) VALUES (?,?,?,?)')
    .run(task_id, req.session.userId, authorName, content.trim());

  const note = db.prepare('SELECT * FROM task_notes WHERE id = ?').get(info.lastInsertRowid);

  // Get task + project info for notification
  const task = db.prepare('SELECT t.title, p.name as project_name FROM tasks t JOIN projects p ON t.project_id = p.id WHERE t.id = ?').get(task_id);

  if (task) {
    await notify({
      type: 'note_added',
      title: `New note on "${task.title}"`,
      body: `${authorName} added a note in ${task.project_name}: "${content.trim().slice(0, 100)}${content.trim().length > 100 ? '…' : ''}"`,
      taskId: task_id,
      excludeEmail: user?.email,
    });
  }

  res.status(201).json(note);
});

// DELETE /api/notes/:id
router.delete('/:id', requireAuth, (req, res) => {
  db.prepare('DELETE FROM task_notes WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
