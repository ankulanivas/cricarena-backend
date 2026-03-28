const { db } = require('../config/firebase');
const { v4: uuidv4 } = require('uuid');

async function testDynamicChallenge() {
  console.log('--- Testing Dynamic Challenge Creation ---');
  try {
    const creator_id = 'user_1'; //Alice
    const match = {
      matchType: 'international',
      teamA: 'India',
      teamB: 'Australia',
      matchDate: new Date().toISOString(),
      venue: 'Mumbai'
    };

    const match_id = uuidv4();
    const matchData = {
      match_id,
      ...match,
      team1: match.teamA,
      team2: match.teamB,
      match_date: match.matchDate,
      status: 'upcoming',
      created_at: new Date().toISOString(),
      creator_id
    };

    await db.collection('matches').doc(match_id).set(matchData);
    console.log('✅ Match stored in Firestore');

    const challenge_id = uuidv4();
    const challenge = {
      challenge_id,
      match_id,
      match: matchData,
      title: 'Dynamic Test Challenge',
      stakes: 'Coffee',
      creator_id,
      participants: [creator_id],
      status: 'open',
      created_at: new Date().toISOString(),
    };

    await db.collection('challenges').doc(challenge_id).set(challenge);
    console.log('✅ Challenge stored in Firestore');

    // Verify
    const savedMatch = await db.collection('matches').doc(match_id).get();
    const savedChallenge = await db.collection('challenges').doc(challenge_id).get();

    if (savedMatch.exists && savedChallenge.exists) {
      console.log('--- Verification Summary ---');
      console.log('Match Type:', savedMatch.data().matchType);
      console.log('Team A:', savedMatch.data().teamA);
      console.log('Team B:', savedMatch.data().teamB);
      console.log('--- SUCCESS ---');
    } else {
      console.error('❌ Verification Failed: Documents not found');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testDynamicChallenge();
