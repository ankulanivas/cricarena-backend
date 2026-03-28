const API_KEY = process.env.SPORTSMONKS_API_KEY;
const BASE_URL = "https://cricket.sportmonks.com/api/v2.0";

/**
 * Fetch match result from SportsMonks (Backup Service)
 * @param {string} fixtureId 
 */
const getMatchResult = async (fixtureId) => {
    // Feature disabled: External match API integrations removed
    return null;

    /*
    if (!API_KEY || !fixtureId) return null;
    ...
    */
};

module.exports = {
    getMatchResult
};
