const { db } = require('../config/firebase');

async function debugScoring(challengeId) {
  console.log(`--- Debugging Scoring for Challenge: ${challengeId} ---`);
  try {
    const challengeDoc = await db.collection('challenges').doc(challengeId).get();
    if (!challengeDoc.exists) {
      console.error('Challenge not found');
      return;
    }

    const challenge = challengeDoc.data();
    console.log('Challenge Title:', challenge.title);
    console.log('Correct Answers:', JSON.stringify(challenge.correct_answers, null, 2));
    console.log('Match Status:', challenge.match?.status);

    const predictionsSnapshot = await db.collection('predictions')
      .where('challenge_id', '==', challengeId)
      .get();

    console.log(`Found ${predictionsSnapshot.size} predictions.`);

    for (const doc of predictionsSnapshot.docs) {
      const pred = doc.data();
      const userRef = await db.collection('users').doc(pred.user_id).get();
      const userName = userRef.exists ? userRef.data().name : 'Unknown';
      
      console.log(`\nUser: ${userName} (${pred.user_id})`);
      console.log(`Answers: ${JSON.stringify(pred.answers, null, 2)}`);
      console.log(`Stored Score: ${pred.score}`);
      console.log(`Scored Flag: ${pred.scored}`);

      // Simulated Scoring
      let score = 0;
      const questions = challenge.questions || [];
      for (const q of questions) {
        const userAnswer = pred.answers[q.id];
        const correctAnswer = challenge.correct_answers[q.id];
        const match = userAnswer !== undefined && correctAnswer !== undefined &&
          String(userAnswer).toLowerCase().trim() === String(correctAnswer).toLowerCase().trim();
        
        if (match) score += 1;
        
        console.log(`- Question ${q.id}: User[${userAnswer}] vs Correct[${correctAnswer}] -> ${match ? 'MATCH' : 'NO MATCH'}`);
      }
      console.log(`Simulated Score: ${score}`);
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

const targetChallengeId = process.argv[2];
if (!targetChallengeId) {
    console.error('Please provide a challengeId');
    process.exit(1);
}

debugScoring(targetChallengeId);
