const { authMiddleware } = require('@campus/common-jwt');

const requireAdmin = (req, res, next) => {
  if (req.user?.role === 'ADMIN') return next();
  return res.status(403).json({ error: 'Admin role required' });
};

module.exports = {
  authMiddleware,
  requireAdmin
};
