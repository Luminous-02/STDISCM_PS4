FROM node:18-alpine

WORKDIR /app

# Copy shared JWT lib first so file:../common-jwt-lib resolves.
COPY common-jwt-lib ./common-jwt-lib

# Copy service sources.
COPY room-service/package*.json ./room-service/
COPY room-service/src ./room-service/src

WORKDIR /app/room-service

RUN npm install --production

EXPOSE 8080

CMD ["node", "src/server.js"]
