const { db } = require('../../config/firebase');
const { v4: uuidv4 } = require('uuid');

// GET /api/matches
const getMatches = async (req, res) => {
  try {
    const { status } = req.query;
    const snapshot = await db.collection('matches').orderBy('match_date', 'asc').get();
    let matches = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    if (status) {
      matches = matches.filter(m => m.status === status);
    }
    
    return res.status(200).json({ matches });
  } catch (error) {
    console.error('Error fetching matches:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /api/matches/:id
const getMatchById = async (req, res) => {
  try {
    const matchDoc = await db.collection('matches').doc(req.params.id).get();
    if (!matchDoc.exists) {
      return res.status(404).json({ error: 'Match not found' });
    }
    return res.status(200).json({ match: { id: matchDoc.id, ...matchDoc.data() } });
  } catch (error) {
    console.error('Error fetching match:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// POST /api/matches (admin only — no strict guard for demo)
const createMatch = async (req, res) => {
  const { team1, team2, match_date, venue } = req.body;
  if (!team1 || !team2 || !match_date) {
    return res.status(400).json({ error: 'team1, team2, and match_date are required' });
  }
  try {
    const match_id = uuidv4();
    const newMatch = {
      match_id,
      team1,
      team2,
      match_date,
      venue: venue || '',
      status: 'upcoming',
      result: null,
      created_at: new Date().toISOString(),
    };
    await db.collection('matches').doc(match_id).set(newMatch);
    return res.status(201).json({ match: newMatch });
  } catch (error) {
    console.error('Error creating match:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// PUT /api/matches/:id/status
const updateMatchStatus = async (req, res) => {
  const { status, result } = req.body;
  try {
    const update = { status };
    if (result) update.result = result;
    await db.collection('matches').doc(req.params.id).update(update);
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error updating match status:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { getMatches, getMatchById, createMatch, updateMatchStatus };
