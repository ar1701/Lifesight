const { authenticateJWT } = require('./jwt');

module.exports = {
  ensureAuthenticated: authenticateJWT,
};
