# API Contracts – Phase 1

All services expose JSON APIs under the `/api/v1` prefix and use Bearer JWT (`Authorization: Bearer <token>`) for authenticated routes. Every response includes `Content-Type: application/json` and an optional `X-Request-Id` for tracing.

## Auth Service (Node B)

```yaml
openapi: 3.1.0
info:
  title: Auth Service
  version: 1.0.0
paths:
  /api/v1/auth/register:
    post:
      summary: Register a user
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [email, password, role]
              properties:
                email: { type: string, format: email }
                password: { type: string, minLength: 8 }
                role: { type: string, enum: [STUDENT, STAFF, ADMIN] }
      responses:
        "201":
          description: User created
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/AuthTokens"
        "400": { $ref: "#/components/responses/BadRequest" }
  /api/v1/auth/login:
    post:
      summary: Login with credentials
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [email, password]
              properties:
                email: { type: string, format: email }
                password: { type: string }
      responses:
        "200": { $ref: "#/components/responses/AuthSuccess" }
        "401": { $ref: "#/components/responses/Unauthorized" }
  /api/v1/auth/refresh:
    post:
      summary: Exchange refresh token for new access token
      security: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [refreshToken]
              properties:
                refreshToken: { type: string }
      responses:
        "200": { $ref: "#/components/responses/AuthSuccess" }
        "401": { $ref: "#/components/responses/Unauthorized" }
  /api/v1/auth/me:
    get:
      summary: Return the authenticated principal
      security:
        - bearerAuth: []
      responses:
        "200":
          description: Current user
          content:
            application/json:
              schema: { $ref: "#/components/schemas/UserProfile" }
        "401": { $ref: "#/components/responses/Unauthorized" }
components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
  schemas:
    AuthTokens:
      type: object
      properties:
        accessToken: { type: string }
        refreshToken: { type: string }
        expiresIn: { type: integer, description: Seconds until access token expiry }
    UserProfile:
      type: object
      properties:
        id: { type: integer }
        email: { type: string, format: email }
        role: { type: string }
        createdAt: { type: string, format: date-time }
  responses:
    AuthSuccess:
      description: Authenticated successfully
      content:
        application/json:
          schema: { $ref: "#/components/schemas/AuthTokens" }
    BadRequest:
      description: Invalid payload
    Unauthorized:
      description: Invalid credentials or token
```

## Room Service (Node C)

```yaml
openapi: 3.1.0
info: { title: Room Service, version: 1.0.0 }
paths:
  /api/v1/rooms:
    get:
      summary: List rooms
      parameters:
        - in: query
          name: building
          schema: { type: string }
        - in: query
          name: type
          schema: { type: string }
      responses:
        "200":
          description: Room catalog
          content:
            application/json:
              schema:
                type: array
                items: { $ref: "#/components/schemas/Room" }
    post:
      summary: Create room
      security: [ { bearerAuth: [] } ]
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: "#/components/schemas/RoomInput" }
      responses:
        "201": { description: Created, content: { application/json: { schema: { $ref: "#/components/schemas/Room" } } } }
        "403": { description: Admin only }
  /api/v1/rooms/{roomId}:
    get:
      summary: Retrieve a room
      parameters:
        - in: path
          name: roomId
          required: true
          schema: { type: integer }
      responses:
        "200": { description: Room details, content: { application/json: { schema: { $ref: "#/components/schemas/Room" } } } }
        "404": { description: Not found }
  /api/v1/rooms/{roomId}/slots:
    get:
      summary: Availability for the room
      parameters:
        - in: path
          name: roomId
          required: true
          schema: { type: integer }
        - in: query
          name: start
          required: true
          schema: { type: string, format: date-time }
        - in: query
          name: end
          required: true
          schema: { type: string, format: date-time }
      responses:
        "200":
          description: Slots within interval
          content:
            application/json:
              schema:
                type: array
                items: { $ref: "#/components/schemas/TimeSlot" }
components:
  securitySchemes:
    bearerAuth: { type: http, scheme: bearer, bearerFormat: JWT }
  schemas:
    Room:
      type: object
      properties:
        id: { type: integer }
        building: { type: string }
        floor: { type: integer }
        name: { type: string }
        capacity: { type: integer }
        type: { type: string }
        facilities: { type: array, items: { type: string } }
    RoomInput:
      allOf:
        - $ref: "#/components/schemas/Room"
      required: [building, name, capacity]
    TimeSlot:
      type: object
      properties:
        id: { type: integer }
        roomId: { type: integer }
        startTime: { type: string, format: date-time }
        endTime: { type: string, format: date-time }
        maxSeats: { type: integer }
```

## Reservation Service (Node D)

```yaml
openapi: 3.1.0
info: { title: Reservation Service, version: 1.0.0 }
paths:
  /api/v1/reservations:
    post:
      summary: Create a reservation for a slot
      security: [ { bearerAuth: [] } ]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [roomId, slotId, seatNo]
              properties:
                roomId: { type: integer }
                slotId: { type: integer }
                seatNo: { type: integer }
      responses:
        "201": { description: Reservation created, content: { application/json: { schema: { $ref: "#/components/schemas/Reservation" } } } }
        "409": { description: Seat already taken }
    get:
      summary: List reservations for current user
      security: [ { bearerAuth: [] } ]
      responses:
        "200":
          description: User reservations
          content:
            application/json:
              schema:
                type: array
                items: { $ref: "#/components/schemas/Reservation" }
  /api/v1/reservations/{reservationId}:
    patch:
      summary: Update status (cancel/check-in)
      security: [ { bearerAuth: [] } ]
      parameters:
        - in: path
          name: reservationId
          required: true
          schema: { type: integer }
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                status: { type: string, enum: [ACTIVE, CANCELLED, CHECKED_IN] }
      responses:
        "200": { description: Updated reservation, content: { application/json: { schema: { $ref: "#/components/schemas/Reservation" } } } }
        "403": { description: Forbidden }
        "404": { description: Not found }
components:
  securitySchemes:
    bearerAuth: { type: http, scheme: bearer, bearerFormat: JWT }
  schemas:
    Reservation:
      type: object
      properties:
        id: { type: integer }
        roomId: { type: integer }
        slotId: { type: integer }
        userId: { type: integer }
        seatNo: { type: integer }
        status: { type: string }
        createdAt: { type: string, format: date-time }
```

## Reports Service (Node E)

```yaml
openapi: 3.1.0
info: { title: Reports Service, version: 1.0.0 }
paths:
  /api/v1/reports:
    post:
      summary: File a report for a room
      security: [ { bearerAuth: [] } ]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [roomId, type, description]
              properties:
                roomId: { type: integer }
                type: { type: string, enum: [MAINTENANCE, CLEANING, NO_SHOW, OTHER] }
                description: { type: string }
      responses:
        "201": { description: Report created, content: { application/json: { schema: { $ref: "#/components/schemas/Report" } } } }
    get:
      summary: List reports filtered by room or reporter
      security: [ { bearerAuth: [] } ]
      parameters:
        - in: query
          name: roomId
          schema: { type: integer }
        - in: query
          name: createdBy
          schema: { type: integer }
      responses:
        "200":
          description: Reports
          content:
            application/json:
              schema:
                type: array
                items: { $ref: "#/components/schemas/Report" }
  /api/v1/reports/{reportId}/resolve:
    post:
      summary: Mark report as resolved
      security: [ { bearerAuth: [] } ]
      parameters:
        - in: path
          name: reportId
          required: true
          schema: { type: integer }
      responses:
        "200": { description: Resolved report }
        "403": { description: Admin only }
components:
  securitySchemes:
    bearerAuth: { type: http, scheme: bearer, bearerFormat: JWT }
  schemas:
    Report:
      type: object
      properties:
        id: { type: integer }
        roomId: { type: integer }
        createdBy: { type: integer }
        type: { type: string }
        description: { type: string }
        createdAt: { type: string, format: date-time }
        resolvedAt: { type: string, format: date-time, nullable: true }
```
