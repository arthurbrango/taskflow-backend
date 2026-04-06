import React, { useState } from 'react';
import { Mail, Plus, Check, X, Trash2, FolderKanban, ChevronRight, Settings } from 'lucide-react';

export default function Sidebar({ user, projects, activeProject, onSelectProject, onAddProject, onDeleteProject, onLogout, onToggleEmail, emailOpen, currentView, onShowAdmin }) {
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');

  const handleAdd = () => {
    if (newName.trim()) {
      onAddProject(newName.trim());
      setNewName('');
      setAdding(false);
    }
  };

  return (
    <div className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-icon">T</div>
        TaskFlow
      </div>

      <div className="sidebar-section">
        <div className="sidebar-section-title">Projects</div>
        {projects.map(p => (
          <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
            <button
              className={`sidebar-item ${activeProject?.id === p.id ? 'active' : ''}`}
              onClick={() => onSelectProject(p)}
              style={{ flex: 1 }}
            >
              <span className="dot" style={{ background: p.color || '#6366f1' }} />
              {p.name}
              {activeProject?.id === p.id && <ChevronRight size={14} style={{ marginLeft: 'auto', opacity: 0.5 }} />}
            </button>
            {projects.length > 1 && (
              <button
                className="btn-icon"
                onClick={(e) => { e.stopPropagation(); onDeleteProject(p.id); }}
                style={{ opacity: 0.3, flexShrink: 0 }}
                title="Delete project"
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
        ))}

        {adding ? (
          <div className="inline-add">
            <input
              autoFocus
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setAdding(false); }}
              placeholder="Project name"
            />
            <button className="btn-icon" onClick={handleAdd}><Check size={15} /></button>
            <button className="btn-icon" onClick={() => setAdding(false)}><X size={15} /></button>
          </div>
        ) : (
          <button className="sidebar-add-btn" onClick={() => setAdding(true)}>
            <Plus size={14} /> Add project
          </button>
        )}
      </div>

      <div className="sidebar-section" style={{ marginTop: 12 }}>
        <div className="sidebar-section-title">Views</div>
        <button className={`sidebar-item ${currentView === 'board' ? 'active' : ''}`} onClick={onShowAdmin ? () => onShowAdmin(false) : undefined}>
          <FolderKanban size={16} /> Board
        </button>
        <button className="sidebar-item" onClick={onToggleEmail}>
          <Mail size={16} /> {emailOpen ? 'Hide Email' : 'Show Email'}
        </button>
        <button className={`sidebar-item ${currentView === 'admin' ? 'active' : ''}`} onClick={() => onShowAdmin && onShowAdmin(true)}>
          <Settings size={16} /> Team Admin
        </button>
      </div>

      <div className="sidebar-bottom">
        <div className="sidebar-user">
          {user.avatar_url ? (
            <img src={user.avatar_url} alt="" referrerPolicy="no-referrer" />
          ) : (
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#6366f1', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13 }}>
              {(user.name || user.email || '?')[0].toUpperCase()}
            </div>
          )}
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{user.name}</div>
            <div className="sidebar-user-email">{user.email}</div>
          </div>
          <button className="btn-logout" onClick={onLogout}>Sign out</button>
        </div>
      </div>
    </div>
  );
}
