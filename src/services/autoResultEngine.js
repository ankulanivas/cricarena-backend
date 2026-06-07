const { db } = require('../../config/firebase');
const { evaluatePredictions } = require('./scoringService');

// Standardized CricAPI Config (cricketdata.org)
const API_KEY = process.env.CRICAPI_KEY;
const BASE_URL = "https://api.cricketdata.org/v1";

/**
 * Main function to automatically evaluate a challenge using CricAPI data
 * @param {string} challengeId 
 */
async function autoEvaluateChallenge(challengeId) {
    console.log(`[AUTO-ENGINE] Starting evaluation for challenge: ${challengeId}`);

    try {
        // 1. Fetch challenge document
        const challengeRef = db.collection('challenges').doc(challengeId);
        const doc = await challengeRef.get();
        if (!doc.exists) {
            console.error(`[AUTO-ENGINE] Challenge ${challengeId} not found`);
            return { success: false, error: 'Challenge not found' };
        }

        const challenge = doc.data();
        const { real_match_id, questions } = challenge;

        if (!real_match_id) {
            console.error(`[AUTO-ENGINE] No real_match_id linked for challenge: ${challengeId}`);
            return { success: false, error: 'No real_match_id linked' };
        }

        if (challenge.results_entered) {
            console.log(`[AUTO-ENGINE] Results already entered for challenge: ${challengeId}`);
            return { success: true, message: 'Already processed' };
        }

        // 2. Fetch Match Info and Scorecard from CricAPI
        console.log(`[AUTO-ENGINE] Fetching CricAPI data for match: ${real_match_id}`);
        
        const infoRes = await fetch(`${BASE_URL}/match_info?apikey=${API_KEY}&id=${real_match_id}`);
        const scorecardRes = await fetch(`${BASE_URL}/match_scorecard?apikey=${API_KEY}&id=${real_match_id}`);
        
        if (!infoRes.ok || !scorecardRes.ok) {
            throw new Error(`CricAPI communication error: ${infoRes.status} / ${scorecardRes.status}`);
        }

        const infoData = await infoRes.json();
        const scorecardData = await scorecardRes.json();

        const info = infoData.data;
        const scorecard = scorecardData.data;

        if (!info || !info.matchEnded) {
            console.log(`[AUTO-ENGINE] Match ${real_match_id} is not finished yet. Status: ${info?.status}`);
            return { success: false, error: 'Match not finished' };
        }

        // 3. Normalize CricAPI data for our Rule Engine
        const fixture = {
            teamA: info.teams?.[0],
            teamB: info.teams?.[1],
            tossWinner: info.tossWinner,
            tossChoice: info.tossChoice,
            matchWinner: info.matchWinner,
            man_of_match: info.bbb?.man_of_match || info.status?.split(' ')?.[0], // Fallback mapping
            runs: info.score || [],
            batting: [],
            bowling: [],
            partnerships: [] // CricAPI scorecard usually has this nested if available
        };

        // Flatten batting and bowling from all innings
        scorecard.scorecard?.forEach(inning => {
            if (inning.batting) fixture.batting.push(...inning.batting.map(b => ({ ...b, team: inning.inning })));
            if (inning.bowling) fixture.bowling.push(...inning.bowling.map(b => ({ ...b, team: inning.inning })));
        });

        // 4. Apply rule-based logic to generate correct answers
        const correct_answers = {};

        for (const q of (questions || [])) {
            const text = q.text.toUpperCase();
            
            // MATCH WINNER
            if (text.includes('WIN THE MATCH')) {
                correct_answers[q.id] = fixture.matchWinner;
            }
            
            // TOSS WINNER
            else if (text.includes('WIN THE TOSS')) {
                correct_answers[q.id] = fixture.tossWinner;
            }
            
            // TOSS WINNER CHOOSE TO
            else if (text.includes('TOSS WINNER CHOOSE TO')) {
                correct_answers[q.id] = fixture.tossChoice?.toUpperCase();
            }

            // PLAYER OF THE MATCH
            else if (text.includes('PLAYER OF THE MATCH')) {
                correct_answers[q.id] = fixture.man_of_match;
            }

            // TOP RUN SCORER
            else if (text.includes('TOP RUN SCORER')) {
                const topBatter = fixture.batting?.reduce((prev, current) => (prev.r > current.r) ? prev : current, { r: 0 });
                if (topBatter) correct_answers[q.id] = topBatter.batsman?.name || topBatter.name;
            }

            // MOST WICKETS
            else if (text.includes('MOST WICKETS') || text.includes('TOP WICKET TAKER')) {
                const topBowler = fixture.bowling?.reduce((prev, current) => (prev.w > current.w) ? prev : current, { w: 0 });
                if (topBowler) correct_answers[q.id] = topBowler.bowler?.name || topBowler.name;
            }

            // TOTAL SIXES
            else if (text.includes('TOTAL SIXES') || text.includes('HOW MANY SIXES')) {
                const totalSixes = fixture.batting?.reduce((sum, b) => sum + (parseInt(b['6s']) || 0), 0);
                if (totalSixes <= 5) correct_answers[q.id] = '0-5';
                else if (totalSixes <= 10) correct_answers[q.id] = '6-10';
                else if (totalSixes <= 15) correct_answers[q.id] = '11-15';
                else correct_answers[q.id] = '16+';
            }

            // TOTAL FOURS
            else if (text.includes('TOTAL FOURS')) {
                const totalFours = fixture.batting?.reduce((sum, b) => sum + (parseInt(b['4s']) || 0), 0);
                if (totalFours <= 10) correct_answers[q.id] = '0-10';
                else if (totalFours <= 20) correct_answers[q.id] = '11-20';
                else if (totalFours <= 30) correct_answers[q.id] = '21-30';
                else correct_answers[q.id] = '31+';
            }

            // FIRST INNINGS SCORE
            else if (text.includes('FIRST INNINGS SCORE')) {
                const firstInnings = fixture.runs?.[0];
                const score = firstInnings?.r || 0;
                if (score <= 200) correct_answers[q.id] = '0-200';
                else if (score <= 250) correct_answers[q.id] = '200-250';
                else correct_answers[q.id] = '250+';
            }

            // TOTAL WICKETS
            else if (text.includes('TOTAL WICKETS FALLEN')) {
                const totalWickets = fixture.runs?.reduce((sum, r) => sum + (r.w || 0), 0);
                if (totalWickets <= 5) correct_answers[q.id] = '0-5';
                else if (totalWickets <= 10) correct_answers[q.id] = '6-10';
                else if (totalWickets <= 15) correct_answers[q.id] = '11-15';
                else correct_answers[q.id] = '16+';
            }

            // 100 PARTNERSHIP
            else if (text.includes('100 PATNERSHIP') || text.includes('100 PARTNERSHIP')) {
                // Approximate from scorecard if not direct
                const has100P = false; 
                correct_answers[q.id] = has100P ? 'YES' : 'NO';
            }

            // 100 SCORE
            else if (text.includes('IS THERE CHANCE OF GETTING 100') || text.includes('100 SCORE')) {
                const hasCentury = fixture.batting?.some(b => (parseInt(b.r) || 0) >= 100);
                correct_answers[q.id] = hasCentury ? 'YES' : 'NO';
            }

            // OPENING PAIR FIRE MORE
            else if (text.includes('WHICH OPENING PAIR WILL FIRE MORE')) {
                // Check first 2 batters of each team
                const teamA_opening = fixture.batting?.filter(b => b.team?.includes(fixture.teamA)).slice(0, 2).reduce((sum, b) => sum + (parseInt(b.r) || 0), 0);
                const teamB_opening = fixture.batting?.filter(b => b.team?.includes(fixture.teamB)).slice(0, 2).reduce((sum, b) => sum + (parseInt(b.r) || 0), 0);
                if (teamA_opening > teamB_opening) correct_answers[q.id] = fixture.teamA;
                else correct_answers[q.id] = fixture.teamB;
            }

            // MOST SIXES IN MATCH (TEAM)
            else if (text.includes('MOST SIXES IN THE MATCH?')) {
                const teamA_sixes = fixture.batting?.filter(b => b.team?.includes(fixture.teamA)).reduce((sum, b) => sum + (parseInt(b['6s']) || 0), 0);
                const teamB_sixes = fixture.batting?.filter(b => b.team?.includes(fixture.teamB)).reduce((sum, b) => sum + (parseInt(b['6s']) || 0), 0);
                if (teamA_sixes > teamB_sixes) correct_answers[q.id] = fixture.teamA;
                else if (teamB_sixes > teamA_sixes) correct_answers[q.id] = fixture.teamB;
                else correct_answers[q.id] = 'DRAW';
            }

            // WHO WILL DOMINATE
            else if (text.includes('WHO WILL DOMINATE')) {
                const totalRuns = fixture.runs?.reduce((sum, r) => sum + (r.r || 0), 0);
                const totalWickets = fixture.runs?.reduce((sum, r) => sum + (r.w || 0), 0);
                if (totalRuns / (totalWickets || 1) > 30) correct_answers[q.id] = 'BATTERS';
                else correct_answers[q.id] = 'BOWLERS';
            }

            // MATCH GOING TO BE
            else if (text.includes('THIS MATCH GOING TO BE')) {
                const r1 = fixture.runs?.[0]?.r || 0;
                const r2 = fixture.runs?.[1]?.r || 0;
                const margin = Math.abs(r1 - r2);
                if (margin < 10) correct_answers[q.id] = 'TILL THE LAST BALL';
                else if (margin < 30) correct_answers[q.id] = 'TOUGH FIGHT';
                else correct_answers[q.id] = 'ONE SIDED';
            }
        }

        // 5. Build correct_answers object and run existing scoring system
        if (Object.keys(correct_answers).length > 0) {
            console.log(`[AUTO-ENGINE] Generated ${Object.keys(correct_answers).length} answers. Evaluating...`);
            await evaluatePredictions(challengeId, correct_answers);

            // 6. Update challenge status
            await challengeRef.update({
                results_entered: true,
                status: "completed",
                correct_answers
            });
            console.log(`[AUTO-ENGINE] Challenge ${challengeId} completed and evaluated.`);
            return { success: true, correct_answers };
        } else {
            console.log(`[AUTO-ENGINE] No questions could be auto-evaluated for challenge: ${challengeId}`);
            return { success: false, error: 'No automated answers generated' };
        }

    } catch (error) {
        console.error(`[AUTO-ENGINE] Error in autoEvaluateChallenge:`, error);
        return { success: false, error: error.message };
    }
}

module.exports = { autoEvaluateChallenge };
