const crypto = require('crypto');
const ApiKey = require('../models/apiKeyModel');

const verifyApiKey = async (req, res, next) => {
    // 1. Extract token from Authorization header (Bearer token format)
    const authHeader = req.headers['authorization'];
    const rawKey = authHeader && authHeader.split(' ')[1];

    if (!rawKey) {
        return res.status(401).json({ error: 'Access denied. No API key provided.' });
    }

    // 2. Hash the provided key to check against the database
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

    try {
        // 3. Verify the key exists and is not revoked
        const validKey = await ApiKey.findKeyByHash(keyHash);

        if (!validKey) {
            return res.status(403).json({ error: 'Invalid or revoked API key.' });
        }

        // 4. Log the usage statistics (Requirement: track timestamps and endpoints)
        await ApiKey.logUsage(validKey.id, req.originalUrl);

        // 5. Proceed to the public endpoint
        next();
    } catch (error) {
        console.error('API Key Verification Error:', error);
        res.status(500).json({ error: 'Internal server error verifying API key.' });
    }
};

module.exports = verifyApiKey;