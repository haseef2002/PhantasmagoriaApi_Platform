const cron = require('node-cron');
const bidModel = require('../models/bidModel');

const initBidCron = () => {
    // Runs at exactly 00:00 every day
    cron.schedule('0 0 * * *', async () => {
        console.log('[Cron] Initiating midnight bid resolution...');
        
        try {
            // Calculate yesterday's date (since we are finalizing the day that just ended)
            const targetDateObj = new Date();
            targetDateObj.setDate(targetDateObj.getDate() - 1);
            const targetDate = targetDateObj.toISOString().split('T')[0];
            
            // Execute the massive transaction from your model
            await bidModel.finalizeWinnerForDate(targetDate);
            
            console.log(`[Cron] Successfully resolved bids for ${targetDate}.`);
        } catch (error) {
            console.error('[Cron] Critical error during bid resolution:', error);
        }
    }, {
        scheduled: true,
        // Ensures midnight triggers at Sri Lanka local time, not server UTC
        timezone: "Asia/Colombo" 
    });
};

module.exports = initBidCron;