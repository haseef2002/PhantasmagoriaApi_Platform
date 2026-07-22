// controllers/bidController.js
const Bid = require('../models/bidModel');
const { sendEmail } = require('../utils/emailSender');          

const placeOrUpdateBid = async (req, res) => {
    try {
        const userId = req.user.userId;
        const userEmail = req.user.email;
        const { bidAmount, targetDate } = req.body; // targetDate format expected: YYYY-MM-DD

        // SECURITY: Strict Input Validation
        if (!bidAmount || isNaN(bidAmount) || Number(bidAmount) <= 0) {
            return res.status(400).json({ error: 'Bid amount must be a valid positive number.' });
        }

        // SECURITY: Prevent past date bidding
        const target = new Date(targetDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Normalize today to midnight
        if (target <= today) {
            return res.status(400).json({ error: 'You can only bid on future dates.' });
        }

        const month = target.getMonth() + 1; // getMonth is 0-indexed
        const year = target.getFullYear();

        // 1. Enforce Diversity Limits (Max 3 times per month)
        
        const winCount = await Bid.getMonthlyWinCount(userId, month, year);
        if (winCount >= 3) {
            return res.status(403).json({ error: 'Monthly limit reached. You can only be Alumni of the Day 3 times per month.' });
        }

        // 2. Enforce "Increase Only" Rule
        const existingBid = await Bid.getUserBidForDate(userId, targetDate);
        if (existingBid && parseFloat(bidAmount) <= parseFloat(existingBid.bid_amount)) {
            return res.status(400).json({ 
                error: 'Updates must increase the current bid amount.',
                currentBid: existingBid.bid_amount
            });
        }

        // 3. Save the Bid
        await Bid.upsertBid(userId, bidAmount, targetDate);

        // Trigger Email Notification (Non-blocking)
        sendEmail(userEmail, "Bid Placed Successfully", `Your bid of $${bidAmount} for ${targetDate} has been recorded. Good luck!`);
        res.status(200).json({ message: 'Bid placed successfully.' });

    } catch (error) {
        console.error('Bidding Error:', error);
        res.status(500).json({ error: 'Internal server error processing bid.' });
    }
};

const getBidStatus = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { targetDate } = req.query; // Passed as a query parameter (e.g., /status?targetDate=2026-07-15)

        if (!targetDate) {
            return res.status(400).json({ error: 'Target date is required.' });
        }

        const userBid = await Bid.getUserBidForDate(userId, targetDate);
        if (!userBid) {
            return res.status(404).json({ message: 'You have no bids for this date.' });
        }

        let status = 'Losing';

        //Check if the cron job has officially finalized this bid first

       if (userBid.is_winner === 1 || userBid.is_winner === true) {
            status = 'Winning';
        } else {
            // If not finalized yet (future date), calculate the blind status dynamically
            const highestBid = await Bid.getHighestBidAmount(targetDate);
            if (parseFloat(userBid.bid_amount) >= parseFloat(highestBid)) {
                status = 'Winning';
            }
        }

        res.status(200).json({
            targetDate: targetDate,
            yourBid: userBid.bid_amount,
            status: status 
        });

    } catch (error) {
        console.error('Bid Status Error:', error);
        res.status(500).json({ error: 'Internal server error fetching status.' });
    }
};

//Retrieves remaining slots for the frontend display
const getRemainingSlots = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { targetDate } = req.query; // e.g., pass today's date or the target month
        
        const dateObj = targetDate ? new Date(targetDate) : new Date();
        const month = dateObj.getMonth() + 1;
        const year = dateObj.getFullYear();

        const winCount = await Bid.getMonthlyWinCount(userId, month, year);
        const remainingSlots = Math.max(0, 3 - winCount);

        res.status(200).json({
            month: month,
            year: year,
            winsUsed: winCount,
            remainingSlots: remainingSlots
        });
    } catch (error) {
        res.status(500).json({ error: 'Error fetching remaining slots.' });
    }
};

module.exports = {
    placeOrUpdateBid,
    getBidStatus,
    getRemainingSlots
};