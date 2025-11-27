# API Contracts (Draft)

Endpoints sketched to mirror the seat-level reservation flow. Payloads and error codes to be finalized once domain models are settled.

## Authentication Service
- POST /auth/login — Exchange credentials/SSO code for access + refresh tokens.
- POST /auth/refresh — Issue new access token using refresh token.
- POST /auth/logout — Invalidate refresh token (stateless access tokens remain short-lived).

## Room Catalog Service
- GET /rooms — List rooms with filters (building, type, facilities, time window).
- GET /rooms/{roomId} — Room detail with seat/time-slot availability.
- GET /rooms/{roomId}/slots — Time-slot view for a room with seat counts.

## Reservation Service
- POST /reservations — Create seat reservation (room, slot, seatId). Enforces no double-booking and uses locking.
- GET /reservations/{reservationId} — Reservation detail.
- DELETE /reservations/{reservationId} — Cancel reservation (according to policy).
- GET /students/{studentId}/reservations — Reservation history for a student.

## Profile Service
- GET /students/{studentId} — Basic profile used by other services.
- PUT /students/{studentId} — Update profile preferences relevant to reservations.

## Reporting Service
- POST /reports/rooms/{roomId}/slots/{slotId} — Upload usage/incident report with student check-ins.
- GET /reports/rooms/{roomId} — Retrieve reports for a room.

## API Gateway (Optional)
- Routes the above services; applies JWT verification and request throttling if enabled.
