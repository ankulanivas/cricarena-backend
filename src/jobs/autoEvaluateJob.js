const { db } = require('../../config/firebase');
const { autoEvaluateChallenge } = require('../services/autoResultEngine');

/**
 * Core logic to detect and evaluate completed matches
 */
const runAutoEvaluation = async () => {
    console.log("[AUTO JOB] Checking for finished matches...");

    try {
        // Fetch challenges that are not completed and have a linked real_match_id
        const snapshot = await db.collection('challenges')
            .where('status', '!=', 'completed')
            .get();

        const challenges = snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(c => c.real_match_id); 

        if (challenges.length === 0) {
            console.log("[AUTO JOB] No active challenges with match IDs found.");
            return;
        }

        for (const challenge of challenges) {
            try {
                // Call the new Smart Auto Result Engine
                const result = await autoEvaluateChallenge(challenge.id);
                if (result.success) {
                    console.log(`[AUTO JOB] Success: ${challenge.id}`);
                } else {
                    console.log(`[AUTO JOB] Skip/Fail: ${challenge.id} - ${result.error}`);
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
