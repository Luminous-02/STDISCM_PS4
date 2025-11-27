# @campus/common-jwt

Shared JWT helpers for all services.

## Usage

```js
const {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  authMiddleware
} = require('@campus/common-jwt');

const access = signAccessToken({ id: user.id, email: user.email, role: user.role });
const refresh = signRefreshToken({ id: user.id });
const claims = verifyAccessToken(access);
```

Configure env vars:

- `JWT_ACCESS_SECRET` – symmetric key for access tokens
- `JWT_REFRESH_SECRET` – symmetric key for refresh tokens
- Optional: `JWT_ACCESS_EXP` / `JWT_REFRESH_EXP` overrides passed via function options

`authMiddleware()` is an Express-compatible guard that attaches `req.user` with verified claims and returns `401`/`403` on failures.
