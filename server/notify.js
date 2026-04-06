const { google } = require('googleapis');
const db = require('./db');

// Get all allowed team emails
function getTeamEmails() {
  return (process.env.ALLOWED_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
}

// Find any user with a valid refresh token to send notification emails
function getSenderClient() {
  const user = db.prepare('SELECT * FROM users WHERE refresh_token IS NOT NULL ORDER BY id ASC LIMIT 1').get();
  if (!user) return null;

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

  oauth2.on('tokens', (tokens) => {
    if (tokens.access_token) {
      db.prepare('UPDATE users SET access_token = ?, token_expiry = ? WHERE id = ?')
        .run(tokens.access_token, tokens.expiry_date, user.id);
    }
  });

  return { gmail: google.gmail({ version: 'v1', auth: oauth2 }), sender: user };
}

// Create in-app notification for all team members
function createNotification({ type, title, body, taskId, projectId, excludeEmail }) {
  const emails = getTeamEmails();
  const insert = db.prepare('INSERT INTO notifications (user_email, type, title, body, task_id, project_id) VALUES (?,?,?,?,?,?)');
  for (const email of emails) {
    if (email === excludeEmail?.toLowerCase()) continue; // don't notify the person who made the change
    insert.run(email, type, title, body || '', taskId || null, projectId || null);
  }
}

// Send email notification to all team members (except the actor)
async function sendEmailNotification({ subject, htmlBody, excludeEmail }) {
  try {
    const client = getSenderClient();
    if (!client) return;

    const recipients = getTeamEmails().filter(e => e !== excludeEmail?.toLowerCase());
    if (recipients.length === 0) return;

    const raw = [
      `From: TaskFlow <${client.sender.email}>`,
      `To: ${recipients.join(', ')}`,
      `Subject: [TaskFlow] ${subject}`,
      'Content-Type: text/html; charset=utf-8',
      '',
      htmlBody,
    ].join('\r\n');

    const encodedMessage = Buffer.from(raw).toString('base64url');
    await client.gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw: encodedMessage },
    });
  } catch (err) {
    console.error('Email notification error:', err.message);
    // Non-fatal — app continues working even if email fails
  }
}

// Combined: create in-app + send email
async function notify({ type, title, body, taskId, projectId, excludeEmail }) {
  createNotification({ type, title, body, taskId, projectId, excludeEmail });
  await sendEmailNotification({
    subject: title,
    htmlBody: `
      <div style="font-family: -apple-system, sans-serif; max-width: 500px;">
        <div style="background: #6366f1; color: white; padding: 16px 20px; border-radius: 10px 10px 0 0; font-weight: 700;">
          TaskFlow Notification
        </div>
        <div style="padding: 20px; border: 1px solid #e2e5eb; border-top: none; border-radius: 0 0 10px 10px;">
          <h3 style="margin: 0 0 8px;">${title}</h3>
          <p style="color: #5f6577; margin: 0 0 16px;">${body || ''}</p>
          <a href="${process.env.APP_URL}" style="display: inline-block; padding: 10px 20px; background: #6366f1; color: white; border-radius: 6px; text-decoration: none; font-weight: 600;">Open TaskFlow</a>
        </div>
      </div>
    `,
    excludeEmail,
  });
}

module.exports = { notify, createNotification };
