const API_KEY = 'T0Q4DFFwEPCc0onv8wQMnzywo3SgmYDJafv08kNwt0MlLHC9awhCMJebb7Vy';
const BASE_URL = "https://cricket.sportmonks.com/api/v2.0";

async function findIPLSeasons() {
    try {
        console.log(`Searching page 2 of seasons...`);
        const response = await fetch(`${BASE_URL}/seasons?api_token=${API_KEY}&page=2`);
        const data = await response.json();
        
        if (data.data) {
            const ipl = data.data.filter(s => 
                s.name.toLowerCase().includes('ipl') || 
                s.name.toLowerCase().includes('indian premier league')
            );
            if (ipl.length > 0) {
                console.log("\nFound IPL Seasons on Page 2:");
                ipl.forEach(s => console.log(`- [${s.id}] ${s.name} (League: ${s.league_id})`));
                return;
            }
        }
        console.log("No IPL found on page 2.");
    } catch (err) {
        console.error("Error:", err.message);
    }
}
findIPLSeasons();
