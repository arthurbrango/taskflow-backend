require('dotenv').config();
const express = require('express');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const helmet = require('helmet');
const morgan = require('morgan');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// Ensure data dir for session store
fs.mkdirSync(path.join(__dirname, '..', 'data'), { recursive: true });

// Initialise DB (runs schema + seed)
require('./db');

const app = express();
const PORT = process.env.PORT || 4000;
const isProd = process.env.NODE_ENV === 'production';

// ── Middleware ────────────────────────────────────────────

app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(morgan('tiny'));
app.use(express.json());

if (!isProd) {
  app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
}

app.set('trust proxy', 1);

app.use(session({
  store: new SQLiteStore({ dir: path.join(__dirname, '..', 'data'), db: 'sessions.db' }),
  secret: process.env.SESSION_SECRET || 'taskflow-dev-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: isProd,
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000,           // 7 days
    sameSite: isProd ? 'none' : 'lax',
  },
}));

// ── API Routes ───────────────────────────────────────────

app.use('/api/auth',          require('./routes/auth'));
app.use('/api/projects',      require('./routes/projects'));
app.use('/api/tasks',         require('./routes/tasks'));
app.use('/api/team',          require('./routes/team'));
app.use('/api/gmail',         require('./routes/gmail'));
app.use('/api/notes',         require('./routes/notes'));
app.use('/api/notifications', require('./routes/notifications'));

// ── Serve React build in production ──────────────────────

const clientBuild = path.join(__dirname, '..', 'client', 'build');
if (fs.existsSync(clientBuild)) {
  app.use(express.static(clientBuild));
  app.get('*', (_req, res) => res.sendFile(path.join(clientBuild, 'index.html')));
}

// ── Start ────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`✓ TaskFlow running on port ${PORT}`);
});
