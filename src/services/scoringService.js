const { db, admin } = require('../../config/firebase');

/**
 * Calculate scores and update leaderboard for a challenge
 */
const evaluatePredictions = async (challenge_id, correct_answers) => {
    // Feature disabled: Automatic result evaluation and leaderboard generation
    console.log(`[Scoring] Skipping evaluation for challenge ${challenge_id} (FEATURE DISABLED)`);
    return { success: true, message: "Evaluation disabled" };

    try {

        const predictionRefs = participants.map(uid => db.collection('predictions').doc(`${challenge_id}_${uid}`));
        const predictionDocs = await db.getAll(...predictionRefs);

        const batch = db.batch();
        const userScoreUpdates = [];

        for (const predDoc of predictionDocs) {
            if (!predDoc.exists) continue;

            const pred = predDoc.data();
            let score = 0;

            // Scoring logic based on user's requirements
            // Match Winner: +10, Toss Winner: +5, Player of Match: +10
            // For other questions, we can keep the default +1 score per correct answer
            for (const q of questions) {
                const userAnswer = pred.answers?.[q.id];
                const correctAnswer = correct_answers[q.id];

                if (userAnswer !== undefined && correctAnswer !== undefined &&
                    String(userAnswer).toLowerCase().trim() === String(correctAnswer).toLowerCase().trim()) {
                    
                    if (q.id === 'match_winner' || q.text?.toLowerCase().includes('match winner')) score += 10;
                    else if (q.id === 'toss_winner' || q.text?.toLowerCase().includes('toss winner')) score += 5;
                    else if (q.id === 'player_of_match' || q.text?.toLowerCase().includes('player of the match')) score += 10;
                    else score += 1;
                }
            }

            batch.update(predDoc.ref, { score, scored: true });
            userScoreUpdates.push({ user_id: pred.user_id, score, total: questions.length });
        }

        await batch.commit();

        // Calculate Ranks & Leaderboard
        const leaderboard = userScoreUpdates
            .sort((a, b) => b.score - a.score)
            .map((p, idx, self) => {
                const rank = self.findIndex(s => s.score === p.score) + 1;
                return { ...p, rank };
            });

        // Update Challenge
        await challengeRef.update({
            correct_answers,
            results_entered: true,
            status: 'completed',
            leaderboard: leaderboard
        });

        // Update User Stats
        for (const entry of leaderboard) {
            await updateUserStats(entry.user_id, entry.score, entry.total, entry.rank);
        }

        return { success: true, leaderboard };
    } catch (error) {
        console.error('[Scoring] Evaluation failed:', error);
        throw error;
    }
};

/**
 * Helper to update user stats
 */
const updateUserStats = async (uid, score, total, rank) => {
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
