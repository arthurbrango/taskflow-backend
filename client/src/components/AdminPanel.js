import React, { useState } from 'react';
import { UserPlus, Trash2, Shield, ShieldOff, UserX, UserCheck, ArrowLeft } from 'lucide-react';
import { team as teamApi } from '../api';

const COLORS = ['#6366f1', '#ec4899', '#14b8a6', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#84cc16', '#f97316', '#64748b'];

export default function AdminPanel({ teamMembers, onUpdate, onBack }) {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', color: '#6366f1', role: 'member' });
  const [confirmDelete, setConfirmDelete] = useState(null);

  const handleAdd = async () => {
    if (!form.name.trim()) return;
    await teamApi.create(form);
    onUpdate();
    setForm({ name: '', email: '', color: '#6366f1', role: 'member' });
    setShowAdd(false);
  };

  const handleDelete = async (id) => {
    if (confirmDelete !== id) { setConfirmDelete(id); return; }
    await teamApi.remove(id);
    onUpdate();
    setConfirmDelete(null);
  };

  const handleToggleActive = async (id) => {
    await teamApi.toggleActive(id);
    onUpdate();
  };

  const handleToggleRole = async (id) => {
    await teamApi.toggleRole(id);
    onUpdate();
  };

  const initials = form.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <button className="btn-icon" onClick={onBack}><ArrowLeft size={18} /></button>
        <h1>Team Admin</h1>
        <button className="btn btn-primary" onClick={() => setShowAdd(!showAdd)}>
          <UserPlus size={15} /> Add Member
        </button>
      </div>

      {showAdd && (
        <div className="admin-add-form">
          <div className="admin-add-preview">
            <div className="admin-avatar-preview" style={{ background: form.color }}>
              {initials || '??'}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Preview</div>
          </div>
          <div className="admin-add-fields">
            <div className="form-group">
              <label>Name</label>
              <input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Full name" autoFocus />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input className="form-input" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="Email (optional)" />
            </div>
            <div className="form-group">
              <label>Role</label>
              <select className="form-input form-select" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="form-group">
              <label>Avatar Color</label>
              <div className="color-picker-row">
                {COLORS.map(c => (
                  <button
                    key={c}
                    className={`color-swatch ${form.color === c ? 'active' : ''}`}
                    style={{ background: c }}
                    onClick={() => setForm(f => ({ ...f, color: c }))}
                  />
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
              <button className="btn btn-sm" onClick={() => setShowAdd(false)}>Cancel</button>
              <button className="btn btn-primary btn-sm" onClick={handleAdd} disabled={!form.name.trim()}>Add Member</button>
            </div>
          </div>
        </div>
      )}

      <div className="admin-list">
        <div className="admin-list-header">
          <span style={{ flex: 1 }}>Name</span>
          <span style={{ width: 160 }}>Email</span>
          <span style={{ width: 80, textAlign: 'center' }}>Role</span>
          <span style={{ width: 80, textAlign: 'center' }}>Status</span>
          <span style={{ width: 120, textAlign: 'right' }}>Actions</span>
        </div>
        {teamMembers.map(m => (
          <div key={m.id} className={`admin-list-item ${m.active === 0 ? 'inactive' : ''}`}>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10 }}>
              <div className="task-assignee" style={{ background: m.active === 0 ? 'var(--text-muted)' : (m.color || '#6366f1'), width: 32, height: 32, fontSize: 11 }}>
                {m.initials || m.name[0]}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{m.name}</div>
              </div>
            </div>
            <div style={{ width: 160, fontSize: 12, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {m.email || '—'}
            </div>
            <div style={{ width: 80, textAlign: 'center' }}>
              <span className={`admin-role-badge ${m.role === 'admin' ? 'admin' : ''}`}>
                {m.role === 'admin' ? 'Admin' : 'Member'}
              </span>
            </div>
            <div style={{ width: 80, textAlign: 'center' }}>
              <span className={`admin-status-badge ${m.active !== 0 ? 'active' : 'deactivated'}`}>
                {m.active !== 0 ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div style={{ width: 120, display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
              <button className="btn-icon" onClick={() => handleToggleRole(m.id)} title={m.role === 'admin' ? 'Demote to member' : 'Promote to admin'}>
                {m.role === 'admin' ? <ShieldOff size={14} /> : <Shield size={14} />}
              </button>
              <button className="btn-icon" onClick={() => handleToggleActive(m.id)} title={m.active !== 0 ? 'Deactivate' : 'Reactivate'}>
                {m.active !== 0 ? <UserX size={14} /> : <UserCheck size={14} />}
              </button>
              <button
                className="btn-icon"
                onClick={() => handleDelete(m.id)}
                title={confirmDelete === m.id ? 'Click again to confirm' : 'Delete permanently'}
                style={confirmDelete === m.id ? { color: 'var(--red)', background: 'var(--red-soft)' } : {}}
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
