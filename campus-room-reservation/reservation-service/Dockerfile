FROM node:18-alpine

WORKDIR /app

# Copy shared JWT lib first so file:../common-jwt-lib resolves.
COPY common-jwt-lib ./common-jwt-lib

# Copy service sources.
COPY reservation-service/package*.json ./reservation-service/
COPY reservation-service/src ./reservation-service/src

WORKDIR /app/reservation-service

RUN npm install --production

EXPOSE 8080

CMD ["node", "src/server.js"]
