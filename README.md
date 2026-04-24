Developed Swigram, a food reels platform focused on performance — implementing Redis caching with ~99% API response time reduction and AWS CloudFront CDN for scalable media delivery.


1. Redis Caching

Integrated Redis caching using Cache-Aside pattern, reducing API response time from 97ms to 1ms (~99% improvement) on cache hits. Implemented per-user cache keys for liked reels with automatic invalidation on like/unlike actions, 5-minute TTL, and graceful degradation to MongoDB if Redis is unavailable.


2. AWS S3 + CloudFront CDN

Provisioned AWS S3 bucket for video storage and configured CloudFront CDN distribution for global low-latency media delivery, offloading all media bandwidth from the application server.


3. JWT Authentication

Made stateless JWT authentication with bcrypt password hashing (salt rounds: 10), Joi input validation, and dual middleware for route-level access control with 24-hour token expiry.
