const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const {
  submitPredictions,
  getPredictionsByChallenge,
  getUserPrediction,
  getAggregatePredictions,
} = require('../controllers/predictionController');

router.post('/', authMiddleware, submitPredictions);
router.get('/:challengeId/aggregate', getAggregatePredictions);
router.get('/:challengeId/all', getPredictionsByChallenge);
router.get('/:challengeId/:userId', getUserPrediction);

module.exports = router;
