import React from 'react';

export default function AccessDenied() {
  return (
    <div className="access-denied-page">
      <div className="access-denied-card">
        <div style={{ fontSize: 40, marginBottom: 16 }}>🔒</div>
        <h1>Access Denied</h1>
        <p>Your Google account is not approved for this workspace. Contact your team administrator to be added to the approved list.</p>
        <a href="/" style={{ display: 'inline-block', marginTop: 20, color: '#6366f1', fontWeight: 600, fontSize: 14, textDecoration: 'none' }}>← Back to sign in</a>
      </div>
    </div>
  );
}
