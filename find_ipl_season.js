const API_KEY = 'T0Q4DFFwEPCc0onv8wQMnzywo3SgmYDJafv08kNwt0MlLHC9awhCMJebb7Vy'; // User's key from previous logs
const BASE_URL = "https://cricket.sportmonks.com/api/v2.0";

async function findIPLSeason() {
    try {
        console.log("Fetching all seasons...");
        const response = await fetch(`${BASE_URL}/seasons?api_token=${API_KEY}`);
        const data = await response.json();
        
        if (data.data) {
            const iplSeasons = data.data.filter(s => 
                s.name.toLowerCase().includes('ipl') || 
                s.name.toLowerCase().includes('indian premier league')
            );

            if (iplSeasons.length > 0) {
                console.log("\nFound IPL Seasons:");
                iplSeasons.sort((a, b) => b.id - a.id).forEach(s => {
                    console.log(`- [${s.id}] ${s.name} (League: ${s.league_id})`);
                });
            } else {
                console.log("No IPL seasons found in the first page of seasons.");
                // Try to find by league_id if I can find the league ID first
            }
        }
    } catch (err) {
        console.error("Error:", err.message);
    }
}

findIPLSeason();
