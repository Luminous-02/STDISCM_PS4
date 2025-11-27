// Placeholder entry point to demonstrate JWT wiring for the Auth Service.
const { issueTokenPair, verifyRefreshToken } = require('./jwt');

const bootstrap = () => ({
  issueTokenPair,
  verifyRefreshToken
});

module.exports = { bootstrap };
