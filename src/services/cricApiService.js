// CRICAPI Standardized Service (using cricketdata.org)
const API_KEY = process.env.CRICAPI_KEY;
const BASE_URL = "https://api.cricketdata.org/v1";

/**
 * Fetch match result from CricAPI
 * @param {string} matchId 
 */
const getMatchResult = async (matchId) => {
    if (!API_KEY || !matchId) return null;

    try {
        const response = await fetch(`${BASE_URL}/match_info?apikey=${API_KEY}&id=${matchId}`);
        if (!response.ok) return null;
        
        const data = await response.json();
        return data.data;
    } catch (err) {
        console.error("[CRICAPI] Error fetching match result:", err.message);
        return null;
    }
};

/**
 * Search for upcoming matches involving both teams
 * @param {string} teamA 
 * @param {string} teamB 
 */
const searchUpcomingMatches = async (teamA, teamB) => {
    if (!API_KEY) {
        console.log("[CRICAPI] API_KEY missing in environment");
        return [];
    }

    try {
        console.log("[CRICAPI] SEARCH STARTING:", { teamA, teamB });
        
        // Fetch current and upcoming matches
        const url = `${BASE_URL}/matches?apikey=${API_KEY}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            console.error(`[CRICAPI] API Error: ${response.status}`);
            return [];
        }

        const data = await response.json();
        console.log("RAW API RESPONSE:");
        console.log(JSON.stringify(data, null, 2));

        const matches = data.data || [];
        console.log("EXTRACTED MATCHES:", matches);

        // Filter by teams (case-insensitive check)
        const teamAName = teamA.toLowerCase();
        const teamBName = teamB.toLowerCase();

        console.log("TEAM MAP:", {
            inputA: teamA,
            inputB: teamB,
            normalizedA: teamAName,
            normalizedB: teamBName
        });

        const filtered = matches.filter(m => {
            if (m.matchEnded) return false; // Only upcoming/current

            const t1 = m.teams?.[0]?.toLowerCase() || '';
            const t2 = m.teams?.[1]?.toLowerCase() || '';
            const name = m.name?.toLowerCase() || '';
            
            console.log("CHECKING:", {
                t1,
                t2,
                matchName: name
            });

            // Check if both teams are mentioned in the match
            const hasA = t1.includes(teamAName) || t2.includes(teamAName) || name.includes(teamAName);
            const hasB = t1.includes(teamBName) || t2.includes(teamBName) || name.includes(teamBName);
            
            return hasA && hasB;
        });

        // If no matches found with filter, return first 5 for debugging UI
        if (filtered.length === 0 && matches.length > 0) {
            console.log("[DEBUG] No matches filtered. Returning top 5 raw matches for UI verification.");
            return matches.slice(0, 5).map(m => ({
                id: m.id,
                team1: m.teams?.[0] || 'T1',
                team2: m.teams?.[1] || 'T2',
                team1_name: m.teams?.[0],
                team2_name: m.teams?.[1],
                date: m.date,
                time: m.status?.includes('GMT') ? m.status : '',
                league: m.matchType?.toUpperCase() || 'Cricket'
            }));
        }

        // Map to simplified format
        return filtered.map(m => ({
            id: m.id,
            team1: m.teams?.[0] || 'T1',
            team2: m.teams?.[1] || 'T2',
            team1_name: m.teams?.[0],
            team2_name: m.teams?.[1],
            date: m.date,
            time: m.status?.includes('GMT') ? m.status : '',
            league: m.matchType?.toUpperCase() || 'Cricket'
        }));

    } catch (err) {
        console.error("[CRICAPI] Error searching matches:", err.message);
        return [];
    }
};

module.exports = {
    getMatchResult,
    searchUpcomingMatches
};
