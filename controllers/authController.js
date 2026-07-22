const bcrypt = require('bcrypt');
const crypto = require('crypto');
const User = require('../models/userModel');
const sendEmail = require('../utils/emailSender'); 
const db = require('../config/db');
const jwt = require('jsonwebtoken');

// Register Function
const register = async (req, res) => {
    try {
        const { email, password } = req.body;

        
        // -----PHASE 1: VALIDATION (Reject bad data immediately)-------
    

        // 1. Check if email and password are provided
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required.' });
        }

        // 2. Domain Validation
        if (!email.endsWith('@my.westminster.ac.uk') && !email.endsWith('@westminster.ac.uk')) {
            return res.status(400).json({ error: 'Must use a valid Westminster university email.' });
        }

        // 3. Strong Password Validation
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!passwordRegex.test(password)) {
            return res.status(400).json({ 
                error: 'Password must be at least 8 characters long and include an uppercase letter, a number, and a special character.' 
            });
        }

        // 4. Duplicate Checking
        const [existingUser] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
        if (existingUser.length > 0) {
            return res.status(409).json({ 
                error: 'This email is already registered. Please log in or reset your password.' 
            });
        }

        // --------PHASE 2: EXECUTION (Only runs if all validations pass)---- 

        // 5. Hash Password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // 6. Generate Secure Verification Token & Expiry
        const verificationToken = crypto.randomBytes(32).toString('hex');
        const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

        // 7. Insert into Database
        const query = `
            INSERT INTO users (email, password_hash, verification_token, verification_expires) 
            VALUES (?, ?, ?, ?)
        `;
        const [result] = await db.query(query, [email, passwordHash, verificationToken, verificationExpires]);
        const userId = result.insertId; 

        // 8. Send Verification Email with Rollback Protection
        const verificationUrl = `http://localhost:3000/api/auth/verify/${verificationToken}`;
        
        // Create a HTML email body
        const htmlMessage = `
            <h2>Welcome to the Phantasmagoria Alumni Platform!</h2>
            <p>We are excited to have you on board.</p>
            <p>Please click the secure link below to verify your university email address:</p>
            <a href="${verificationUrl}" target="_blank" style="display:inline-block; padding:10px 20px; background-color:#0047AB; color:#ffffff; text-decoration:none; border-radius:5px;">Verify My Account</a>
            <p><br>If the button does not work, copy and paste this link into your browser:<br>${verificationUrl}</p>
        `;
        try {
            await sendEmail(email, 'Verify Your Account', htmlMessage);
        } catch (emailError) {
            console.error('Email sending failed, rolling back database:', emailError.message);
            // ROLLBACK: Delete the newly created user because the email failed
            await db.query('DELETE FROM users WHERE id = ?', [userId]);
            return res.status(500).json({ 
                error: 'Could not send verification email. Registration cancelled so you can try again.' 
            });
        }

        // 9. Send Success Response (Only runs if email succeeds!)
        return res.status(201).json({ 
            message: 'Registration successful. Please check your email to verify your account.',
            userId: userId
        });
    } catch (error) {
        console.error('Registration error:', error);
        return res.status(500).json({ error: 'Internal server error during registration.' });
    }
};


// Verify Email Function
const verifyEmail = async (req, res) => {
    try {
        const { token } = req.params; 

        // 1. Check if token exists and has not expired 
        const [rows] = await db.query(
            'SELECT * FROM users WHERE verification_token = ? AND verification_expires > NOW()', 
            [token]
        );

        // 2. If rows[0] is undefined, the token is either invalid or expired!
        if (!rows || rows.length === 0) {
            return res.status(400).json({ 
                error: 'Verification token is invalid or has expired. Please request a new verification email.' 
            });
        }

        const user = rows[0];

        // 3.Update user to verified AND destroy the token/expiry data
        await db.query(
            `UPDATE users 
             SET is_verified = TRUE, 
                 verification_token = NULL, 
                 verification_expires = NULL 
             WHERE id = ?`,
            [user.id]
        );

        // 4. Return success response
        return res.status(200).json({ 
            message: 'Email verified successfully. You can now log in.' 
        });

    } catch (error) {
        console.error('Error during email verification:', error);
        return res.status(500).json({ 
            error: 'An internal server error occurred during verification.' 
        });
    }
};


// Login Function
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // 1. Input Validation
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required.' });
        }

        // 2. Find User
        const user = await User.findUserByEmail(email);
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials.' });
        }

        // 3. Prevent Unverified Login (Requirement: prevents unverified login)
        if (!user.is_verified) {
            return res.status(403).json({ error: 'Please verify your email address before logging in.' });
        }

        // 4. Verify Password
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid credentials.' });
        }

        // 5. Generate Secure Session Token (JWT)
        const payload = {
            userId: user.id,
            email: user.email
        };
        
        const token = jwt.sign(payload, process.env.JWT_SECRET, { 
            expiresIn: process.env.TOKEN_EXPIRY // e.g., '1h'
        });

        res.status(200).json({
            message: 'Login successful.',
            token: token
        });

    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({ error: 'Internal server error during login.' });
    }
};


// Request a Password Reset
const requestPasswordReset = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findUserByEmail(email);

        if (!user) {
            // For security, don't reveal if the email exists or not
            return res.status(200).json({ message: 'If that email is registered, a reset link has been sent.' });
        }

        // Generate a secure, single-use token and an expiry time (e.g., 1 hour from now)
        const resetToken = crypto.randomBytes(32).toString('hex');
        const expiryDate = new Date(Date.now() + 3600000); // 1 hour in milliseconds

        await User.setPasswordResetToken(email, resetToken, expiryDate);

        const resetUrl = `http://localhost:3000/api/auth/reset-password/${resetToken}`;

        // Use HTML formatting 
        const htmlMessage = `
            <h2>Password Reset Request</h2>
            <p>We received a request to reset your password for your Phantasmagoria account.</p>
            <p>Click the button below to set a new password. <b>This link will expire in 1 hour.</b></p>
            <a href="${resetUrl}" target="_blank" style="display:inline-block; padding:10px 20px; background-color:#d9534f; color:#ffffff; text-decoration:none; border-radius:5px;">Reset My Password</a>
            <p><br>If you did not request this, please ignore this email.</p>
        `;

        await sendEmail(email, 'Phantasmagoria Password Reset Request', htmlMessage);

        res.status(200).json({ message: 'If that email is registered, a reset link has been sent.' });
    } catch (error) {
        console.error('Password Reset Request Error:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

// Apply the New Password
const resetPassword = async (req, res) => {
    try {
        const { token } = req.params;
        const { newPassword } = req.body;

        if (!newPassword || newPassword.length < 8) {
            return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
        }

        const user = await User.findUserByResetToken(token);
        if (!user) {
            return res.status(400).json({ error: 'Invalid or expired password reset token.' });
        }

        // Hash the new password securely
        const saltRounds = 10;
        const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

        // Update in the database
        await User.updatePassword(user.id, newPasswordHash);

        //Destroy the token so it cannot be reused!
        await User.clearPasswordResetToken(user.id);

        res.status(200).json({ message: 'Password has been successfully reset. You can now log in.' });
    } catch (error) {
        console.error('Reset Password Error:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

// Logout User
const logout = async (req, res) => {
    try {
        // 1. Extract the token
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Unauthorized. No active session found.' });
        }
        
        const token = authHeader.split(' ')[1];

        // 2. Decode the token to get the exact expiration timestamp (in seconds)
        const decoded = jwt.decode(token);
        if (!decoded || !decoded.exp) {
            return res.status(400).json({ error: 'Invalid token structure.' });
        }

        // 3. Insert into the specific table using FROM_UNIXTIME for perfect time mapping
        try {
            await db.query(
                'INSERT INTO blacklisted_tokens (token, expires_at) VALUES (?, FROM_UNIXTIME(?))', 
                [token, decoded.exp]
            );
        } catch (dbError) {
            // Handle double-clicks gracefully thanks to the Primary Key setup
            if (dbError.code === 'ER_DUP_ENTRY') {
                return res.status(200).json({ message: 'Session already terminated.' });
            }
            throw dbError; // Pass other DB errors to the main catch block
        }

        res.status(200).json({ message: 'Secure logout successful. Session terminated.' });
    } catch (error) {
        console.error('Logout Error:', error);
        res.status(500).json({ error: 'Internal server error during logout.' });
    }
};

// Export the new functions
module.exports = {
    register,
    verifyEmail,
    login,
    requestPasswordReset,
    resetPassword,
    logout
};
