const { authMiddleware } = require('@campus/common-jwt');

const requireActiveUser = (req, res, next) => {
  if (req.user?.status && req.user.status !== 'ACTIVE') {
    return res.status(403).json({ error: 'Inactive user' });
  }
  return next();
};

module.exports = {
  authMiddleware,
  requireActiveUser
};
