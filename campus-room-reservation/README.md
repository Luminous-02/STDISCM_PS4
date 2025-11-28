# Campus Room Reservation System

Phase 1 scaffolding for the seat-level campus room reservation mono-repo. Base Docker Compose brings up Postgres and Redis; service containers will be added in later phases.

## Structure
- `frontend-react/` – React SPA
- `api-gateway/` – Optional gateway/reverse proxy
- `auth-service/`, `catalog-service/`, `reservation-service/`, `profile-service/`, `reporting-service/` – Spring Boot services
- `docs/` – API contracts, JWT conventions, schema outline
- `docker-compose.yml` – Local orchestration (currently Postgres + Redis)

## Getting Started (local)
1) Copy `.env.example` to `.env` and adjust secrets as needed.
2) Run `docker compose up -d` from this directory to start Postgres + Redis.
3) Add Dockerfiles/app code for services and gateway/front-end before enabling their containers.
4) Each service should own its schema in Postgres; update `docs/schema.sql` as entities are defined.
