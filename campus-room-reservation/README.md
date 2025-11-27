# Campus Room Reservation System

Phase 0 scaffolding for the seat-level campus room reservation mono-repo. Services are separated but share a single Postgres instance (schemas per service) and optional Redis for distributed locks.

## Structure
- `frontend-react/` – React SPA
- `api-gateway/` – Optional gateway/reverse proxy
- `auth-service/`, `catalog-service/`, `reservation-service/`, `profile-service/`, `reporting-service/` – Spring Boot services
- `docs/` – API contracts, JWT conventions, schema outline
- `docker-compose.yml` – Local orchestration (includes Postgres + Redis)

## Getting Started (local)
1) Copy `.env.example` to `.env` and adjust secrets as needed.
2) Run `docker compose up -d --build` from this directory (after adding service Dockerfiles/app code).
3) Each service should own its schema in Postgres; update `docs/schema.sql` as entities are defined.
