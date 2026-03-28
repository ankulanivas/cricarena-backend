const { admin, db } = require('../../config/firebase');

// POST /api/auth/verify
const verifyAndUpsertUser = async (req, res) => {
  const { uid, name, email, picture } = req.user;
  console.log(`Backend: Verifying/Upserting user: ${email} (UID: ${uid})`);

  try {
    const userRef = db.collection('users').doc(uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      console.log(`Backend: Creating new user profile for ${email}`);
      await userRef.set({
        user_id: uid,
        name: name || 'Anonymous',
        username: null,
        email: email || '',
        profile_picture: picture || '',
        wins: 0,
        predictions_played: 0,
        accuracy: 0,
        created_at: new Date().toISOString(),
      });
    } else {
      console.log(`Backend: User profile already exists for ${email}`);
    }

    const updatedUser = (await userRef.get()).data();
    return res.status(200).json({ user: updatedUser });
  } catch (error) {
    console.error('Error upserting user:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { verifyAndUpsertUser };
