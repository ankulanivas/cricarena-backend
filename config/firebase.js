const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || 'database/config/serviceAccountKey.json';
const projectRoot = path.resolve(__dirname, '..', '..');
const absolutePath = path.isAbsolute(serviceAccountPath) 
  ? serviceAccountPath 
  : path.resolve(projectRoot, serviceAccountPath);

const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'cricarena-b373f';

if (!admin.apps.length) {
  try {
    console.log(`Attempting to load service account from: ${absolutePath}`);
    if (fs.existsSync(absolutePath)) {
      const serviceAccount = JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log('Firebase Admin initialized successfully with service account');
    } else {
      console.warn(`⚠️  Service account not found at ${absolutePath}. Initializing with project ID only.`);
      admin.initializeApp({
        projectId: projectId
      });
      console.log(`Firebase Admin initialized with project ID: ${projectId}`);
    }
  } catch (err) {
    console.error(`❌ Firebase Admin initialization failed: ${err.message}`);
    admin.initializeApp({ 
      projectId: projectId 
    });
  }
}

const db = admin.firestore();

module.exports = { admin, db };
