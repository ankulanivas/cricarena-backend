const { db } = require('../../config/firebase');

// GET /api/users/:id
const getUserProfile = async (req, res) => {
  try {
    const userDoc = await db.collection('users').doc(req.params.id).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }
    const user = userDoc.data();
    // Fetch recent challenges
    const challengesSnapshot = await db.collection('predictions')
      .where('user_id', '==', req.params.id)
      .orderBy('submitted_at', 'desc')
      .limit(10)
      .get();

    const recentPredictions = challengesSnapshot.docs.map(d => d.data());
    return res.status(200).json({
      user: {
        username: user.username,
        name: user.username ? `@${user.username}` : (user.name || 'Anonymous'),
        profile_picture: user.profile_picture || '',
        profileImage: user.profileImage || null,
        challenges_played: user.challenges_played || 0,
        challenges_joined: user.challenges_joined || user.challenges_played || 0,
        wins: user.wins || 0,
        top_3_finishes: user.top_3_finishes || 0,
        best_winning_streak: user.best_winning_streak || 0,
        accuracy: user.accuracy || 0,
        total_predictions: user.total_predictions || 0,
        achievements: user.achievements || [],
        best_score: user.best_score || '0/0',
        recent_predictions: recentPredictions,
      }
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// CHECK /api/users/check/:username
const checkUsername = async (req, res) => {
  const { username } = req.params;
  if (!username || username.length < 3) {
    return res.status(400).json({ error: 'Username too short' });
  }

  try {
    const snapshot = await db.collection('users')
      .where('username', '==', username.toLowerCase())
      .get();
    
    return res.status(200).json({ available: snapshot.empty });
  } catch (error) {
    console.error('Error checking username:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// POST /api/users/username
const updateUsername = async (req, res) => {
  const { username } = req.body;
  const user_id = req.user.uid;

  if (!username || username.length < 3) {
    return res.status(400).json({ error: 'Username must be at least 3 characters' });
  }

  const cleanUsername = username.toLowerCase().trim();

  try {
    // Check if taken
    const snapshot = await db.collection('users')
      .where('username', '==', cleanUsername)
      .get();
    
    if (!snapshot.empty) {
      return res.status(400).json({ error: 'Username already taken' });
    }

    await db.collection('users').doc(user_id).update({
      username: cleanUsername
    });

    return res.status(200).json({ success: true, username: cleanUsername });
  } catch (error) {
    console.error('Error updating username:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /api/users/profile/:username
const getUserByUsername = async (req, res) => {
  try {
    const snapshot = await db.collection('users')
      .where('username', '==', req.params.username.toLowerCase())
      .limit(1)
      .get();

    if (snapshot.empty) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userDoc = snapshot.docs[0];
    const user = userDoc.data();

    return res.status(200).json({
      user: {
        username: user.username,
        name: user.username ? `@${user.username}` : (user.name || 'Anonymous'),
        profile_picture: user.profile_picture || '',
        profileImage: user.profileImage || null,
        challenges_played: user.challenges_played || 0,
        challenges_joined: user.challenges_joined || user.challenges_played || 0,
        wins: user.wins || 0,
        top_3_finishes: user.top_3_finishes || 0,
        best_winning_streak: user.best_winning_streak || 0,
        accuracy: user.accuracy || 0,
        total_predictions: user.total_predictions || 0,
        achievements: user.achievements || [],
        best_score: user.best_score || '0/0',
      }
    });
  } catch (error) {
    console.error('Error fetching user by username:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// POST /api/users/profile
const updateProfile = async (req, res) => {
  const { profile_picture, profileImage } = req.body;
  const user_id = req.user.uid;

  try {
    const userRef = db.collection('users').doc(user_id);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const updates = {};
    if (profile_picture !== undefined) updates.profile_picture = profile_picture;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }

    await userRef.update(updates);
 
    return res.status(200).json({ success: true, message: 'Profile updated' });
  } catch (error) {
    console.error('Error updating profile:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// POST /api/users/hide-challenge
const hideChallenge = async (req, res) => {
  const { challenge_id, action } = req.body; // action: 'hide' or 'unhide'
  const user_id = req.user.uid;

  if (!challenge_id) {
    return res.status(400).json({ error: 'Challenge ID is required' });
  }

  try {
    const userRef = db.collection('users').doc(user_id);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userData = userDoc.data();
    let hiddenChallenges = userData.hidden_challenges || [];

    if (action === 'hide') {
      if (!hiddenChallenges.includes(challenge_id)) {
        hiddenChallenges.push(challenge_id);
      }
    } else if (action === 'unhide') {
      hiddenChallenges = hiddenChallenges.filter(id => id !== challenge_id);
    } else {
      return res.status(400).json({ error: 'Invalid action' });
    }

    await userRef.update({ hidden_challenges: hiddenChallenges });

    return res.status(200).json({ success: true, hidden_challenges: hiddenChallenges });
  } catch (error) {
    console.error('Error updating hidden challenges:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// PATCH /api/users/profile-image
const updateProfileImage = async (req, res) => {
  const { profileImage } = req.body;
  const user_id = req.user.uid;

  if (!profileImage) {
    return res.status(400).json({ error: 'Profile image URL is required' });
  }

  try {
    const userRef = db.collection('users').doc(user_id);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    await userRef.update({ profileImage });

    return res.status(200).json({ success: true, profileImage });
  } catch (error) {
    console.error('Error updating profile image:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { getUserProfile, checkUsername, updateUsername, getUserByUsername, updateProfile, hideChallenge, updateProfileImage };

