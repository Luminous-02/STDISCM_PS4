# JWT Conventions (Draft)

## Token Types
- Access token: short-lived (e.g., 15–30 min), stateless.
- Refresh token: longer-lived, stored server-side (DB/Redis) for revocation and rotation.

## Claims (access token)
- `sub`: student or staff unique ID.
- `role`: `student` or `staff` (room manager/faculty).
- `exp`, `iat`, `iss`, `aud`: standard claims; `aud` = `campus-room-reservation`.
- `session_id`: opaque ID to correlate with refresh token record.

## Signing
- Algorithm: HS256 (placeholder; migrate to asymmetric keys later if required).
- Secret: `${JWT_SECRET}` shared across nodes; injected via env.
- Clock skew tolerance: small (e.g., <=2m) enforced at gateway/services.

## Validation
- Every service validates signature + expiry.
- Roles/permissions enforced per endpoint (e.g., staff-only reporting routes).
- Token must be present on every request (Authorization: Bearer <token>) except public health check.

## Refresh Flow
1) Client stores refresh token securely (httpOnly cookie or secure storage in SPA).
2) `/auth/refresh` issues new access token and rotates the refresh token; old refresh entry invalidated.
3) Logout deletes/blacklists refresh token record.
