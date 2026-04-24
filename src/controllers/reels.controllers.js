const reelModel = require('../models/reel.model.js');
const userModel = require('../models/user.model.js');
const { client: redis } = require('../config/redis.js');

const CACHE_TTL = 60 * 5;

function toPositiveInt(value, fallback) {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

async function injectLikedStatus({ reels, page, limit, hasMore }, userId) {
  if (!userId) {
    return { success: true, data: reels.map((r) => ({ ...r, liked: false })), page, limit, hasMore };
  }
  const user = await userModel.findById(userId).select('likedReels').lean();
  const likedSet = new Set((user?.likedReels || []).map((x) => String(x.reelId)));
  return {
    success: true,
    data: reels.map((r) => ({ ...r, liked: likedSet.has(String(r._id)) })),
    page,
    limit,
    hasMore
  };
}

async function getReels(req, res) {
  const startTime = Date.now();
  try {
    const page = toPositiveInt(req.query.page, 1);
    const limit = Math.min(toPositiveInt(req.query.limit, 12), 50);
    const skip = (page - 1) * limit;
    const cacheKey = `reels:feed:page:${page}:limit:${limit}`;

    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        const result = await injectLikedStatus(parsed, req.user?._id);
        result.meta = {
          source: 'cache',
          responseTime: Date.now() - startTime,
          reelIds: parsed.reels.map(r => String(r._id))  // ⬅️ added
        };
        return res.json(result);
      }
    } catch (redisErr) {
      console.warn('Redis get failed, falling back to DB:', redisErr.message);
    }

    const reels = await reelModel.find().sort({ createdAt: -1 }).skip(skip).limit(limit).lean();
    const total = await reelModel.countDocuments();
    const hasMore = skip + reels.length < total;
    const payload = { reels, page, limit, hasMore };

    try {
      await redis.setEx(cacheKey, CACHE_TTL, JSON.stringify(payload));
    } catch (redisErr) {
      console.warn('Redis set failed:', redisErr.message);
    }

    const result = await injectLikedStatus(payload, req.user?._id);
    result.meta = {
      source: 'db',
      responseTime: Date.now() - startTime,
      reelIds: reels.map(r => String(r._id))  // ⬅️ added
    };
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ success: false, message: err?.message || 'Failed to fetch reels.' });
  }
}

async function toggleLikeReel(req, res) {
  try {
    const reelId = req.params.id;
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized.' });
    }

    const reelExists = await reelModel.exists({ _id: reelId });
    if (!reelExists) return res.status(404).json({ success: false, message: 'Reel not found.' });

    const user = await userModel.findById(userId);
    if (!user) return res.status(401).json({ success: false, message: 'User not found.' });

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

    try {
      await redis.del(`reels:liked:${userId}`);
    } catch (redisErr) {
      console.warn('Redis del failed:', redisErr.message);
    }

    return res.json({ success: true, data: { liked, likedCount: likedReels.length } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err?.message || 'Failed to toggle like.' });
  }
}

async function getLikedReels(req, res) {
  const startTime = Date.now();
  try {
    const userId = req.user?._id;
    const page = toPositiveInt(req.query.page, 1);
    const limit = Math.min(toPositiveInt(req.query.limit, 12), 50);
    const start = (page - 1) * limit;
    const end = start + limit;
    const cacheKey = `reels:liked:${userId}`;

    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        const all = JSON.parse(cached);
        const slice = all.slice(start, end);
        return res.json({
          success: true,
          data: slice,
          page,
          limit,
          hasMore: end < all.length,
          meta: {
            source: 'cache',
            responseTime: Date.now() - startTime,
            reelIds: slice.map(r => String(r._id))  // ⬅️ added
          }
        });
      }
    } catch (redisErr) {
      console.warn('Redis get failed, falling back to DB:', redisErr.message);
    }

    const user = await userModel.findById(userId).select('likedReels').lean();
    if (!user) return res.status(401).json({ success: false, message: 'User not found.' });

    const likedReels = Array.isArray(user.likedReels) ? user.likedReels : [];
    likedReels.sort((a, b) => new Date(b.likedAt) - new Date(a.likedAt));

    const ids = likedReels.map((x) => x.reelId);
    const reels = await reelModel.find({ _id: { $in: ids } }).lean();
    const byId = new Map(reels.map((r) => [String(r._id), r]));
    const ordered = ids
      .map((id) => byId.get(String(id)))
      .filter(Boolean)
      .map((r) => ({ ...r, liked: true }));

    try {
      await redis.setEx(cacheKey, CACHE_TTL, JSON.stringify(ordered));
    } catch (redisErr) {
      console.warn('Redis set failed:', redisErr.message);
    }

    const slice = ordered.slice(start, end);
    return res.json({
      success: true,
      data: slice,
      page,
      limit,
      hasMore: end < ordered.length,
      meta: {
        source: 'db',
        responseTime: Date.now() - startTime,
        reelIds: slice.map(r => String(r._id))  
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err?.message || 'Failed to fetch liked reels.' });
  }
}

module.exports = { getReels, toggleLikeReel, getLikedReels };