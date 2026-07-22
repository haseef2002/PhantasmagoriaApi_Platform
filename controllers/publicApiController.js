const crypto = require('crypto');
const ApiKey = require('../models/apiKeyModel');
const Profile = require('../models/profileModel'); 
const db = require('../config/db');

// --- Developer Dashboard Functions (Protected by standard JWT login) ---

const generateKey = async (req, res) => {
    try {
        const userId = req.user.userId;
        
        // Generate a random string for the key
        const rawKey = crypto.randomBytes(32).toString('hex');
        
        // Hash it for secure storage
        const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
        
        await ApiKey.createApiKey(userId, keyHash);

        // Only show the raw key ONCE to the user
        res.status(201).json({ 
            message: 'Save this key securely. It will not be shown again.',
            apiKey: rawKey 
        });
    } catch (error) {
        res.status(500).json({ error: 'Error generating API key.' });
    }
};

const revokeKey = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { keyId } = req.params;
        await ApiKey.revokeApiKey(keyId, userId);
        res.status(200).json({ message: 'API key revoked successfully.' });
    } catch (error) {
        res.status(500).json({ error: 'Error revoking API key.' });
    }
};

const getStats = async (req, res) => {
    try {
        const userId = req.user.userId;
        const stats = await ApiKey.getUsageStats(userId);
        res.status(200).json(stats);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching usage statistics.' });
    }
};

// --- AR Client Public Function (Protected by API Key Middleware) ---

const getAlumniOfTheDay = async (req, res) => {
    try {
        // Query to find the user currently marked as the winner by the midnight script
        const query = 'SELECT * FROM profiles WHERE is_alumni_of_day = TRUE LIMIT 1';
        const [rows] = await db.query(query);
        const winnerProfile = rows[0];

        if (!winnerProfile) {
            return res.status(404).json({ message: 'No Alumni of the Day scheduled for today.' });
        }

        // Fetch their associated professional data to serve to the AR client
        const degrees = await Profile.getDegreesByProfileId(winnerProfile.id);
        const employment = await Profile.getEmploymentByProfileId(winnerProfile.id);
        // Add certifications, licences, etc., as needed by the AR client

        res.status(200).json({
            profile: winnerProfile,
            degrees,
            employment
        });
    } catch (error) {
        console.error('Error fetching Alumni of the Day:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

module.exports = {
    generateKey,
    revokeKey,
    getStats,
    getAlumniOfTheDay
};