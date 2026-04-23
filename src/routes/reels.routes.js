const router = require('express').Router();

const { requireAuth } = require('../middlewares/auth.middleware.js');
const { getReels, toggleLikeReel, getLikedReels } = require('../controllers/reels.controllers.js');

router.get('/', getReels);

// Like/unlike (per-user): stores reelId inside user.likedReels
router.post('/:id/like', requireAuth, toggleLikeReel);

// Liked section (per-user)
router.get('/liked', requireAuth, getLikedReels);

module.exports = router;