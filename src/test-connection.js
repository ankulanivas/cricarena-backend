const { db } = require('../config/firebase');

async function testConnection() {
  console.log('--- Firestore Connection Test ---');
  try {
    // Attempt to list collections as a basic connectivity test
    const collections = await db.listCollections();
    console.log('✅ Successfully connected to Firestore!');
    console.log('Found collections:', collections.map(c => c.id).join(', ') || 'None (new database)');

    // Attempt a test write/read if it's a completely empty DB (optional but good for validation)
    if (collections.length === 0) {
      console.log('Attempting to create a test document...');
      const testDoc = db.collection('_test_connection_').doc('heartbeat');
      await testDoc.set({
        timestamp: new Date().toISOString(),
        message: 'Firebase Admin connection verified'
      });
      console.log('✅ Successfully wrote test document!');

      const doc = await testDoc.get();
      console.log('✅ Successfully read test document back:', doc.data());

      // Cleanup
      await testDoc.delete();
      console.log('✅ Successfully cleaned up test document.');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Firestore connection failed:');
    console.error(error);
    process.exit(1);
  }
}

testConnection();
