const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { getMatches, getMatchById, createMatch, updateMatchStatus, searchMatches } = require('../controllers/matchController');

// Test route for connectivity
router.get('/test', (req, res) => {
  res.json({ success: true, message: "Backend is reachable!" });
});

// Search matches via CricAPI
router.get('/search', searchMatches);

// Standard matches routes
router.get('/', getMatches);
router.get('/:id', getMatchById);
router.post('/', authMiddleware, createMatch);
router.put('/:id/status', authMiddleware, updateMatchStatus);

module.exports = router;
