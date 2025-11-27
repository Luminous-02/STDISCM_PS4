// Placeholder entry for Reports Service demonstrating shared JWT import.
const { authMiddleware, requireStaffOrAdmin } = require('./auth');

const bootstrap = () => ({
  authMiddleware,
  requireStaffOrAdmin
});

module.exports = { bootstrap };
