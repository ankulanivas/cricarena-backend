const { admin, db } = require('../config/firebase');
const { v4: uuidv4 } = require('uuid');

async function simulateE2E() {
  console.log('--- Starting E2E Flow Simulation ---');

  try {
    // 1. Create Mock Users
    const users = [
      { uid: 'user_1', name: 'Alice', email: 'alice@example.com' },
      { uid: 'user_2', name: 'Bob', email: 'bob@example.com' },
      { uid: 'user_3', name: 'Charlie', email: 'charlie@example.com' },
    ];

    for (const u of users) {
      await db.collection('users').doc(u.uid).set({
        ...u,
        wins: 0,
        predictions_played: 0,
        accuracy: 0,
        created_at: new Date().toISOString(),
      });
      console.log(`✅ User created: ${u.name}`);
    }

    // 2. Create a Match
    const match_id = 'test_match_' + Date.now();
    await db.collection('matches').doc(match_id).set({
      match_id,
      team1: 'India',
      team2: 'Australia',
      match_date: new Date(Date.now() + 86400000).toISOString(), // tomorrow
      venue: 'Wankhede Stadium',
      status: 'upcoming',
      result: null,
      created_at: new Date().toISOString(),
    });
    console.log(`✅ Match created: India vs Australia`);

    // 3. Create a Challenge (Alice is the creator)
    const challenge_id = 'test_challenge_' + Date.now();
    const questions = [
      { id: 'toss_winner', label: 'Toss Winner', type: 'team_pick' },
      { id: 'match_winner', label: 'Match Winner', type: 'team_pick' },
    ];

    await db.collection('challenges').doc(challenge_id).set({
      challenge_id,
      match_id,
      match: { team1: 'India', team2: 'Australia', status: 'upcoming' },
      title: 'E2E Test Challenge',
      stakes: 'Glory',
      creator_id: 'user_1',
      questions,
      participants: ['user_1', 'user_2', 'user_3'],
      status: 'open',
      results_entered: false,
      correct_answers: {},
      created_at: new Date().toISOString(),
    });
    console.log(`✅ Challenge created by Alice`);

    // 4. Submit Predictions
    const predictions = [
      { uid: 'user_1', answers: { toss_winner: 'India', match_winner: 'India' } },
      { uid: 'user_2', answers: { toss_winner: 'India', match_winner: 'Australia' } },
      { uid: 'user_3', answers: { toss_winner: 'Australia', match_winner: 'Australia' } },
    ];

    for (const p of predictions) {
      await db.collection('predictions').doc(`${challenge_id}_${p.uid}`).set({
        prediction_id: `${challenge_id}_${p.uid}`,
        challenge_id,
        user_id: p.uid,
        answers: p.answers,
        score: 0,
        scored: false,
        submitted_at: new Date().toISOString(),
      });
      console.log(`✅ Prediction submitted by ${users.find(u => u.uid === p.uid).name}`);
    }

    // 5. Enter Results (Creator Alice enters results)
    console.log('--- Entering Results (Toss: India, Winner: India) ---');
    const correct_answers = { toss_winner: 'India', match_winner: 'India' };
    
    // Simulate the logic in challengeController.enterResults
    const challengeRef = db.collection('challenges').doc(challenge_id);
    await challengeRef.update({
      correct_answers,
      results_entered: true,
      status: 'completed',
    });

    const predictionsSnapshot = await db.collection('predictions')
      .where('challenge_id', '==', challenge_id)
      .get();

    const batch = db.batch();
    for (const predDoc of predictionsSnapshot.docs) {
      const pred = predDoc.data();
      let score = 0;
      for (const [qId, ans] of Object.entries(correct_answers)) {
        if (pred.answers[qId] === ans) score += 1;
      }
      batch.update(predDoc.ref, { score, scored: true });
      console.log(`✅ Scored ${users.find(u => u.uid === pred.user_id).name}: ${score} points`);
    }
    await batch.commit();

    // 6. Verify Leaderboard
    console.log('--- Final Leaderboard ---');
    const finalPreds = await db.collection('predictions')
      .where('challenge_id', '==', challenge_id)
      .get();
    
    const leaderboard = finalPreds.docs
      .map(d => ({ user_id: d.data().user_id, score: d.data().score }))
      .sort((a, b) => b.score - a.score);

    leaderboard.forEach((entry, idx) => {
      const name = users.find(u => u.uid === entry.user_id).name;
      console.log(`${idx + 1}. ${name}: ${entry.score} pts`);
    });

    console.log('--- E2E Flow Simulation Successful ---');
    process.exit(0);
  } catch (error) {
    console.error('❌ Simulation Failed:', error);
    process.exit(1);
  }
}

simulateE2E();
