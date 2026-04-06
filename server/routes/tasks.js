const router = require('express').Router();
const db = require('../db');
const { requireAuth } = require('../middleware');
const { notify } = require('../notify');

const STATUS_LABELS = { todo: 'To Do', in_progress: 'In Progress', done: 'Done' };

function getUser(session) {
  return db.prepare('SELECT id, name, email FROM users WHERE id = ?').get(session.userId);
}

// GET /api/tasks?project_id=1&assignee_id=2
router.get('/', requireAuth, (req, res) => {
  const { project_id, assignee_id } = req.query;
  let sql = 'SELECT t.*, tm.name as assignee_name, tm.initials as assignee_initials, tm.color as assignee_color FROM tasks t LEFT JOIN team_members tm ON t.assignee_id = tm.id WHERE 1=1';
  const params = [];
  if (project_id) { sql += ' AND t.project_id = ?'; params.push(project_id); }
  if (assignee_id) { sql += ' AND t.assignee_id = ?'; params.push(assignee_id); }
  sql += ' ORDER BY t.position ASC, t.created_at DESC';
  res.json(db.prepare(sql).all(...params));
});

// POST /api/tasks
router.post('/', requireAuth, (req, res) => {
  const { project_id, title, description, status, priority, assignee_id, due_date } = req.body;
  if (!project_id || !title) return res.status(400).json({ error: 'project_id and title required' });
  const maxPos = db.prepare('SELECT COALESCE(MAX(position),0)+1 as p FROM tasks WHERE project_id=? AND status=?')
    .get(project_id, status || 'todo').p;
  const info = db.prepare(`
    INSERT INTO tasks (project_id, title, description, status, priority, assignee_id, due_date, position)
    VALUES (?,?,?,?,?,?,?,?)
  `).run(project_id, title, description || '', status || 'todo', priority || 'medium', assignee_id || null, due_date || null, maxPos);
  const task = db.prepare('SELECT t.*, tm.name as assignee_name, tm.initials as assignee_initials, tm.color as assignee_color FROM tasks t LEFT JOIN team_members tm ON t.assignee_id = tm.id WHERE t.id = ?').get(info.lastInsertRowid);
  res.status(201).json(task);
});

// PUT /api/tasks/:id
router.put('/:id', requireAuth, async (req, res) => {
  const { title, description, status, priority, assignee_id, due_date, position } = req.body;
  const user = getUser(req.session);
  const oldTask = db.prepare('SELECT t.*, p.name as project_name FROM tasks t JOIN projects p ON t.project_id = p.id WHERE t.id = ?').get(req.params.id);

  const fields = [];
  const params = [];

  if (title !== undefined)       { fields.push('title = ?');       params.push(title); }
  if (description !== undefined) { fields.push('description = ?'); params.push(description); }
  if (status !== undefined)      { fields.push('status = ?');      params.push(status); }
  if (priority !== undefined)    { fields.push('priority = ?');    params.push(priority); }
  if (assignee_id !== undefined) { fields.push('assignee_id = ?'); params.push(assignee_id || null); }
  if (due_date !== undefined)    { fields.push('due_date = ?');    params.push(due_date || null); }
  if (position !== undefined)    { fields.push('position = ?');    params.push(position); }

  if (fields.length === 0) return res.status(400).json({ error: 'Nothing to update' });

  fields.push("updated_at = CURRENT_TIMESTAMP");
  params.push(req.params.id);

  db.prepare(`UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`).run(...params);
  const task = db.prepare('SELECT t.*, tm.name as assignee_name, tm.initials as assignee_initials, tm.color as assignee_color FROM tasks t LEFT JOIN team_members tm ON t.assignee_id = tm.id WHERE t.id = ?').get(req.params.id);

  if (status !== undefined && oldTask && oldTask.status !== status) {
    notify({
      type: 'status_change',
      title: `Task moved: "${oldTask.title}"`,
      body: `${user?.name || 'Someone'} moved "${oldTask.title}" from ${STATUS_LABELS[oldTask.status] || oldTask.status} → ${STATUS_LABELS[status] || status} in ${oldTask.project_name}`,
      taskId: parseInt(req.params.id),
      projectId: oldTask.project_id,
      excludeEmail: user?.email,
    });
  }

  res.json(task);
});

// PUT /api/tasks/:id/move
router.put('/:id/move', requireAuth, async (req, res) => {
  const { status, position } = req.body;
  if (!status) return res.status(400).json({ error: 'status required' });
  const user = getUser(req.session);
  const oldTask = db.prepare('SELECT t.*, p.name as project_name FROM tasks t JOIN projects p ON t.project_id = p.id WHERE t.id = ?').get(req.params.id);

  const pos = position ?? 0;
  db.prepare('UPDATE tasks SET status = ?, position = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(status, pos, req.params.id);
  const task = db.prepare('SELECT t.*, tm.name as assignee_name, tm.initials as assignee_initials, tm.color as assignee_color FROM tasks t LEFT JOIN team_members tm ON t.assignee_id = tm.id WHERE t.id = ?').get(req.params.id);

  if (oldTask && oldTask.status !== status) {
    notify({
      type: 'status_change',
      title: `Task moved: "${oldTask.title}"`,
      body: `${user?.name || 'Someone'} moved "${oldTask.title}" from ${STATUS_LABELS[oldTask.status] || oldTask.status} → ${STATUS_LABELS[status] || status} in ${oldTask.project_name}`,
      taskId: parseInt(req.params.id),
      projectId: oldTask.project_id,
      excludeEmail: user?.email,
    });
  }

  res.json(task);
});

// DELETE /api/tasks/:id
router.delete('/:id', requireAuth, (req, res) => {
  db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
