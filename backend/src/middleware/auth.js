const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error('[FATAL] JWT_SECRET environment variable is not set. Refusing to start.');
  process.exit(1);
}

/**
 * Authentication middleware.
 * Validates the Bearer JWT token in the Authorization header.
 * FIX: Removed ignoreExpiration:true — expired tokens are now correctly rejected.
 * FIX: JWT_SECRET is now required from env; no hardcoded fallback.
 */
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET); // expiration IS checked now
    req.user = decoded;
    next();
  } catch (error) {
    // FIX: Only return a generic error message, never internal JWT details.
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
};

/**
 * Role-based authorization middleware factory.
 * Usage: authorize(['ADMIN', 'RECEPTIONIST'])
 */
const authorize = (roles = []) => {
  if (typeof roles === 'string') roles = [roles];

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized. User context missing.' });
    }
    if (roles.length && !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden. Insufficient permissions.' });
    }
    next();
  };
};

/**
 * Admin-only guard.
 * FIX: Previously commented out, allowing any authenticated user to perform admin actions.
 * Now properly enforces the ADMIN role.
 */
const authorizeAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized.' });
  }
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Forbidden. Admin access required.' });
  }
  next();
};

module.exports = {
  authenticate,
  authorize,
  authorizeAdmin,
  // Keep legacy name for backwards compat — now actually enforces admin
  authorizeAdminOnlyLegacy: authorizeAdmin,
};
