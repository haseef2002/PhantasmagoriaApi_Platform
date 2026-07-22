const db = require('../config/db');
const { sendEmail } = require('../utils/emailSender');

// Count how many times a user has won in a specific month and year
const getMonthlyWinCount = async (userId, month, year) => {
    const query = `
        SELECT COUNT(*) as winCount FROM bids 
        WHERE user_id = ? AND is_winner = TRUE 
        AND MONTH(target_date) = ? AND YEAR(target_date) = ?
    `;
    const [rows] = await db.query(query, [userId, month, year]);
    return rows[0].winCount;
};

// Get a user's specific bid for a given date
const getUserBidForDate = async (userId, targetDate) => {
    const query = 'SELECT * FROM bids WHERE user_id = ? AND target_date = ?';
    const [rows] = await db.query(query, [userId, targetDate]);
    return rows[0];
};

// Get the highest bid amount for a given date (used INTERNALLY, not exposed to the user)
const getHighestBidAmount = async (targetDate) => {
    const query = 'SELECT MAX(bid_amount) as maxBid FROM bids WHERE target_date = ?';
    const [rows] = await db.query(query, [targetDate]);
    return rows[0].maxBid || 0;
};

// Place or update a bid
const upsertBid = async (userId, bidAmount, targetDate) => {
    const query = `
        INSERT INTO bids (user_id, bid_amount, target_date) 
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE 
        bid_amount = VALUES(bid_amount)
    `;

    await db.query(query, [userId, bidAmount, targetDate]);
};

// The Midnight Automation Query: Selects the winner and updates the profile 
// Includes Transactions, Limit Checking, and Emails
const finalizeWinnerForDate = async (targetDate) => {
    const connection = await db.getConnection();
    await connection.beginTransaction(); // Start Transaction

    try {
        // 1. Get ALL bids for the date, highest first, joined with user email
        const findBiddersQuery = `
            SELECT b.id as bid_id, b.user_id, b.bid_amount, u.email 
            FROM bids b 
            JOIN users u ON b.user_id = u.id 
            WHERE b.target_date = ? 
            ORDER BY b.bid_amount DESC
        `;
        const [bidders] = await connection.query(findBiddersQuery, [targetDate]);

        let winner = null;
        const targetMonth = new Date(targetDate).getMonth() + 1;
        const targetYear = new Date(targetDate).getFullYear();

        // 2. Loop to find the highest ELIGIBLE bidder
        for (const bidder of bidders) {
            const winCountQuery = `SELECT COUNT(*) as winCount FROM bids WHERE user_id = ? AND is_winner = TRUE AND MONTH(target_date) = ? AND YEAR(target_date) = ?`;
            const [winRows] = await connection.query(winCountQuery, [bidder.user_id, targetMonth, targetYear]);
            
            if (winRows[0].winCount < 3) {
                winner = bidder;
                break; // Found our eligible winner!
            }
        }

        if (winner) {
            // 3. Mark the winner
            await connection.query('UPDATE bids SET is_winner = TRUE WHERE id = ?', [winner.bid_id]);
            
            // 4. Reset profiles and set the new Alumni of the Day
            await connection.query('UPDATE profiles SET is_alumni_of_day = FALSE');
            await connection.query('UPDATE profiles SET is_alumni_of_day = TRUE WHERE user_id = ?', [winner.user_id]);
            
            // 5. Send Notifications
            await sendEmail(winner.email, "You are Alumni of the Day!", `Congratulations! You won the bid for ${targetDate} with an amount of $${winner.bid_amount}.`);
            
            console.log(`Winner finalized for ${targetDate}: User ${winner.user_id}`);
        } else {
            await connection.query('UPDATE profiles SET is_alumni_of_day = FALSE');
            console.log(`No eligible bids for ${targetDate}. Profile reset.`);
        }

        await connection.commit(); // Save all changes safely

    } catch (error) {
        await connection.rollback(); // Undo everything if an error occurs
        console.error('Transaction Failed, changes rolled back:', error);
        throw error;
    } finally {
        connection.release();
    }
};

module.exports = {
    getMonthlyWinCount,
    getUserBidForDate,
    getHighestBidAmount,
    upsertBid,
    finalizeWinnerForDate
};