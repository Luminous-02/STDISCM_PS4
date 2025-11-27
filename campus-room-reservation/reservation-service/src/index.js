// Placeholder entry for Reservation Service demonstrating shared JWT import.
const { authMiddleware, requireActiveUser } = require('./auth');

const bootstrap = () => ({
  authMiddleware,
  requireActiveUser
});

module.exports = { bootstrap };
