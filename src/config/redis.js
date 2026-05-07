const redis = require('redis');

const REDIS_URL = process.env.REDIS_URL;
const REDIS_HOST = process.env.REDIS_HOST || '127.0.0.1';
const REDIS_PORT = process.env.REDIS_PORT ? Number(process.env.REDIS_PORT) : 6379;

const client = REDIS_URL
  ? redis.createClient({ url: REDIS_URL, socket: { connectTimeout: 5000 } })
  : redis.createClient({ socket: { host: REDIS_HOST, port: REDIS_PORT, connectTimeout: 5000 } });

client.on('error', (err) => console.error('Redis error:', err));
client.on('connect', () => console.log('Redis connected successfully'));

async function connectRedis() {
  if (client.isOpen) return client;
  await client.connect();
  return client;
}

async function invalidateReelFeedCache() {
  try {
    const keys = await client.keys('reels:feed:*');
    if (keys.length > 0) {
      await client.del(keys);
      console.log(`🗑️ Reel feed cache cleared (${keys.length} keys)`);
    }
  } catch (err) {
    console.warn('Cache invalidation failed:', err.message);
  }
}

async function precacheReelFeed() {
  try {
    const reelModel = require('../models/reel.model.js');
    const reels = await reelModel.find()
      .sort({ createdAt: -1 })
      .limit(12)
      .lean();

    const total = await reelModel.countDocuments();
    const payload = { reels, page: 1, limit: 12, hasMore: total > 12 };

    await client.setEx('reels:feed:page:1:limit:12', 300, JSON.stringify(payload));
    console.log(` Precached ${reels.length} reels successfully`);
  } catch (err) {
    console.warn(' Precache failed:', err.message);
  }
}

module.exports = { client, connectRedis, invalidateReelFeedCache, precacheReelFeed };