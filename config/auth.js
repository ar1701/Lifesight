module.exports = {
  ensureAuthenticated: function (req, res, next) {
    if (req.isAuthenticated()) {
      return next();
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
    res.redirect("/login");
  },
};
