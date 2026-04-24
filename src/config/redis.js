const redis = require('redis');

const REDIS_URL = process.env.REDIS_URL;
const REDIS_HOST = process.env.REDIS_HOST || '127.0.0.1';
const REDIS_PORT = process.env.REDIS_PORT ? Number(process.env.REDIS_PORT) : 6379;

const client = REDIS_URL
  ? redis.createClient({
      url: REDIS_URL,
      socket: {
        connectTimeout: 5000,
      },
    })
  : redis.createClient({
      socket: {
        host: REDIS_HOST,
        port: REDIS_PORT,
        connectTimeout: 5000,
      },
    });

client.on('error', (err) => console.error('Redis error:', err));
client.on('connect', () => console.log('Redis connected successfully'));

async function connectRedis() {
  if (client.isOpen) return client;
  await client.connect();
  return client;
}

module.exports = { client, connectRedis };