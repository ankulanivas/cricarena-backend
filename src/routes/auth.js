const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { verifyAndUpsertUser } = require('../controllers/authController');

// POST /api/auth/verify - verify token and create/update user profile
router.post('/verify', authMiddleware, verifyAndUpsertUser);

module.exports = router;
