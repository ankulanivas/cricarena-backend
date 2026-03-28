const { db } = require('../config/firebase');

async function testMatchQuery() {
  console.log('Testing getMatches query logic...');
  try {
    const status = 'upcoming';
    let query = db.collection('matches').orderBy('match_date', 'asc');
    if (status) {
      query = query.where('status', '==', status);
    }
    console.log('Executing query...');
    const snapshot = await query.get();
    console.log('Query successful, found', snapshot.size, 'matches');
    process.exit(0);
  } catch (error) {
    console.error('❌ Query Failed!');
    console.error('Error Code:', error.code);
    console.error('Error Message:', error.message);
    if (error.details) console.error('Details:', error.details);
    process.exit(1);
  }
}

testMatchQuery();
