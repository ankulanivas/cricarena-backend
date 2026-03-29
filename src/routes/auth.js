const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { verifyAndUpsertUser } = require('../controllers/authController');

console.log('[DEBUG] Auth routes loading...');

// POST /api/auth/verify - verify token and create/update user profile
router.post('/verify', authMiddleware, async (req, res, next) => {
  console.log('[DEBUG] POST /api/auth/verify hit');
  try {
    await verifyAndUpsertUser(req, res);
  } catch (error) {
    console.error('[ERROR] /api/auth/verify failed:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

console.log('[DEBUG] Auth routes loaded successfully');

module.exports = router;
