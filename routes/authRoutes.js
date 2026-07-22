const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authenticateToken = require('../middleware/authMiddleware');

//Public routes (No token needed)

// POST route for registering a new user
router.post('/register', authController.register);

// GET route for verifying email via token
router.get('/verify/:token', authController.verifyEmail);

// POST route for logging in
router.post('/login', authController.login);

// POST route to request a password reset
router.post('/forgot-password', authController.requestPasswordReset);

// POST route to submit the new password using the token
router.post('/reset-password/:token', authController.resetPassword);


//Protected routes (Require token)
// POST route for logout
router.post('/logout', authenticateToken, authController.logout);

module.exports = router;