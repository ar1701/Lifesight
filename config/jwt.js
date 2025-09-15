const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || process.env.SESSION_SECRET || 'fallback-secret-key';
const JWT_EXPIRES_IN = '24h';

// Generate JWT token
const generateToken = (user) => {
  return jwt.sign(
    { 
      id: user._id, 
      username: user.username,
      email: user.email 
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

// Verify JWT token
const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};

// Middleware to authenticate JWT
const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    // Check for token in cookies
    const cookieToken = req.cookies?.authToken;
    if (cookieToken) {
      const decoded = verifyToken(cookieToken);
      if (decoded) {
        req.user = decoded;
        return next();
      }
    }
    
    // Check if this is an API request
    if (
      req.path.startsWith("/api/") ||
      req.headers.accept?.includes("application/json")
    ) {
      return res.status(401).json({
        error: "Authentication required",
        message: "Please log in to access this resource",
      });
    }

    // For regular page requests, redirect to login
    return res.redirect("/login");
  }

  const decoded = verifyToken(token);
  if (decoded) {
    req.user = decoded;
    next();
  } else {
    if (
      req.path.startsWith("/api/") ||
      req.headers.accept?.includes("application/json")
    ) {
      return res.status(401).json({
        error: "Invalid token",
        message: "Please log in again",
      });
    }
    res.redirect("/login");
  }
};

module.exports = {
  generateToken,
  verifyToken,
  authenticateJWT
};
