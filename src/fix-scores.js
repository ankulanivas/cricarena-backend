const { db } = require('../config/firebase');

async function fixScores(challengeId) {
  console.log(`--- Fixing Scores for Challenge: ${challengeId} ---`);
  try {
    const challengeDoc = await db.collection('challenges').doc(challengeId).get();
    if (!challengeDoc.exists) {
      console.error('Challenge not found');
      return;
    }

    const challenge = challengeDoc.data();
    const correctAnswers = challenge.correct_answers || {};
    const questions = challenge.questions || [];

    const predictionsSnapshot = await db.collection('predictions')
      .where('challenge_id', '==', challengeId)
      .get();

    console.log(`Found ${predictionsSnapshot.size} predictions.`);

    const batch = db.batch();
    const userScoreUpdates = [];

    for (const doc of predictionsSnapshot.docs) {
      const pred = doc.data();
      let score = 0;
      
      for (const q of questions) {
        const userAnswer = pred.answers?.[q.id];
        const correctAnswer = correctAnswers[q.id];
        if (userAnswer !== undefined && correctAnswer !== undefined &&
          String(userAnswer).toLowerCase().trim() === String(correctAnswer).toLowerCase().trim()) {
          score += 1;
        }
      }

      console.log(`User ${pred.user_id}: ${score}/${questions.length}`);
      batch.update(doc.ref, { score, scored: true });
      userScoreUpdates.push({ user_id: pred.user_id, score, total: questions.length });
    }

    await batch.commit();
    console.log('✅ Predictions updated.');

    for (const { user_id: uid, score, total } of userScoreUpdates) {
      const userRef = db.collection('users').doc(uid);
      const userDoc = await userRef.get();
      if (userDoc.exists) {
        const u = userDoc.data();
        const currentPlayed = u.predictions_played || 0;
        const currentAccuracy = u.accuracy || 0;
        const played = currentPlayed + 1;
        const wins = score === total ? (u.wins || 0) + 1 : (u.wins || 0);
        
        const totalCorrectSoFar = (currentAccuracy / 100) * currentPlayed * total;
        const newTotalCorrect = totalCorrectSoFar + score;
        const accuracy = total > 0 ? Math.round((newTotalCorrect / (played * total)) * 100) : 0;
        
        await userRef.update({ 
          predictions_played: played, 
          wins, 
          accuracy: isNaN(accuracy) ? 0 : accuracy 
        });
        console.log(`✅ Stats updated for user ${uid}`);
      }
    }

    console.log('--- ALL SCORES FIXED ---');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

const targetChallengeId = process.argv[2];
if (!targetChallengeId) {
    console.error('Please provide a challengeId');
    process.exit(1);
}

fixScores(targetChallengeId);
