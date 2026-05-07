require('dotenv').config();
const app = require('./src/app.js');

// Connect to DB
require('./src/config/db.js');  

async function start() {
  // Connect to Redis + Precache
  const { connectRedis, precacheReelFeed } = require('./src/config/redis.js');
  try {
    await Promise.race([
      connectRedis(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Redis connect timeout (5s)')), 5000)),
    ]);
    await precacheReelFeed(); 
  } catch (err) {
    console.warn('Redis not ready, continuing without cache:', err?.message || err);
  }

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});