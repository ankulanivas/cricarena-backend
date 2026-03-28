const express = require('express');
const router = express.Router();
const { getUserProfile, checkUsername, updateUsername, getUserByUsername, updateProfile, hideChallenge, updateProfileImage } = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/:id', getUserProfile);
router.get('/profile/:username', getUserByUsername);
router.get('/check/:username', checkUsername);
router.post('/username', authMiddleware, updateUsername);
router.post('/profile', authMiddleware, updateProfile);
router.patch('/profile-image', authMiddleware, updateProfileImage);
router.post('/hide-challenge', authMiddleware, hideChallenge);

module.exports = router;

