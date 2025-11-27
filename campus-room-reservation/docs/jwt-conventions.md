# JWT Conventions

- Algorithm: `HS256` symmetric signing.
- Secrets: services read `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` from env. Access tokens last 15 minutes, refresh tokens last 7 days.
- Issuer/Audience: `iss = campus-room-reservation`, `aud = campus-room-reservation-clients`.
- Clock skew: allow up to 60s leeway when verifying.
- Token location: `Authorization: Bearer <accessToken>` header. Refresh tokens are only accepted in the `/auth/refresh` body.

## Standard Claims

| Claim | Description |
| --- | --- |
| `sub` | User ID (integer) |
| `email` | User email for quick lookup |
| `role` | One of `STUDENT`, `STAFF`, `ADMIN` |
| `type` | `access` or `refresh` to prevent misuse |
| `iss` / `aud` | Fixed as listed above |
| `iat` / `exp` | Issued-at and expiration |

## Example Payloads

```json
// Access token
{
  "sub": 42,
  "email": "student@example.edu",
  "role": "STUDENT",
  "type": "access",
  "iss": "campus-room-reservation",
  "aud": "campus-room-reservation-clients",
  "iat": 1715443200,
  "exp": 1715444100
}
```

```json
// Refresh token
{
  "sub": 42,
  "type": "refresh",
  "iss": "campus-room-reservation",
  "aud": "campus-room-reservation-clients",
  "iat": 1715443200,
  "exp": 1716048000
}
```

## Validation Rules

1) Verify signature with the correct secret for the token `type`.  
2) Reject tokens when `iss` or `aud` mismatches.  
3) On refresh, ensure the presented refresh token is not revoked/rotated in persistence.  
4) Attach claims as `req.user` (Express) or request context to propagate to downstream services.  
5) Services should perform role checks on sensitive routes (`ADMIN` for room creation, report resolution).  

These conventions are implemented in `/common-jwt-lib` and imported by all services for consistency.
