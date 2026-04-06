const router = require('express').Router();
const { google } = require('googleapis');
const db = require('../db');
const { requireAuth } = require('../middleware');

const SCOPES = [
  'openid',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.modify',
];

function makeOAuth2() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.APP_URL}/api/auth/callback`
  );
}

// Allowed emails from env
function isAllowed(email) {
  const list = (process.env.ALLOWED_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
  if (list.length === 0) return true;           // no allowlist = allow all (dev convenience)
  return list.includes(email.toLowerCase());
}

// ── GET /api/auth/login ──────────────────────────────────
router.get('/login', (req, res) => {
  const oauth2 = makeOAuth2();
  const url = oauth2.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: SCOPES,
  });
  res.redirect(url);
});

// ── GET /api/auth/callback ───────────────────────────────
router.get('/callback', async (req, res) => {
  try {
    const oauth2 = makeOAuth2();
    const { tokens } = await oauth2.getToken(req.query.code);
    oauth2.setCredentials(tokens);

    // Get user info
    const people = google.oauth2({ version: 'v2', auth: oauth2 });
    const { data: profile } = await people.userinfo.get();

    // Check allowlist
    if (!isAllowed(profile.email)) {
      return res.redirect(`${process.env.APP_URL}/access-denied`);
    }

    // Upsert user
    const existing = db.prepare('SELECT id FROM users WHERE google_id = ?').get(profile.id);
    if (existing) {
      db.prepare(`
        UPDATE users SET email=?, name=?, avatar_url=?, access_token=?, refresh_token=COALESCE(?,refresh_token), token_expiry=? WHERE id=?
      `).run(profile.email, profile.name, profile.picture, tokens.access_token, tokens.refresh_token || null, tokens.expiry_date, existing.id);
      req.session.userId = existing.id;
    } else {
      const info = db.prepare(`
        INSERT INTO users (google_id, email, name, avatar_url, access_token, refresh_token, token_expiry)
        VALUES (?,?,?,?,?,?,?)
      `).run(profile.id, profile.email, profile.name, profile.picture, tokens.access_token, tokens.refresh_token, tokens.expiry_date);
      req.session.userId = info.lastInsertRowid;
    }

    req.session.email = profile.email;
    res.redirect(process.env.APP_URL || '/');
  } catch (err) {
    console.error('Auth callback error:', err);
    res.redirect(`${process.env.APP_URL || '/'}/access-denied`);
  }
});

// ── GET /api/auth/me ─────────────────────────────────────
router.get('/me', (req, res) => {
  if (!req.session.userId) return res.json({ user: null });
  const user = db.prepare('SELECT id, email, name, avatar_url FROM users WHERE id = ?').get(req.session.userId);
  res.json({ user: user || null });
});

// ── POST /api/auth/logout ────────────────────────────────
router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.json({ ok: true });
  });
});

module.exports = router;
