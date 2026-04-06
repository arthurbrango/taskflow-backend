# TaskFlow — Deployment Guide

This guide walks you through getting TaskFlow running on **Railway** from scratch. No prior experience needed.

---

## Step 1: Create a Google Cloud Project

1. Go to https://console.cloud.google.com
2. Click the project dropdown at the top → **New Project**
3. Name it **TaskFlow** → click **Create**
4. Make sure the new project is selected in the dropdown

---

## Step 2: Enable the Gmail API

1. In the Google Cloud Console, go to **APIs & Services → Library**
2. Search for **Gmail API** → click it → click **Enable**
3. Also search for **Google People API** (or "Google Identity") → **Enable** it

---

## Step 3: Set up the OAuth Consent Screen

1. Go to **APIs & Services → OAuth consent screen**
2. Choose **External** → click **Create**
3. Fill in:
   - App name: `TaskFlow`
   - User support email: your email
   - Developer email: your email
4. Click **Save and Continue**
5. On the **Scopes** screen, click **Add or Remove Scopes** and add:
   - `openid`
   - `https://www.googleapis.com/auth/userinfo.email`
   - `https://www.googleapis.com/auth/userinfo.profile`
   - `https://www.googleapis.com/auth/gmail.readonly`
   - `https://www.googleapis.com/auth/gmail.send`
   - `https://www.googleapis.com/auth/gmail.modify`
6. Click **Save and Continue** through the remaining steps
7. On the **Test users** page, add the email addresses of your team members
8. Click **Save and Continue** → **Back to Dashboard**

> **Note:** While your app is in "Testing" mode, only the test users you add can sign in. To allow any approved email to sign in without adding test users, you'll eventually want to publish the app (click "Publish App" on the consent screen).

---

## Step 4: Create OAuth Credentials

1. Go to **APIs & Services → Credentials**
2. Click **Create Credentials → OAuth client ID**
3. Application type: **Web application**
4. Name: `TaskFlow Web`
5. Under **Authorized redirect URIs**, add:
   - For local testing: `http://localhost:4000/api/auth/callback`
   - For Railway (you'll add the real URL later): `https://YOUR-APP.up.railway.app/api/auth/callback`
6. Click **Create**
7. **Copy the Client ID and Client Secret** — you'll need these

---

## Step 5: Push Code to GitHub

1. Create a new repository on https://github.com/new
2. Name it `taskflow` (private recommended)
3. Push your code:

```bash
cd taskflow
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/taskflow.git
git push -u origin main
```

---

## Step 6: Deploy on Railway

1. Go to https://railway.app and sign in with GitHub
2. Click **New Project → Deploy from GitHub Repo**
3. Select your `taskflow` repository
4. Railway will auto-detect Node.js

### Set Environment Variables

In your Railway project, go to **Variables** and add:

| Variable | Value |
|----------|-------|
| `GOOGLE_CLIENT_ID` | Your Client ID from Step 4 |
| `GOOGLE_CLIENT_SECRET` | Your Client Secret from Step 4 |
| `APP_URL` | Your Railway URL (e.g. `https://taskflow-production.up.railway.app`) — set this after getting your URL |
| `SESSION_SECRET` | A long random string (e.g. `jk39fh2k5nv83hd72bx0pq`) |
| `ALLOWED_EMAILS` | Comma-separated emails: `mark@gmail.com,sarah@gmail.com,james@gmail.com` |
| `NODE_ENV` | `production` |

### Set Build & Start Commands

In Railway **Settings**:
- **Build Command:** `npm install && npm run build`
- **Start Command:** `npm start`

### Get Your URL

1. In Railway, go to **Settings → Networking → Generate Domain**
2. Copy the generated URL (e.g. `https://taskflow-production.up.railway.app`)
3. Set `APP_URL` to this URL in your environment variables
4. Go back to Google Cloud Console → Credentials → your OAuth client → add this URL + `/api/auth/callback` as an authorized redirect URI

---

## Step 7: Test It

1. Visit your Railway URL
2. Click **Sign in with Google**
3. Sign in with one of the approved email addresses
4. You should see the TaskFlow dashboard with projects and tasks

---

## Managing Your Team

### Add a new team member

1. Add their email to the `ALLOWED_EMAILS` environment variable in Railway (comma-separated)
2. Also add them as a test user in Google Cloud Console → OAuth consent screen (if still in testing mode)
3. They can now sign in and their Gmail will be connected automatically

### Remove a team member

1. Remove their email from `ALLOWED_EMAILS` in Railway
2. They'll no longer be able to sign in

### Add team members to the task board

Once signed in, team members show up in the assignment dropdown. To add more display names for task assignment, you can use the app's team management or insert them directly into the SQLite database.

---

## How It Works

### Authentication Flow
1. User clicks "Sign in with Google" → redirected to Google
2. Google asks for permissions (email, profile, Gmail)
3. Google redirects back to `/api/auth/callback` with an auth code
4. Server exchanges code for access + refresh tokens
5. Server checks email against `ALLOWED_EMAILS`
6. If approved → creates session; if not → shows "Access Denied"

### Gmail Integration
- Each user's Gmail tokens are stored in the SQLite database
- When viewing inbox, the server uses the user's tokens to call Gmail API
- Tokens auto-refresh when they expire
- Each user only sees their own email — no shared inbox

### Data Storage
- All data (users, projects, tasks, team members) lives in a SQLite file at `data/taskflow.db`
- Sessions are stored in `data/sessions.db`
- On Railway, this data persists across deploys within the same volume
- **Important:** If you need persistent storage on Railway, attach a volume mounted at `/app/data`

### Team Allowlist
- Controlled by the `ALLOWED_EMAILS` environment variable
- Comma-separated list of Google email addresses
- If the list is empty, all Google accounts can sign in (not recommended for production)

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Access Denied" after login | Add the email to `ALLOWED_EMAILS` and Google test users |
| Gmail shows "not connected" | Sign out and sign back in; check Gmail API is enabled in Google Cloud |
| OAuth error on callback | Verify `APP_URL` matches your Railway domain; check redirect URI in Google credentials |
| App won't start on Railway | Check build logs; ensure `npm run build` completes; verify all env vars are set |

---

## Local Development

```bash
# 1. Copy env file
cp .env.example .env
# Edit .env with your Google credentials

# 2. Install dependencies
npm install

# 3. Build frontend
npm run build

# 4. Start server
npm start
# Visit http://localhost:4000

# Or for hot-reload development:
# Terminal 1: npm run dev:server
# Terminal 2: npm run dev:client (runs on port 3000, proxies API to 4000)
```
