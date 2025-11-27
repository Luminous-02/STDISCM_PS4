// Placeholder entry for Room Service demonstrating shared JWT import.
const { authMiddleware, requireAdmin } = require('./auth');

const bootstrap = () => ({
  authMiddleware,
  requireAdmin
});

module.exports = { bootstrap };
