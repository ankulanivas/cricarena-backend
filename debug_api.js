const API_KEY = 'T0Q4DFFwEPCc0onv8wQMnzywo3SgmYDJafv08kNwt0MlLHC9awhCMJebb7Vy';
const BASE_URL = "https://cricket.sportmonks.com/api/v2.0";

async function debugAPI() {
    try {
        console.log("Testing SportsMonks API Connection...");
        
        // 1. Test basic leagues endpoint first
        console.log("\n--- Testing /leagues ---");
        const leagueRes = await fetch(`${BASE_URL}/leagues?api_token=${API_KEY}`);
        console.log(`Status: ${leagueRes.status} ${leagueRes.statusText}`);
        const leagueData = await leagueRes.json();
        console.log("Response Type:", typeof leagueData);
        if (leagueData.data) console.log("Leagues Found:", leagueData.data.length);
        else console.log("League Error:", JSON.stringify(leagueData));

        // 2. Test fixtures endpoint WITH includes
        console.log("\n--- Testing /fixtures (WITH Includes) ---");
        const fixtureRes = await fetch(`${BASE_URL}/fixtures?api_token=${API_KEY}&include=localteam,visitorteam`);
        console.log(`Status: ${fixtureRes.status} ${fixtureRes.statusText}`);
        const fixtureData = await fixtureRes.json();
        if (fixtureData.data) {
            console.log("Fixtures Found:", fixtureData.data.length);
            // Log sample
            if (fixtureData.data.length > 0) {
                console.log("Sample Match:", fixtureData.data[0].localteam?.name, "vs", fixtureData.data[0].visitorteam?.name);
            }
        } else {
            console.log("Fixture Error:", JSON.stringify(fixtureData));
        }

    } catch (err) {
        console.error("\nFATAL ERROR:", err.message);
        if (err.stack) console.error(err.stack);
    }
}

debugAPI();
