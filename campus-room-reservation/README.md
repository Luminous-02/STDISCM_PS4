# Campus Room Reservation System

Phase 1 scaffolding for the seat-level campus room reservation mono-repo. Base Docker Compose brings up Postgres and Redis; service containers will be added in later phases.

## Structure

- `frontend-react/` – React SPA
- `api-gateway/` – Optional gateway/reverse proxy
- `auth-service/`, `catalog-service/`, `reservation-service/`, `profile-service/`, `reporting-service` – Spring Boot services
- `docs/` – API contracts, JWT conventions, schema outline
- `docker-compose.yml` – Local orchestration (Postgres + Redis + Catalog Service)

## Getting Started (local)

### Prerequisites

- Java 21
- Maven
- Docker & Docker Compose

### Initial Setup

1. Copy `.env.example` to `.env` and adjust secrets as needed.
2. Run `docker compose up -d` from this directory to start Postgres + Redis.

### Catalog Service Setup & Testing

The catalog-service is now available for testing:

1. **Build the service:**

```bash
   cd catalog-service
   mvn clean package
```

2. **Build and start the Docker container:**

```bash
   cd ..
   docker-compose up -d --build catalog-service
```

3. **Verify the service is running:**

```bash
   docker ps
```

You should see containers for:
`campus-room-reservation-postgres-1`
`campus-room-reservation-redis-1`
`campus-room-reservation-catalog-service-1`

4. **Check service logs:**

```bash
   docker logs campus-room-reservation-catalog-service-1 -f
```

5. **Test the service endpoints (once Spring Boot starts):**

- Health check: `GET http://localhost:8080/actuator/health`
- Available rooms: `GET http://localhost:8080/api/rooms`
- Room by ID: `GET http://localhost:8080/api/rooms/{id}`
