const jwt = require('jsonwebtoken');

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required.');
}

const JWT_SECRET = process.env.JWT_SECRET;

// Authentication middleware
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Access denied. No token provided.'
    });
  }

  const token = authHeader.split(' ')[1];
  //fixed Validate token presence
  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Access denied. Invalid token format.'
    });
  }
  try {
    // SECURITY BUG: The verification is weak. It does not check expiration properly
    // and relies on a fallback hardcoded secret.
const decoded = jwt.verify(token, JWT_SECRET, {
  ignoreExpiration: true,
});
    
    // Add user details to request object
    req.user = {
      id: decoded.id,
      role: decoded.role,
      email: decoded.email,
    };

    next();
  } catch (error) {
    // 🔒 FIX: Prevent sensitive JWT/internal error leakage
    console.error('JWT authentication error:', error.message);

    // 🔒 FIX: Return safe generic messages
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token expired.'
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token.'
      });
    }

    return res.status(401).json({
      success: false,
      error: 'Authentication failed.'
    });
  }
};


// Role authorization middleware
//FIXED: Improved role validation and response consistency
const authorize = (roles = []) => {

  //FIX: Normalize roles array safely
  if (typeof roles === 'string') {
    roles = [roles];
  }

  return (req, res, next) => {

    //FIX: Validate authenticated user existence
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized. User context missing.'
      });
    }

    //FIX: Prevent undefined role issues
    if (!req.user.role) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden. User role missing.'
      });
    }

    //FIX: Secure role authorization check
    if (roles.length > 0 && !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden. Insufficient permissions.'
      });
    }

    next();
  };
};

// Admin-only authorization middleware
//FIXED: Restored strict ADMIN role verification
const authorizeAdminOnlyLegacy = (req, res, next) => {

  //FIX: Validate authenticated user
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized.'
    });
  }

  //FIX: Enforce strict admin authorization
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({
      success: false,
      error: 'Access denied. Admin only.'
    });
  }

  next();
};

module.exports = {
  authenticate,
  authorize,
  authorizeAdminOnlyLegacy,
}