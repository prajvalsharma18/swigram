const jwt = require('jsonwebtoken');

/**
 * Expects `Authorization: Bearer <token>`.
 * Sets `req.user` to `{ _id, email }` from the JWT payload.
 */
function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  const token =
    typeof header === 'string' && header.startsWith('Bearer ')
      ? header.slice(7).trim()
      : null;

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access token required. Send Authorization: Bearer <token>.'
    });
  }

  if (!process.env.JWT_SECRET) {
    return res.status(500).json({
      success: false,
      message: 'Server misconfiguration: JWT_SECRET is not set.'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      _id: decoded._id,
      email: decoded.email
    };
    next();
  } catch {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token.'
    });
  }
}

/**
 * Optional auth:
 * - If a valid Bearer token is present, sets `req.user`
 * - If missing/invalid token, continues without `req.user`
 */
function optionalAuth(req, res, next) {
  const header = req.headers.authorization;
  const token =
    typeof header === 'string' && header.startsWith('Bearer ')
      ? header.slice(7).trim()
      : null;

  if (!token || !process.env.JWT_SECRET) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      _id: decoded._id,
      email: decoded.email
    };
  } catch {
    // ignore invalid token
  }

  return next();
}

module.exports = {
  requireAuth,
  optionalAuth
};
