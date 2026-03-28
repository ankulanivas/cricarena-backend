const express = require('express');
const router = express.Router();
const { getLeaderboard } = require('../controllers/leaderboardController');

router.get('/:challengeId', getLeaderboard);

module.exports = router;
