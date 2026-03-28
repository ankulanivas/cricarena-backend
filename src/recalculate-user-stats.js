const { db } = require('../config/firebase');

async function recalculateAllStats() {
  console.log('--- Starting Robust Stats Recalculation ---');
  
  try {
    const usersSnapshot = await db.collection('users').get();
    const users = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Fetch ALL challenges to count participation (joined/created)
    const allChallengesSnapshot = await db.collection('challenges').get();
    const allChallenges = allChallengesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const completedChallenges = allChallenges.filter(c => c.status === 'completed');

    console.log(`Processing ${users.length} users across ${allChallenges.length} total challenges (${completedChallenges.length} completed)...`);

    for (const user of users) {
      console.log(`\nProcessing user: ${user.username || user.id}`);
      
      // 1. Challenges Played/Joined
      const userChallenges = allChallenges.filter(c => c.participants && c.participants.includes(user.id));
      const challenges_joined = userChallenges.length;

      // 2. Accuracy Calculation (only from completed challenges)
      let total_predictions = 0;
      let total_correct = 0;
      
      const userCompletedChallenges = completedChallenges.filter(c => c.participants && c.participants.includes(user.id));

      // Sort completed challenges by date for streak calculation
      const sortedCompleted = userCompletedChallenges.sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );

      let wins = 0;
      let top_3_finishes = 0;
      let current_winning_streak = 0;
      let best_winning_streak = 0;
      let best_score = '0/0';
      let best_score_value = 0;

      for (const challenge of sortedCompleted) {
        // Fetch prediction for this user
        const predDoc = await db.collection('predictions').doc(`${challenge.id}_${user.id}`).get();
        
        if (predDoc.exists) {
          const pred = predDoc.data();
          const qCount = (challenge.questions || []).length;
          const score = (pred.score || 0);
          total_predictions += qCount;
          total_correct += score;

          // Best Score logic
          if (score > best_score_value) {
            best_score = `${score}/${qCount}`;
            best_score_value = score;
          } else if (score === best_score_value && best_score_value > 0) {
            const currentTotal = parseInt(best_score.split('/')[1]) || 999;
            if (qCount < currentTotal) {
              best_score = `${score}/${qCount}`;
            }
          }

          // Calculate Rank for this challenge
          // ...
          const allChallengePreds = await db.collection('predictions')
            .where('challenge_id', '==', challenge.id)
            .get();
          
          const scores = allChallengePreds.docs.map(d => ({ 
            userId: d.data().user_id, 
            score: d.data().score || 0 
          }));
          
          const sortedScores = scores.sort((a, b) => b.score - a.score);
          const userScore = (pred.score || 0);
          const rank = sortedScores.findIndex(s => s.score === userScore) + 1;

          const isWin = rank === 1;
          const isTop3 = rank <= 3;

          if (isWin) {
            wins++;
            current_winning_streak++;
            best_winning_streak = Math.max(best_winning_streak, current_winning_streak);
          } else {
            current_winning_streak = 0;
          }

          if (isTop3) {
            top_3_finishes++;
          }
        }
      }

      const accuracy = total_predictions > 0 
        ? Math.round((total_correct / total_predictions) * 100) 
        : 0;

      console.log(`Final Stats for ${user.username}:`);
      console.log(` - Joined/Played: ${challenges_joined}`);
      console.log(` - Wins (#1): ${wins}`);
      console.log(` - Top 3: ${top_3_finishes}`);
      console.log(` - Best Streak: ${best_winning_streak}`);
      console.log(` - Accuracy: ${accuracy}% (${total_correct}/${total_predictions})`);

      await db.collection('users').doc(user.id).update({
        challenges_joined,
        challenges_played: challenges_joined,
        wins,
        top_3_finishes,
        current_winning_streak,
        best_winning_streak,
        total_predictions,
        total_correct,
        accuracy: isNaN(accuracy) ? 0 : accuracy,
        best_score,
        best_score_value
      });
    }

    console.log('\n--- Recalculation Complete ---');
  } catch (error) {
    console.error('Error during recalculation:', error);
  }
}

recalculateAllStats();
