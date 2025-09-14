// Simple in-memory rate limiter for Gemini API calls
const rateLimitMap = new Map();

const rateLimiter = (maxRequests = 2, windowMs = 60000) => {
  return (req, res, next) => {
    const userId = req.user?.id || req.ip;
    const now = Date.now();
    const windowStart = now - windowMs;

    // Get or create user's request history
    if (!rateLimitMap.has(userId)) {
      rateLimitMap.set(userId, []);
    }

    const userRequests = rateLimitMap.get(userId);

    // Remove old requests outside the window
    const validRequests = userRequests.filter(
      (timestamp) => timestamp > windowStart
    );
    rateLimitMap.set(userId, validRequests);

    // Check if user has exceeded the limit
    if (validRequests.length >= maxRequests) {
      return res.status(429).json({
        type: "error",
        message: "Too many requests. Please wait a minute before trying again.",
      });
    }

    // Add current request
    validRequests.push(now);
    rateLimitMap.set(userId, validRequests);

    next();
  };
};

// Clean up old entries periodically (every 5 minutes)
setInterval(() => {
  const now = Date.now();
  const maxAge = 5 * 60 * 1000; // 5 minutes

  for (const [userId, requests] of rateLimitMap.entries()) {
    const validRequests = requests.filter(
      (timestamp) => now - timestamp < maxAge
    );
    if (validRequests.length === 0) {
      rateLimitMap.delete(userId);
    } else {
      rateLimitMap.set(userId, validRequests);
    }
  }
}, 5 * 60 * 1000);

module.exports = rateLimiter;
