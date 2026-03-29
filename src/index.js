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

// CORS - MUST BE AT TOP (BEFORE ROUTES)
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://cricarena.web.app',
    'https://cricarena.firebaseapp.com',
    'https://cricarena-b373f.web.app'
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  credentials: true,
}));

// Preflight requests
app.options("*", cors());

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
