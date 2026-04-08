require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const matchRoutes = require('./routes/matches');
const challengeRoutes = require('./routes/challenges');
const predictionRoutes = require('./routes/predictions');
const leaderboardRoutes = require('./routes/leaderboard');
const userRoutes = require('./routes/users');
const aiRoutes = require('./routes/ai');
const { runAutoEvaluation } = require('./jobs/autoEvaluateJob');

console.log('[SYSTEM] Registering API Routes...');

const app = express();
const PORT = process.env.PORT || 5000;

// 1. CORS Setup - MUST BE FIRST
const allowedOrigins = [
  'http://localhost:3000',
  'https://cricarena-b373f.web.app'
];

app.use(cors({
  origin: function(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log("CORS BLOCKED:", origin);
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
}));

// 2. Manual preflight handler (VERY IMPORTANT)
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "https://cricarena-b373f.web.app");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }

  next();
});

// 3. Express JSON - SECOND
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/challenges', challengeRoutes);
app.use('/api/predictions', predictionRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/users', userRoutes);
app.use('/api/ai', aiRoutes);

console.log('[SYSTEM] API Routes Registered Successfully');


// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found', path: req.originalUrl });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, () => {
  console.log(`🏏 CricArena API running on http://localhost:${PORT}`);
  
  // Start background automation job (every 2 minutes) - DISABLED
  /*
  console.log('[SYSTEM] Starting Auto-Evaluation Background Job...');
  setInterval(() => {
    runAutoEvaluation();
  }, 2 * 60 * 1000);
  */
});

module.exports = app;
