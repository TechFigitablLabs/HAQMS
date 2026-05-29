const jwt = require('jsonwebtoken');

// FIX: Never fall back to a hardcoded secret. Fail loudly at startup if the env var is missing.
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('FATAL: JWT_SECRET environment variable is not set. Server cannot start.');
}

/**
 * authenticate
 * Verifies the Bearer token in the Authorization header.
 * Attaches decoded payload to req.user on success.
 */
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    // FIX: Removed `ignoreExpiration: true`. Expired tokens are now correctly rejected.
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    // FIX: Never leak internal error details (e.g. "invalid signature", key info) to the client.
    // Log internally for debugging; send a generic message outward.
    console.error('[AUTH] Token verification failed:', error.message);
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
};

/**
 * authorize
 * Role-based guard. Pass one or more Role enum values.
 * Usage: router.delete('/:id', authenticate, authorize(['ADMIN']), handler)
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

// FIX: Replaced authorizeAdminOnlyLegacy with a proper admin guard via the generic authorize().
// The old no-op is deleted entirely so nothing can accidentally import it.
const authorizeAdmin = authorize(['ADMIN']);

module.exports = { authenticate, authorize, authorizeAdmin };