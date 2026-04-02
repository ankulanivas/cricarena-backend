const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const {
  createChallenge,
  getChallengeById,
  joinChallenge,
  enterResults,
  getUserChallenges,
  checkAutomatedResults,
  createChallengeFromTemplate,
} = require('../controllers/challengeController');

router.get('/user/:userId', authMiddleware, getUserChallenges);
router.get('/:id', getChallengeById);
router.post('/', authMiddleware, createChallenge);
router.post('/:id/create-from-template', authMiddleware, createChallengeFromTemplate);
router.post('/:id/join', authMiddleware, joinChallenge);
router.put('/:id/results', authMiddleware, enterResults);
// router.post('/:id/auto-evaluate', authMiddleware, checkAutomatedResults);

module.exports = router;
