const { db } = require('../../config/firebase');

// GET /api/leaderboard/:challengeId
const getLeaderboard = async (req, res) => {
  const { challengeId } = req.params;

  try {
    const challengeDoc = await db.collection('challenges').doc(challengeId).get();
    if (!challengeDoc.exists) {
      return res.status(404).json({ error: 'Challenge not found' });
    }

    const challenge = challengeDoc.data();
    const participants = challenge.participants || [];
    
    if (participants.length === 0) {
      return res.status(200).json({ leaderboard: [] });
    }

    const predictionRefs = participants.map(uid => db.collection('predictions').doc(`${challengeId}_${uid}`));
    const predictionDocs = await db.getAll(...predictionRefs);
    
    const validPredictions = predictionDocs.filter(d => d.exists).map(d => ({ id: d.id, ...d.data() }));

    if (validPredictions.length === 0) {
      return res.status(200).json({ leaderboard: [] });
    }

    const userIds = [...new Set(validPredictions.map(p => p.user_id))];
    
    // Fetch user profiles
    const userPromises = userIds.map(uid => db.collection('users').doc(uid).get());
    const userDocs = await Promise.all(userPromises);
    const usersMap = {};
    for (const u of userDocs) {
      if (u.exists) usersMap[u.id] = u.data();
    }

    const leaderboard = validPredictions
      .map(pred => {
        const user = usersMap[pred.user_id] || {};
        const publicName = user.username ? `@${user.username}` : (user.name || 'Anonymous');
        return {
          rank: 0,
          user_id: pred.user_id,
          name: publicName,
          username: user.username || '',
          profile_picture: user.profile_picture || '',
          profileImage: user.profileImage || null,
          score: pred.score || 0,
          scored: pred.scored || false,
          submitted_at: pred.submitted_at,
        };

      })
      .sort((a, b) => {
        if (b.score !== a.score) {
          return b.score - a.score;
        }
        // Tie-breaker: alphabetical username (A-Z)
        const nameA = (a.username || '').toLowerCase();
        const nameB = (b.username || '').toLowerCase();
        return nameA.localeCompare(nameB);
      })
      .map((entry, idx) => ({ ...entry, rank: idx + 1 }));

    return res.status(200).json({ leaderboard });
  } catch (error) {
    console.error('Error building leaderboard:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { getLeaderboard };
