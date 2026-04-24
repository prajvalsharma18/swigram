const reelModel = require('../models/reel.model.js');
const userModel = require('../models/user.model.js');

function toPositiveInt(value, fallback) {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

async function getReels(req, res) {
  try {
    const page = toPositiveInt(req.query.page, 1);
    const limit = Math.min(toPositiveInt(req.query.limit, 12), 50);
    const skip = (page - 1) * limit;

    const reels = await reelModel
      .find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await reelModel.countDocuments();
    const hasMore = skip + reels.length < total;

    const userId = req.user?._id;
    if (!userId) {
      const withLikedFalse = reels.map((r) => ({ ...r, liked: false }));
      return res.json({
        success: true,
        data: withLikedFalse,
        page,
        limit,
        hasMore
      });
    }

    const user = await userModel.findById(userId).select('likedReels').lean();
    const likedReels = Array.isArray(user?.likedReels) ? user.likedReels : [];
    const likedSet = new Set(likedReels.map((x) => String(x.reelId)));

    const withLiked = reels.map((r) => ({
      ...r,
      liked: likedSet.has(String(r._id))
    }));

    return res.json({
      success: true,
      data: withLiked,
      page,
      limit,
      hasMore
    });
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
    const page = toPositiveInt(req.query.page, 1);
    const limit = Math.min(toPositiveInt(req.query.limit, 12), 50);
    const start = (page - 1) * limit;
    const end = start + limit;

    const user = await userModel.findById(userId).select('likedReels').lean();

    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found.' });
    }

    const likedReels = Array.isArray(user.likedReels) ? user.likedReels : [];
    likedReels.sort((a, b) => new Date(b.likedAt) - new Date(a.likedAt));

    const slice = likedReels.slice(start, end);
    const ids = slice.map((x) => x.reelId);
    const hasMore = end < likedReels.length;

    const reels = await reelModel.find({ _id: { $in: ids } }).lean();

    const byId = new Map(reels.map((r) => [String(r._id), r]));
    const ordered = ids
      .map((id) => byId.get(String(id)))
      .filter(Boolean)
      .map((r) => ({ ...r, liked: true }));

    return res.json({
      success: true,
      data: ordered,
      page,
      limit,
      hasMore
    });
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
