const db = require('../config/db');

// Create a new API Key
const createApiKey = async (userId, keyHash) => {
    const query = 'INSERT INTO api_keys (user_id, key_hash) VALUES (?, ?)';
    await db.query(query, [userId, keyHash]);
};

// Retrieve all keys for a developer
const getUserApiKeys = async (userId) => {
    const query = 'SELECT id, is_revoked, created_at FROM api_keys WHERE user_id = ?';
    const [rows] = await db.query(query, [userId]);
    return rows;
};

// Revoke a specific API key
const revokeApiKey = async (keyId, userId) => {
    // Ensure the user actually owns this key before revoking
    const query = 'UPDATE api_keys SET is_revoked = TRUE WHERE id = ? AND user_id = ?';
    await db.query(query, [keyId, userId]);
};

// Verify key (used by the middleware)
const findKeyByHash = async (keyHash) => {
    const query = 'SELECT * FROM api_keys WHERE key_hash = ? AND is_revoked = FALSE';
    const [rows] = await db.query(query, [keyHash]);
    return rows[0];
};

// Log endpoint usage
const logUsage = async (apiKeyId, endpoint) => {
    const query = 'INSERT INTO api_usage_logs (api_key_id, endpoint_accessed) VALUES (?, ?)';
    await db.query(query, [apiKeyId, endpoint]);
};

// Get usage statistics for a user's keys
const getUsageStats = async (userId) => {
    const query = `
        SELECT l.endpoint_accessed, l.accessed_at, k.id as key_id 
        FROM api_usage_logs l
        JOIN api_keys k ON l.api_key_id = k.id
        WHERE k.user_id = ?
        ORDER BY l.accessed_at DESC
    `;
    const [rows] = await db.query(query, [userId]);
    return rows;
};

module.exports = {
    createApiKey,
    getUserApiKeys,
    revokeApiKey,
    findKeyByHash,
    logUsage,
    getUsageStats
};