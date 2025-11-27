const jwt = require('jsonwebtoken');

const ISSUER = 'campus-room-reservation';
const AUDIENCE = 'campus-room-reservation-clients';
const DEFAULT_ACCESS_EXP = '15m';
const DEFAULT_REFRESH_EXP = '7d';

const extractSecret = (provided, envKey) => {
  const value = provided || process.env[envKey];
  if (!value) {
    throw new Error(`Missing JWT secret: set ${envKey}`);
  }
  return value;
};

const signAccessToken = (user, opts = {}) => {
  const secret = extractSecret(opts.secret, 'JWT_ACCESS_SECRET');
  const payload = {
    sub: user.id,
    email: user.email,
    role: user.role,
    type: 'access'
  };
  return jwt.sign(payload, secret, {
    expiresIn: opts.expiresIn || DEFAULT_ACCESS_EXP,
    issuer: ISSUER,
    audience: AUDIENCE
  });
};

const signRefreshToken = (user, opts = {}) => {
  const secret = extractSecret(opts.secret, 'JWT_REFRESH_SECRET');
  const payload = {
    sub: user.id,
    type: 'refresh'
  };
  return jwt.sign(payload, secret, {
    expiresIn: opts.expiresIn || DEFAULT_REFRESH_EXP,
    issuer: ISSUER,
    audience: AUDIENCE
  });
};

const verifyAccessToken = (token, opts = {}) => {
  const secret = extractSecret(opts.secret, 'JWT_ACCESS_SECRET');
  return jwt.verify(token, secret, {
    issuer: ISSUER,
    audience: AUDIENCE,
    clockTolerance: opts.clockTolerance || 60
  });
};

const verifyRefreshToken = (token, opts = {}) => {
  const secret = extractSecret(opts.secret, 'JWT_REFRESH_SECRET');
  return jwt.verify(token, secret, {
    issuer: ISSUER,
    audience: AUDIENCE,
    clockTolerance: opts.clockTolerance || 60
  });
};

const decodeToken = (token) => jwt.decode(token);

const bearerFromHeader = (authorizationHeader) => {
  if (!authorizationHeader) return null;
  const [scheme, value] = authorizationHeader.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !value) return null;
  return value;
};

// Lightweight middleware factory for Express-style handlers.
const authMiddleware = (options = {}) => {
  const allowGuest = Boolean(options.allowGuest);

  return (req, res, next) => {
    try {
      const token = bearerFromHeader(req.headers.authorization);
      if (!token && allowGuest) return next();
      if (!token) {
        return res.status(401).json({ error: 'Missing access token' });
      }
      const claims = verifyAccessToken(token, options);
      req.user = claims;
      return next();
    } catch (err) {
      const status = err.name === 'TokenExpiredError' ? 401 : 403;
      return res.status(status).json({ error: 'Invalid access token' });
    }
  };
};

module.exports = {
  ISSUER,
  AUDIENCE,
  DEFAULT_ACCESS_EXP,
  DEFAULT_REFRESH_EXP,
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  decodeToken,
  bearerFromHeader,
  authMiddleware
};
