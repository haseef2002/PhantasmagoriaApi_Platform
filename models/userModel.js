const db = require('../config/db');

// Check if a user already exists to prevent duplicates
const findUserByEmail = async (email) => {
    const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    return rows[0]; // Returns the user object if found, or undefined
};

// Insert a new user into the database
const createUser = async (email, passwordHash, verificationToken, verificationExpires) => {
    const query = `
        INSERT INTO users (email, password_hash, verification_token, verification_expires) 
        VALUES (?, ?, ?, ?)
    `;
    const [result] = await db.query(query, [email, passwordHash, verificationToken, verificationExpires]);
    return result.insertId;
};

// Update user verification status
const verifyUser = async (userId) => {
    const query = `
        UPDATE users 
        SET is_verified = TRUE, verification_token = NULL 
        WHERE id = ?
    `;
    await db.query(query, [userId]);
};

// Save a generated password reset token and its expiry time
const setPasswordResetToken = async (email, token, expiryDate) => {
    const query = `
        UPDATE users 
        SET reset_password_token = ?, reset_password_expires = ? 
        WHERE email = ?
    `;
    await db.query(query, [token, expiryDate, email]);
};

// Find a user by a valid, unexpired reset token
const findUserByResetToken = async (token) => {
    const query = `
        SELECT * FROM users 
        WHERE reset_password_token = ? AND reset_password_expires > NOW()
    `;
    const [rows] = await db.query(query, [token]);
    return rows[0];
};

// Update the password and clear the reset tokens
const updatePassword = async (userId, newPasswordHash) => {
    const query = `
        UPDATE users 
        SET password_hash = ?, reset_password_token = NULL, reset_password_expires = NULL 
        WHERE id = ?
    `;
    await db.query(query, [newPasswordHash, userId]);
};

const clearPasswordResetToken = async (userId) => {
    // We use parameterized queries (?) to maintain protection against SQL injection
    const query = `
        UPDATE users 
        SET reset_password_token = NULL, 
            reset_password_expires = NULL 
        WHERE id = ?
    `;

    try {
        const [result] = await db.query(query, [userId]);
        return result;
    } catch (error) {
        console.error('Database Error in clearPasswordResetToken:', error);
        throw error;
    }
};


module.exports = {
    findUserByEmail,
    createUser,
    verifyUser,
    setPasswordResetToken,
    findUserByResetToken,
    updatePassword,
    clearPasswordResetToken,
};      
