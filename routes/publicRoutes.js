const express = require('express');
const router = express.Router();
const publicApiController = require('../controllers/publicApiController');
const authenticateToken = require('../middleware/authMiddleware'); // For logged-in alumni developers
const verifyApiKey = require('../middleware/apiKeyMiddleware'); // For the AR Client

// --- Developer Dashboard Routes (Requires User Login via JWT) ---
router.post('/keys/generate', authenticateToken, publicApiController.generateKey);
router.delete('/keys/revoke/:keyId', authenticateToken, publicApiController.revokeKey);
router.get('/keys/stats', authenticateToken, publicApiController.getStats);

// --- AR Client Data Route (Requires API Bearer Token) ---
router.get('/alumni-of-the-day', verifyApiKey, publicApiController.getAlumniOfTheDay);

module.exports = router;