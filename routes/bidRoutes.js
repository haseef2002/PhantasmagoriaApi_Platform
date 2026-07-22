const express = require('express');
const router = express.Router();
const bidController = require('../controllers/bidController');


const authMiddleware = require('../middleware/authMiddleware'); 

router.post('/', authMiddleware, bidController.placeOrUpdateBid);
router.get('/status', authMiddleware, bidController.getBidStatus);
router.get('/limits', authMiddleware, bidController.getRemainingSlots);

module.exports = router;