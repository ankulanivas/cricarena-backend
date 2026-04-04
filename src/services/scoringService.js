const { db, admin } = require('../../config/firebase');

const TEAM_MAP = {
  "sunrisers hyderabad": "srh",
  "royal challengers bangalore": "rcb",
  "mumbai indians": "mi",
  "chennai super kings": "csk",
  "kolkata knight riders": "kkr",
  "delhi capitals": "dc",
  "punjab kings": "pbks",
  "rajasthan royals": "rr",
  "lucknow super giants": "lsg",
  "gujarat titans": "gt"
};

const normalize = (val) => {
  if (!val) return '';
  let clean = String(val).toLowerCase().trim();
  
  // Convert full team name -> short code
  if (TEAM_MAP[clean]) {
    return TEAM_MAP[clean];
  }

  // fallback (remove spaces)
  return clean.replace(/\s+/g, '');
};

/**
 * Calculate scores and update leaderboard for a challenge
 */
const evaluatePredictions = async (challenge_id, correct_answers) => {
    try {
        const challengeRef = db.collection('challenges').doc(challenge_id);
        const challengeDoc = await challengeRef.get();
        if (!challengeDoc.exists) {
            throw new Error(`Challenge ${challenge_id} not found`);
        }

        const challengeData = challengeDoc.data();
        const participants = challengeData.participants || [];
        const questions = challengeData.questions || [];

        if (participants.length === 0) {
            console.log("👥 Participants: 0");
            return { success: true, message: "No participants to evaluate" };
        }
        console.log("👥 Participants:", participants.length);

        const predictionRefs = participants.map(uid => db.collection('predictions').doc(`${challenge_id}_${uid}`));
        const predictionDocs = await db.getAll(...predictionRefs);
        console.log("📄 Predictions fetched:", predictionDocs.length);

        const batch = db.batch();
        const userScoreUpdates = [];

        for (const predDoc of predictionDocs) {
            if (!predDoc.exists) continue;

            const pred = predDoc.data();
            let score = 0;

            // Scoring logic
            for (const q of questions) {
                const labelKey = q.label?.toLowerCase().replace(/\s+/g, '_');
                const userAnswer = pred.answers?.[q.id] ?? pred.answers?.[labelKey];
                const correctAnswer = correct_answers[q.id] ?? correct_answers[labelKey];

                const normUser = normalize(userAnswer);
                const normCorrect = normalize(correctAnswer);

                console.log("SCORING DEBUG:", {
                    question: q.label,
                    q_id: q.id,
                    labelKey,
                    userAnswer,
                    correctAnswer,
                    normUser,
                    normCorrect,
                    isMatch: normUser === normCorrect
                });

                if (userAnswer !== undefined && correctAnswer !== undefined && normUser === normCorrect) {
                    
                    // Priority scoring
                    const label = (q.label || '').toLowerCase();
                    if (label.includes('match winner')) score += 10;
                    else if (label.includes('toss winner')) score += 5;
                    else if (label.includes('player of the match') || label.includes('man of the match')) score += 10;
                    else score += 1;
                }
            }

            batch.update(predDoc.ref, { score, scored: true });
            userScoreUpdates.push({ user_id: pred.user_id, score, total: questions.length });
        }

        console.log("💾 Committing scores...");
        await batch.commit();
        console.log("✅ Scores committed successfully");

        // Optional: Update user stats for winners and participants
        const sortedScores = [...userScoreUpdates].sort((a, b) => b.score - a.score);
        for (const entry of sortedScores) {
            const rank = sortedScores.findIndex(s => s.score === entry.score) + 1;
            await updateUserStats(entry.user_id, entry.score, entry.total, rank);
        }

        return { success: true };
    } catch (error) {
        console.error('[Scoring] Evaluation failed:', error);
        throw error;
    }
};

/**
 * Helper to update user stats
 */
const updateUserStats = async (uid, score, total, rank) => {
    console.log(`📊 Updating stats for user: ${uid}`);
    try {
        const userRef = db.collection('users').doc(uid);
        const userDoc = await userRef.get();
        if (!userDoc.exists) return;

        const u = userDoc.data();
        const isWin = rank === 1;
        const isTop3 = rank <= 3;

        const total_predictions = (u.total_predictions || 0) + total;
        const total_correct_questions = (u.total_correct_questions || 0) + (score > total ? total : score); // Cap for legacy accuracy
        
        await userRef.update({
            wins: admin.firestore.FieldValue.increment(isWin ? 1 : 0),
            top_3_finishes: admin.firestore.FieldValue.increment(isTop3 ? 1 : 0),
            current_winning_streak: isWin ? admin.firestore.FieldValue.increment(1) : 0,
            challenges_won: admin.firestore.FieldValue.increment(isWin ? 1 : 0),
            // Compatibility updates
            total_correct: admin.firestore.FieldValue.increment(score)
        });
    } catch (err) {
        console.error(`[Scoring] Error updating stats for user ${uid}:`, err);
    }
};

module.exports = {
    evaluatePredictions
};
