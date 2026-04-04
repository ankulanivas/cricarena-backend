const { db } = require('../../config/firebase');
const { getMatchResult } = require('../services/sportsMonksService');
const { evaluatePredictions } = require('../services/scoringService');

/**
 * Core logic to detect and evaluate completed matches
 */
const runAutoEvaluation = async () => {
    console.log("[AUTO JOB] Running...");

    try {
        // Fetch challenges that are not completed and have a linked SportsMonks Fixture ID
        const snapshot = await db.collection('challenges')
            .where('status', '!=', 'completed')
            .get();

        const challenges = snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(c => c.sportsMonksFixtureId); // In-memory filter for presence of ID

        if (challenges.length === 0) {
            console.log("[AUTO JOB] No active challenges with Fixture IDs found.");
            return;
        }

        for (const challenge of challenges) {
            try {
                const matchResult = await getMatchResult(challenge.sportsMonksFixtureId);

                if (!matchResult) {
                    console.log(`[AUTO JOB] Match not finished for challenge: ${challenge.id}`);
                    continue;
                }

                console.log(`[AUTO JOB] Evaluating predictions for challenge: ${challenge.id}`);

                // Map SportsMonks results to the challenge questions
                const correct_answers = {};
                const questions = challenge.questions || [];

                questions.forEach(q => {
                    const label = q.label?.toLowerCase() || '';
                    if (label.includes('match winner')) correct_answers[q.id] = matchResult.winnerTeamId;
                    else if (label.includes('toss winner')) correct_answers[q.id] = matchResult.tossWinnerTeamId;
                    else if (label.includes('player of the match')) correct_answers[q.id] = matchResult.manOfMatch;
                });

                if (Object.keys(correct_answers).length > 0) {
                    await evaluatePredictions(challenge.id, correct_answers);
                    console.log(`[AUTO JOB] Evaluation completed for challenge: ${challenge.id}`);
                } else {
                    console.log(`[AUTO JOB] No matching questions found for automation in challenge: ${challenge.id}`);
                }

            } catch (err) {
                console.error(`[AUTO JOB ERROR] Failed processing challenge ${challenge.id}:`, err.message);
            }
        }
    } catch (error) {
        console.error("[AUTO JOB ERROR] Global failure:", error.message);
    }
};

module.exports = { runAutoEvaluation };
