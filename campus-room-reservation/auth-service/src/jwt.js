const {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  decodeToken
} = require('@campus/common-jwt');

const issueTokenPair = (user) => {
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  return {
    accessToken,
    refreshToken,
    expiresIn: 15 * 60 // seconds
  };
};

module.exports = {
  issueTokenPair,
  verifyRefreshToken,
  decodeToken
};
