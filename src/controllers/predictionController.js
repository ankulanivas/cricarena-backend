const { db } = require('../../config/firebase');

// POST /api/predictions
const submitPredictions = async (req, res) => {
  const { challenge_id, answers } = req.body;
  const user_id = req.user.uid;

  if (!challenge_id || !answers) {
    return res.status(400).json({ error: 'challenge_id and answers are required' });
  }

  try {
    const challengeDoc = await db.collection('challenges').doc(challenge_id).get();
    if (!challengeDoc.exists) {
      return res.status(404).json({ error: 'Challenge not found' });
    }

    const challenge = challengeDoc.data();

    if (challenge.status === 'completed') {
      return res.status(403).json({ error: 'Predictions are locked - challenge is completed' });
    }

    // Lock predictions if match has started
    if (challenge.match_start_time && new Date().toISOString() >= challenge.match_start_time) {
      return res.status(403).json({ error: 'Predictions are locked - match has started' });
    }

    if (challenge.match && challenge.match.status === 'live') {
      return res.status(403).json({ error: 'Predictions are locked - match has started' });
    }

    const predictionRef = db.collection('predictions').doc(`${challenge_id}_${user_id}`);
    
    const predictionData = {
      prediction_id: `${challenge_id}_${user_id}`,
      challenge_id,
      user_id,
      answers,
      submitted_at: new Date().toISOString(),
      // Reset score when updating answers
      score: 0,
      scored: false,
    };

    await predictionRef.set(predictionData, { merge: true });

    return res.status(200).json({ prediction: predictionData });
  } catch (error) {
    console.error('Error submitting prediction:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /api/predictions/:challengeId
const getPredictionsByChallenge = async (req, res) => {
  try {
    const snapshot = await db.collection('predictions')
      .where('challenge_id', '==', req.params.challengeId)
      .get();
    const predictions = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    return res.status(200).json({ predictions });
  } catch (error) {
    console.error('Error fetching predictions:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /api/predictions/:challengeId/:userId
const getUserPrediction = async (req, res) => {
  const { challengeId, userId } = req.params;
  try {
    const doc = await db.collection('predictions').doc(`${challengeId}_${userId}`).get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Prediction not found' });
    }
    return res.status(200).json({ prediction: doc.data() });
  } catch (error) {
    console.error('Error fetching user prediction:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /api/predictions/:challengeId/aggregate
const getAggregatePredictions = async (req, res) => {
  try {
    const snapshot = await db.collection('predictions')
      .where('challenge_id', '==', req.params.challengeId)
      .get();

    const aggregate = {};
    for (const doc of snapshot.docs) {
      const { answers } = doc.data();
      for (const [qId, answer] of Object.entries(answers)) {
        if (!aggregate[qId]) aggregate[qId] = {};
        aggregate[qId][answer] = (aggregate[qId][answer] || 0) + 1;
      }
    }

    return res.status(200).json({ aggregate, total: snapshot.size });
  } catch (error) {
    console.error('Error aggregating predictions:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { submitPredictions, getPredictionsByChallenge, getUserPrediction, getAggregatePredictions };
