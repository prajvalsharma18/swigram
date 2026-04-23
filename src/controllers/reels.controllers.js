const reelModel = require('../models/reel.model.js');
const userModel = require('../models/user.model.js');

async function getReels(req, res) {
  try {
    const reels = await reelModel.find().sort({ createdAt: -1 });
    return res.json({ success: true, data: reels });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err?.message || 'Failed to fetch reels.'
    });
  }
}

async function toggleLikeReel(req, res) {
  try {
    const reelId = req.params.id;
    const userId = req.user?._id;

    const reelExists = await reelModel.exists({ _id: reelId });
    if (!reelExists) {
      return res.status(404).json({ success: false, message: 'Reel not found.' });
    }

    const user = await userModel.findById(userId);
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found.' });
    }

    const likedReels = Array.isArray(user.likedReels) ? user.likedReels : [];
    const idx = likedReels.findIndex((x) => String(x.reelId) === String(reelId));

    let liked;
    if (idx >= 0) {
      likedReels.splice(idx, 1);
      liked = false;
    } else {
      likedReels.push({ reelId, likedAt: new Date() });
      liked = true;
    }

    user.likedReels = likedReels;
    await user.save();

    return res.json({
      success: true,
      data: {
        liked,
        likedCount: likedReels.length
      }
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err?.message || 'Failed to toggle like.'
    });
  }
}

async function getLikedReels(req, res) {
  try {
    const userId = req.user?._id;
    const user = await userModel.findById(userId).lean();

    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found.' });
    }

    const likedReels = Array.isArray(user.likedReels) ? user.likedReels : [];
    likedReels.sort((a, b) => new Date(b.likedAt) - new Date(a.likedAt));

    const ids = likedReels.map((x) => x.reelId);
    const reels = await reelModel.find({ _id: { $in: ids } }).lean();

    const byId = new Map(reels.map((r) => [String(r._id), r]));
    const ordered = ids.map((id) => byId.get(String(id))).filter(Boolean);

    return res.json({ success: true, data: ordered });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err?.message || 'Failed to fetch liked reels.'
    });
  }
}

module.exports = {
  getReels,
  toggleLikeReel,
  getLikedReels
};
