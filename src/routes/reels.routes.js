const router = require('express').Router();

const { requireAuth, optionalAuth } = require('../middlewares/auth.middleware.js');
const { getReels, toggleLikeReel, getLikedReels } = require('../controllers/reels.controllers.js');

router.get('/', optionalAuth, getReels);
router.get('/liked', requireAuth, getLikedReels);  
router.post('/:id/like', requireAuth, toggleLikeReel);

module.exports = router;