import React, { useState, useEffect } from 'react';
import { X, Trash2, Send, MessageSquare } from 'lucide-react';
import { notes as notesApi } from '../api';

export default function TaskModal({ mode, task, teamMembers, onSave, onClose, onDelete }) {
  const [form, setForm] = useState({
    title: task?.title || '',
    description: task?.description || '',
    status: task?.status || 'todo',
    priority: task?.priority || 'medium',
    assignee_id: task?.assignee_id || '',
    due_date: task?.due_date || '',
  });

  const [notesList, setNotesList] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [loadingNotes, setLoadingNotes] = useState(false);

  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }));

  // Load notes when editing
  useEffect(() => {
    if (mode === 'edit' && task?.id) {
      setLoadingNotes(true);
      notesApi.list(task.id).then(setNotesList).catch(() => {}).finally(() => setLoadingNotes(false));
    }
  }, [mode, task?.id]);

  const handleAddNote = async () => {
    if (!newNote.trim() || !task?.id) return;
    const note = await notesApi.create(task.id, newNote.trim());
    setNotesList(prev => [...prev, note]);
    setNewNote('');
  };

  const handleDeleteNote = async (id) => {
    await notesApi.remove(id);
    setNotesList(prev => prev.filter(n => n.id !== id));
  };

  const handleSubmit = () => {
    if (!form.title.trim()) return;
    onSave({
      ...form,
      assignee_id: form.assignee_id || null,
      due_date: form.due_date || null,
    });
  };

  function timeAgo(dateStr) {
    const d = new Date(dateStr + (dateStr.includes('Z') || dateStr.includes('+') ? '' : 'Z'));
    const diff = (Date.now() - d.getTime()) / 1000;
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.round(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.round(diff / 3600)}h ago`;
    return `${Math.round(diff / 86400)}d ago`;
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ width: 600, maxHeight: '90vh' }}>
        <div className="modal-header">
          <h2>{mode === 'create' ? 'New Task' : 'Edit Task'}</h2>
          <button className="btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label>Title</label>
            <input className="form-input" value={form.title} onChange={set('title')} placeholder="Task title" autoFocus />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea className="form-input" value={form.description} onChange={set('description')} placeholder="Optional description" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label>Status</label>
              <select className="form-input form-select" value={form.status} onChange={set('status')}>
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="done">Done</option>
              </select>
            </div>
            <div className="form-group">
              <label>Priority</label>
              <select className="form-input form-select" value={form.priority} onChange={set('priority')}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label>Assignee</label>
              <select className="form-input form-select" value={form.assignee_id} onChange={set('assignee_id')}>
                <option value="">Unassigned</option>
                {teamMembers.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Due Date</label>
              <input className="form-input" type="date" value={form.due_date} onChange={set('due_date')} />
            </div>
          </div>

          {/* ── Notes Section ── */}
          {mode === 'edit' && task?.id && (
            <div className="notes-section">
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px', color: 'var(--text-secondary)' }}>
                <MessageSquare size={13} /> Notes ({notesList.length})
              </label>

              <div className="notes-list">
                {loadingNotes && <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: 8 }}>Loading notes…</div>}
                {!loadingNotes && notesList.length === 0 && (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '8px 0' }}>No notes yet. Add a note below.</div>
                )}
                {notesList.map(note => (
                  <div key={note.id} className="note-item">
                    <div className="note-item-header">
                      <span className="note-item-author">{note.author_name || 'Unknown'}</span>
                      <span className="note-item-time">{timeAgo(note.created_at)}</span>
                      <button className="btn-icon" onClick={() => handleDeleteNote(note.id)} style={{ marginLeft: 'auto', padding: 2 }}>
                        <Trash2 size={11} />
                      </button>
                    </div>
                    <div className="note-item-content">{note.content}</div>
                  </div>
                ))}
              </div>

              <div className="note-input-row">
                <textarea
                  className="form-input"
                  placeholder="Add a note…"
                  value={newNote}
                  onChange={e => setNewNote(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddNote(); }}}
                  rows={2}
                  style={{ resize: 'none', minHeight: 48 }}
                />
                <button className="btn btn-primary btn-sm" onClick={handleAddNote} disabled={!newNote.trim()} style={{ alignSelf: 'flex-end' }}>
                  <Send size={12} /> Add
                </button>
              </div>
            </div>
          )}
        </div>
        <div className="modal-footer">
          {onDelete && (
            <button className="btn" style={{ marginRight: 'auto', color: 'var(--red)', borderColor: 'var(--red)' }} onClick={onDelete}>
              <Trash2 size={14} /> Delete
            </button>
          )}
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit}>
            {mode === 'create' ? 'Create Task' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
