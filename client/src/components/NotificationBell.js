import React, { useState, useEffect, useRef } from 'react';
import { Bell } from 'lucide-react';
import { notifications as notifApi } from '../api';

export default function NotificationBell() {
  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const ref = useRef();

  // Poll unread count every 30s
  useEffect(() => {
    const fetch = () => notifApi.unreadCount().then(d => setCount(d.count)).catch(() => {});
    fetch();
    const interval = setInterval(fetch, 30000);
    return () => clearInterval(interval);
  }, []);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleOpen = async () => {
    if (open) { setOpen(false); return; }
    const data = await notifApi.list();
    setItems(data);
    setOpen(true);
    if (count > 0) {
      await notifApi.markRead();
      setCount(0);
    }
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
    <div ref={ref} style={{ position: 'relative' }}>
      <button className="btn-icon" onClick={handleOpen} style={{ position: 'relative' }}>
        <Bell size={18} />
        {count > 0 && (
          <span style={{
            position: 'absolute', top: -2, right: -2,
            background: 'var(--red)', color: 'white',
            fontSize: 10, fontWeight: 700,
            width: 18, height: 18, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid var(--surface)',
          }}>
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <div className="notif-dropdown">
          <div className="notif-dropdown-header">
            <span style={{ fontWeight: 700, fontSize: 14 }}>Notifications</span>
          </div>
          <div className="notif-dropdown-body">
            {items.length === 0 && (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                No notifications yet
              </div>
            )}
            {items.map(n => (
              <div key={n.id} className={`notif-item ${n.is_read ? '' : 'unread'}`}>
                <div className="notif-item-dot" style={{ background: n.is_read ? 'transparent' : 'var(--accent)' }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="notif-item-title">{n.title}</div>
                  <div className="notif-item-body">{n.body}</div>
                  <div className="notif-item-time">{timeAgo(n.created_at)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
