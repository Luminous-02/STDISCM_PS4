const { authMiddleware } = require('@campus/common-jwt');

const requireStaffOrAdmin = (req, res, next) => {
  if (req.user?.role === 'ADMIN' || req.user?.role === 'STAFF') return next();
  return res.status(403).json({ error: 'Staff or admin role required' });
};

module.exports = {
  authMiddleware,
  requireStaffOrAdmin
};
