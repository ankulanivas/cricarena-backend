const admin = require('firebase-admin');
require('dotenv').config();

/**
 * Initialize Firebase Admin SDK
 * 
 * We now strictly use the FIREBASE_SERVICE_ACCOUNT environment variable 
 * for both local and production environments to ensure consistent behavior 
 * and prevent permission errors.
 */

if (!admin.apps.length) {
  try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log('✅ Firebase Admin initialized successfully with service account from ENV');
    } else {
      console.error('❌ CRITICAL: Missing FIREBASE_SERVICE_ACCOUNT environment variable');
      console.error('Please ensure the full service account JSON is set in your Render dashboard or .env file.');
      
      // We do NOT use project-id only fallback anymore as it lack permissions for Firestore/Auth.
      // This will throw an error and prevent the app from running in an insecure state.
      throw new Error('Firebase Admin initialization failed: No credentials provided');
    }
  } catch (err) {
    console.error(`❌ Firebase Admin Initialization Error: ${err.message}`);
    throw err;
  }
}

const db = admin.firestore();

module.exports = { admin, db };
