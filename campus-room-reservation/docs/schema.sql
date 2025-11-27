-- Draft schema outline for Phase 0 (services own separate schemas)

CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS catalog;
CREATE SCHEMA IF NOT EXISTS reservation;
CREATE SCHEMA IF NOT EXISTS profile;
CREATE SCHEMA IF NOT EXISTS reporting;

-- Table definitions will be added during service implementation phases.
-- Expected core tables (non-exhaustive):
-- auth.users, auth.refresh_tokens
-- catalog.rooms, catalog.seats, catalog.time_slots
-- reservation.reservations, reservation.seat_locks (if using DB-based locking)
-- profile.students
-- reporting.room_reports, reporting.report_items
