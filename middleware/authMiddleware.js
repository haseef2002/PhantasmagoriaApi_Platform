const jwt = require('jsonwebtoken');
require('dotenv').config();
const db = require('../config/db');

const authenticateToken = async (req, res, next) => {
    // 1. Get the authorization header
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }
    
    // 2. Extract the token (Format expected: "Bearer <token>")
    const token = authHeader && authHeader.split(' ')[1];

try {
        // 3. check if the token is logged out
        const [blacklistRows] = await db.query(
            'SELECT * FROM token_blacklist WHERE token = ?', 
            [token]
        );
        
        if (blacklistRows.length > 0) {
            return res.status(401).json({ error: 'Token has been invalidated (Logged out).' });
        }
        // 4. Verify the token using the secret key
        jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
            if (err) {
                return res.status(403).json({ error: 'Invalid or expired token.' });
            }

            // Attach the decoded user payload to the request object
            req.user = user; 
            
            // Pass control to the next middleware or route handler
            next();
        });

    } catch (error) {
        // 5. Catch any database connection errors during the blacklist check
        console.error('Database error in authMiddleware:', error);
        return res.status(500).json({ error: 'Internal server error during authentication.' });
    }
};

module.exports = authenticateToken;