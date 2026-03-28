const { db } = require('../config/firebase');

async function testMatchQueryFixed() {
  console.log('Testing refactored getMatches logic (in-memory filtering)...');
  try {
    const status = 'upcoming';
    // This query ONLY orders, avoiding the composite index requirement for where + orderBy
    const snapshot = await db.collection('matches').orderBy('match_date', 'asc').get();
    let matches = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    if (status) {
      matches = matches.filter(m => m.status === status);
    }
    
    console.log('Query successful, found', matches.length, 'matches after filtering');
    process.exit(0);
  } catch (error) {
    console.error('❌ Query Failed!');
    console.error('Error Message:', error.message);
    process.exit(1);
  }
}

testMatchQueryFixed();
