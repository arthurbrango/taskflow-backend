const router = require('express').Router();
const { google } = require('googleapis');
const db = require('../db');
const { requireAuth } = require('../middleware');

// Build an authenticated Gmail client for the current user
function getGmailClient(userId) {
  const user = db.prepare('SELECT access_token, refresh_token, token_expiry FROM users WHERE id = ?').get(userId);
  if (!user || !user.access_token) return null;

  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.APP_URL}/api/auth/callback`
  );

  oauth2.setCredentials({
    access_token: user.access_token,
    refresh_token: user.refresh_token,
    expiry_date: user.token_expiry,
  });

  // Auto-refresh listener — persist new tokens
  oauth2.on('tokens', (tokens) => {
    if (tokens.access_token) {
      db.prepare('UPDATE users SET access_token = ?, token_expiry = ? WHERE id = ?')
        .run(tokens.access_token, tokens.expiry_date, userId);
    }
    if (tokens.refresh_token) {
      db.prepare('UPDATE users SET refresh_token = ? WHERE id = ?')
        .run(tokens.refresh_token, userId);
    }
  });

  return google.gmail({ version: 'v1', auth: oauth2 });
}

// ── GET /api/gmail/threads — list inbox threads ──────────
router.get('/threads', requireAuth, async (req, res) => {
  try {
    const gmail = getGmailClient(req.session.userId);
    if (!gmail) return res.status(400).json({ error: 'Gmail not connected' });

    const maxResults = parseInt(req.query.max) || 20;
    const q = req.query.q || '';

    const list = await gmail.users.threads.list({
      userId: 'me',
      maxResults,
      q: q || 'in:inbox',
      labelIds: q ? undefined : ['INBOX'],
    });

    const threads = (list.data.threads || []).map(t => ({
      id: t.id,
      snippet: t.snippet,
      historyId: t.historyId,
    }));

    // Enrich with message headers (subject, from, date)
    const enriched = await Promise.all(threads.map(async (t) => {
      try {
        const detail = await gmail.users.threads.get({
          userId: 'me',
          id: t.id,
          format: 'metadata',
          metadataHeaders: ['Subject', 'From', 'Date'],
        });
        const firstMsg = detail.data.messages[0];
        const headers = firstMsg.payload.headers;
        const get = (name) => (headers.find(h => h.name.toLowerCase() === name.toLowerCase()) || {}).value || '';
        return {
          ...t,
          subject: get('Subject'),
          from: get('From'),
          date: get('Date'),
          messageCount: detail.data.messages.length,
          labelIds: firstMsg.labelIds || [],
        };
      } catch { return t; }
    }));

    res.json(enriched);
  } catch (err) {
    console.error('Gmail threads error:', err.message);
    res.status(500).json({ error: 'Failed to fetch threads' });
  }
});

// ── GET /api/gmail/threads/:id — full thread ─────────────
router.get('/threads/:id', requireAuth, async (req, res) => {
  try {
    const gmail = getGmailClient(req.session.userId);
    if (!gmail) return res.status(400).json({ error: 'Gmail not connected' });

    const detail = await gmail.users.threads.get({
      userId: 'me',
      id: req.params.id,
      format: 'full',
    });

    const messages = detail.data.messages.map((msg) => {
      const headers = msg.payload.headers;
      const get = (name) => (headers.find(h => h.name.toLowerCase() === name.toLowerCase()) || {}).value || '';

      // Extract body
      let body = '';
      function extractBody(parts) {
        if (!parts) return;
        for (const part of parts) {
          if (part.mimeType === 'text/html' && part.body?.data) {
            body = Buffer.from(part.body.data, 'base64url').toString('utf-8');
          } else if (part.mimeType === 'text/plain' && part.body?.data && !body) {
            body = Buffer.from(part.body.data, 'base64url').toString('utf-8');
          }
          if (part.parts) extractBody(part.parts);
        }
      }

      if (msg.payload.body?.data) {
        body = Buffer.from(msg.payload.body.data, 'base64url').toString('utf-8');
      } else {
        extractBody(msg.payload.parts ? [msg.payload] : []);
        if (!body && msg.payload.parts) extractBody(msg.payload.parts);
      }

      return {
        id: msg.id,
        threadId: msg.threadId,
        from: get('From'),
        to: get('To'),
        subject: get('Subject'),
        date: get('Date'),
        body,
        labelIds: msg.labelIds || [],
      };
    });

    res.json({ threadId: req.params.id, messages });
  } catch (err) {
    console.error('Gmail thread detail error:', err.message);
    res.status(500).json({ error: 'Failed to fetch thread' });
  }
});

// ── POST /api/gmail/send — compose or reply ──────────────
router.post('/send', requireAuth, async (req, res) => {
  try {
    const gmail = getGmailClient(req.session.userId);
    if (!gmail) return res.status(400).json({ error: 'Gmail not connected' });

    const { to, subject, body, threadId, inReplyTo, references } = req.body;
    if (!to || !body) return res.status(400).json({ error: 'to and body are required' });

    const user = db.prepare('SELECT email, name FROM users WHERE id = ?').get(req.session.userId);

    let raw = '';
    raw += `From: ${user.name} <${user.email}>\r\n`;
    raw += `To: ${to}\r\n`;
    raw += `Subject: ${subject || '(no subject)'}\r\n`;
    raw += 'Content-Type: text/html; charset=utf-8\r\n';
    if (inReplyTo) raw += `In-Reply-To: ${inReplyTo}\r\n`;
    if (references) raw += `References: ${references}\r\n`;
    raw += '\r\n';
    raw += body;

    const encodedMessage = Buffer.from(raw).toString('base64url');

    const sendOpts = { userId: 'me', requestBody: { raw: encodedMessage } };
    if (threadId) sendOpts.requestBody.threadId = threadId;

    const result = await gmail.users.messages.send(sendOpts);
    res.json({ id: result.data.id, threadId: result.data.threadId });
  } catch (err) {
    console.error('Gmail send error:', err.message);
    res.status(500).json({ error: 'Failed to send email' });
  }
});

module.exports = router;
