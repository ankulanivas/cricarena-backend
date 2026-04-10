const admin = require('firebase-admin');
require('dotenv').config();

if (!admin.apps.length) {
  try {
    let serviceAccount;

    // ✅ OPTION 1: JSON from ENV (Production)
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      console.log('✅ Using Firebase service account from ENV');
    }

    // ✅ OPTION 2: Local file (Development)
    else if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
      serviceAccount = require(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
      console.log('✅ Using Firebase service account from FILE PATH');
    }

    // ❌ No credentials
    else {
      throw new Error('No Firebase credentials provided');
    }

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

  } catch (err) {
    console.error('❌ Firebase Init Error:', err.message);
    throw err;
  }
}

const db = admin.firestore();

module.exports = { admin, db };