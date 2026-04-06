import React, { useState, useEffect, useCallback } from 'react';
import { gmail } from '../api';
import { Mail, Send, ArrowLeft, RefreshCw, PenSquare, Reply, Inbox, X } from 'lucide-react';

function parseFrom(from) {
  if (!from) return { name: 'Unknown', email: '' };
  const match = from.match(/^"?(.+?)"?\s*<(.+?)>$/);
  if (match) return { name: match[1], email: match[2] };
  return { name: from, email: from };
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diff = (now - d) / 1000;
  if (diff < 3600) return `${Math.round(diff / 60)}m`;
  if (diff < 86400) return `${Math.round(diff / 3600)}h`;
  if (diff < 604800) return `${Math.round(diff / 86400)}d`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function EmailPanel({ user }) {
  const [view, setView] = useState('inbox'); // inbox | thread | compose
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedThread, setSelectedThread] = useState(null);
  const [threadMessages, setThreadMessages] = useState([]);

  // Compose state
  const [composeTo, setComposeTo] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [sending, setSending] = useState(false);

  // Reply state
  const [replyBody, setReplyBody] = useState('');
  const [replyOpen, setReplyOpen] = useState(false);

  const fetchInbox = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await gmail.threads(20);
      setThreads(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchInbox(); }, [fetchInbox]);

  const openThread = async (thread) => {
    setLoading(true);
    try {
      const data = await gmail.thread(thread.id);
      setSelectedThread(thread);
      setThreadMessages(data.messages || []);
      setView('thread');
      setReplyOpen(false);
      setReplyBody('');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!composeTo.trim() || !composeBody.trim()) return;
    setSending(true);
    try {
      await gmail.send({ to: composeTo, subject: composeSubject, body: composeBody.replace(/\n/g, '<br>') });
      setView('inbox');
      setComposeTo('');
      setComposeSubject('');
      setComposeBody('');
      fetchInbox();
    } catch (e) {
      alert('Failed to send: ' + e.message);
    } finally {
      setSending(false);
    }
  };

  const handleReply = async () => {
    if (!replyBody.trim() || !threadMessages.length) return;
    setSending(true);
    const lastMsg = threadMessages[threadMessages.length - 1];
    const fromParsed = parseFrom(lastMsg.from);
    try {
      await gmail.send({
        to: fromParsed.email || lastMsg.from,
        subject: `Re: ${lastMsg.subject || selectedThread?.subject || ''}`,
        body: replyBody.replace(/\n/g, '<br>'),
        threadId: selectedThread.id,
        inReplyTo: lastMsg.id,
      });
      setReplyBody('');
      setReplyOpen(false);
      openThread(selectedThread); // refresh thread
    } catch (e) {
      alert('Failed to reply: ' + e.message);
    } finally {
      setSending(false);
    }
  };

  // ── Compose View ──────────────────────────────────────
  if (view === 'compose') {
    return (
      <div className="email-panel">
        <div className="email-panel-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button className="btn-icon" onClick={() => setView('inbox')}><ArrowLeft size={16} /></button>
            <h2>New Email</h2>
          </div>
          <button className="btn-icon" onClick={() => setView('inbox')}><X size={16} /></button>
        </div>
        <div style={{ flex: 1, padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <input
            className="form-input"
            placeholder="To"
            value={composeTo}
            onChange={e => setComposeTo(e.target.value)}
          />
          <input
            className="form-input"
            placeholder="Subject"
            value={composeSubject}
            onChange={e => setComposeSubject(e.target.value)}
          />
          <textarea
            className="form-input"
            placeholder="Write your message…"
            value={composeBody}
            onChange={e => setComposeBody(e.target.value)}
            style={{ flex: 1, minHeight: 200, resize: 'none' }}
          />
        </div>
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border-light)', display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-primary" onClick={handleSend} disabled={sending}>
            <Send size={14} /> {sending ? 'Sending…' : 'Send'}
          </button>
        </div>
      </div>
    );
  }

  // ── Thread View ───────────────────────────────────────
  if (view === 'thread' && selectedThread) {
    return (
      <div className="email-panel">
        <div className="email-panel-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button className="btn-icon" onClick={() => { setView('inbox'); setSelectedThread(null); }}><ArrowLeft size={16} /></button>
            <h2 style={{ fontSize: 14, maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {selectedThread.subject || '(no subject)'}
            </h2>
          </div>
          <button className="btn btn-sm" onClick={() => setReplyOpen(r => !r)}>
            <Reply size={13} /> Reply
          </button>
        </div>
        <div className="thread-view">
          {threadMessages.map((msg, i) => {
            const from = parseFrom(msg.from);
            return (
              <div className="thread-message" key={msg.id || i}>
                <div className="thread-message-header">
                  <span className="thread-message-from">{from.name}</span>
                  <span className="thread-message-date">{timeAgo(msg.date)}</span>
                </div>
                <div className="thread-message-body" dangerouslySetInnerHTML={{ __html: msg.body || '<em>No content</em>' }} />
              </div>
            );
          })}
        </div>
        {replyOpen && (
          <div className="compose-area">
            <textarea
              placeholder="Write your reply…"
              value={replyBody}
              onChange={e => setReplyBody(e.target.value)}
              autoFocus
              rows={4}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button className="btn btn-sm" onClick={() => setReplyOpen(false)}>Cancel</button>
              <button className="btn btn-primary btn-sm" onClick={handleReply} disabled={sending}>
                <Send size={12} /> {sending ? 'Sending…' : 'Send Reply'}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Inbox View ────────────────────────────────────────
  return (
    <div className="email-panel">
      <div className="email-panel-header">
        <h2><Inbox size={16} style={{ verticalAlign: -2, marginRight: 6 }} /> Inbox</h2>
        <div style={{ display: 'flex', gap: 4 }}>
          <button className="btn-icon" onClick={fetchInbox} title="Refresh"><RefreshCw size={15} /></button>
          <button className="btn btn-sm btn-primary" onClick={() => setView('compose')}>
            <PenSquare size={13} /> Compose
          </button>
        </div>
      </div>

      {loading && !threads.length && (
        <div className="email-empty">
          <RefreshCw size={20} style={{ animation: 'spin 1s linear infinite' }} />
          Loading emails…
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {error && (
        <div className="email-empty">
          <Mail size={28} />
          <div style={{ fontWeight: 600 }}>Gmail not connected</div>
          <div style={{ fontSize: 12 }}>Sign out and sign back in to connect Gmail, or check your Google Cloud OAuth scopes.</div>
        </div>
      )}

      {!loading && !error && threads.length === 0 && (
        <div className="email-empty">
          <Inbox size={28} />
          <div>Your inbox is empty</div>
        </div>
      )}

      <div className="email-list">
        {threads.map(t => {
          const from = parseFrom(t.from);
          return (
            <div className="email-item" key={t.id} onClick={() => openThread(t)}>
              <div className="email-item-from">{from.name}</div>
              <div className="email-item-date">{timeAgo(t.date)}</div>
              <div className="email-item-subject">{t.subject || '(no subject)'}</div>
              <div className="email-item-snippet">{t.snippet}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
