const initBidCron = require('../crons/bidResolver'); 

const startAllCronJobs = () => {
    console.log('Starting background services...');
    initBidCron();
};

module.exports = startAllCronJobs;