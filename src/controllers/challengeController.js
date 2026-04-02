const { admin, db } = require('../../config/firebase');
const { v4: uuidv4 } = require('uuid');
const { getMatchResult } = require('../services/sportsMonksService');
const { evaluatePredictions } = require('../services/scoringService');

const DEFAULT_QUESTIONS = [
  { id: 'toss_winner', label: 'Toss Winner', type: 'team_pick' },
  { id: 'match_winner', label: 'Match Winner', type: 'team_pick' },
  { id: 'top_scorer', label: 'Top Scorer (Batting)', type: 'text' },
  { id: 'total_runs_range', label: 'Total Runs Range', type: 'choice', options: ['< 140', '140-160', '161-180', '181-200', '200+'] },
  { id: 'player_of_match', label: 'Player of the Match', type: 'text' },
];

const createChallenge = async (req, res) => {
  const { match, title, stakes, custom_questions, sportsMonksFixtureId } = req.body;
  const creator_id = req.user.uid;

  if (!match || !title) {
    return res.status(400).json({ error: 'match details and title are required' });
  }

  try {
    const match_id = uuidv4();
    const matchData = {
      match_id,
      ...match, // matchType, teamA, teamB, matchDate, venue
      team1: match.teamA, // Compatibility with existing UI
      team2: match.teamB, // Compatibility with existing UI
      match_date: match.matchDate, // Compatibility with existing UI
      status: 'upcoming',
      created_at: new Date().toISOString(),
      creator_id
    };

    await db.collection('matches').doc(match_id).set(matchData);

    const challenge_id = uuidv4();
    const questions = custom_questions && custom_questions.length > 0
      ? custom_questions
      : DEFAULT_QUESTIONS;

    const challenge = {
      challenge_id,
      match_id,
      match: matchData,
      title,
      stakes: stakes || '',
      creator_id,
      questions,
      match_start_time: matchData.match_date,
      participants: [creator_id],
      status: 'open',
      results_entered: false,
      correct_answers: {},
      sportsMonksFixtureId: sportsMonksFixtureId || null,
      created_at: new Date().toISOString(),
    };

    await db.collection('challenges').doc(challenge_id).set(challenge);

    // Update creator stats
    const userRef = db.collection('users').doc(creator_id);
    await userRef.update({
      challenges_joined: admin.firestore.FieldValue.increment(1),
      challenges_played: admin.firestore.FieldValue.increment(1),
    });

    return res.status(201).json({ challenge });
  } catch (error) {
    console.error('Error creating challenge:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /api/challenges/:id
const getChallengeById = async (req, res) => {
  try {
    const doc = await db.collection('challenges').doc(req.params.id).get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Challenge not found' });
    }
    const challengeData = doc.data();
    const creatorDoc = await db.collection('users').doc(challengeData.creator_id).get();
    const creatorUsername = creatorDoc.exists ? creatorDoc.data().username : null;

    return res.status(200).json({ 
      challenge: { 
        id: doc.id, 
        ...challengeData,
        creator_username: creatorUsername
      } 
    });
  } catch (error) {
    console.error('Error fetching challenge:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// POST /api/challenges/:id/join
const joinChallenge = async (req, res) => {
  const user_id = req.user.uid;
  const challenge_id = req.params.id;

  try {
    const challengeRef = db.collection('challenges').doc(challenge_id);
    const doc = await challengeRef.get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Challenge not found' });
    }

    const data = doc.data();
    if (data.status === 'completed') {
      return res.status(403).json({ error: 'This challenge is completed and cannot be joined' });
    }

    if (!data.participants.includes(user_id)) {
      await challengeRef.update({
        participants: [...data.participants, user_id],
      });
      
      // Update user stats
      const userRef = db.collection('users').doc(user_id);
      await userRef.update({
        challenges_joined: admin.firestore.FieldValue.increment(1),
        // Compatibility
        challenges_played: admin.firestore.FieldValue.increment(1),
      });
    }

    return res.status(200).json({ success: true, message: 'Joined challenge' });
  } catch (error) {
    console.error('Error joining challenge:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// PUT /api/challenges/:id/results
const enterResults = async (req, res) => {
  const { correct_answers } = req.body;
  const user_id = req.user.uid;
  const challenge_id = req.params.id;

  try {
    const challengeRef = db.collection('challenges').doc(challenge_id);
    const doc = await challengeRef.get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Challenge not found' });
    }

    const challenge = doc.data();
    if (challenge.creator_id !== user_id) {
      return res.status(403).json({ error: 'Only the creator can enter results' });
    }

    if (challenge.results_entered) {
      return res.status(400).json({ error: 'Results have already been entered' });
    }

    // await evaluatePredictions(challenge_id, correct_answers);
    return res.status(200).json({ success: true, message: 'Result entry received, but evaluation is currently disabled' });
  } catch (error) {
    console.error('Error entering results:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

/**
 * Automatically check and process results for a challenge using SportsMonks
 */
const checkAutomatedResults = async (req, res) => {
    // Feature disabled: Automatic result evaluation via SportsMonks
    return res.status(200).json({ message: "Auto evaluation disabled" });

    const challenge_id = req.params.id;

    try {
        const challengeRef = db.collection('challenges').doc(challenge_id);
        const doc = await challengeRef.get();
        if (!doc.exists) return res.status(404).json({ error: 'Challenge not found' });

        const challenge = doc.data();
        if (challenge.results_entered) return res.status(400).json({ error: 'Results already processed' });
        if (!challenge.sportsMonksFixtureId) return res.status(400).json({ error: 'No SportsMonks Fixture ID linked' });

        const matchResult = await getMatchResult(challenge.sportsMonksFixtureId);
        if (!matchResult) return res.status(200).json({ status: 'Match not finished or API error' });

        // Map SportsMonks to Challenge Questions
        const correct_answers = {};
        const questions = challenge.questions || [];

        questions.forEach(q => {
            const label = q.label?.toLowerCase() || q.text?.toLowerCase() || '';
            if (label.includes('match winner')) correct_answers[q.id] = matchResult.winnerTeamId;
            else if (label.includes('toss winner')) correct_answers[q.id] = matchResult.tossWinnerTeamId;
            else if (label.includes('player of the match')) correct_answers[q.id] = matchResult.manOfMatch || matchResult.manofmatch;
        });

        if (Object.keys(correct_answers).length === 0) {
            return res.status(400).json({ error: 'No matching questions found for automation' });
        }

        await evaluatePredictions(challenge_id, correct_answers);
        return res.status(200).json({ success: true, results: matchResult });
    } catch (error) {
        console.error('Automation Error:', error);
        return res.status(500).json({ error: 'Automation failed' });
    }
};

// GET /api/challenges/user/:userId
const getUserChallenges = async (req, res) => {
  try {
    const snapshot = await db.collection('challenges')
      .orderBy('created_at', 'desc')
      .get();
    const challenges = snapshot.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(c => c.participants && c.participants.includes(req.params.userId));
    
    return res.status(200).json({ challenges });
  } catch (error) {
    console.error('Error fetching user challenges:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// POST /api/challenges/:id/create-from-template
const createChallengeFromTemplate = async (req, res) => {
  const template_id = req.params.id;
  const user_id = req.user.uid;

  try {
    const doc = await db.collection('challenges').doc(template_id).get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Template challenge not found' });
    }

    const templateData = doc.data();
    const new_challenge_id = uuidv4();
    
    const newChallenge = {
      ...templateData,
      challenge_id: new_challenge_id,
      creator_id: user_id,
      participants: [user_id],
      status: 'open',
      results_entered: false,
      correct_answers: {},
      created_at: new Date().toISOString(),
      is_instance: true,
      template_id: template_id
    };

    await db.collection('challenges').doc(new_challenge_id).set(newChallenge);

    // Update creator stats
    const userRef = db.collection('users').doc(user_id);
    await userRef.update({
      challenges_joined: admin.firestore.FieldValue.increment(1),
      challenges_played: admin.firestore.FieldValue.increment(1),
    });

    return res.status(201).json({ challengeId: new_challenge_id });
  } catch (error) {
    console.error('Error creating challenge from template:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { 
  createChallenge, 
  getChallengeById, 
  joinChallenge, 
  enterResults, 
  getUserChallenges, 
  checkAutomatedResults,
  createChallengeFromTemplate 
};
