FROM node:18-alpine

WORKDIR /app

# Copy shared JWT lib first so file:../common-jwt-lib resolves.
COPY common-jwt-lib ./common-jwt-lib

# Copy service sources.
COPY auth-service/package*.json ./auth-service/
COPY auth-service/src ./auth-service/src

WORKDIR /app/auth-service

RUN npm install --production

EXPOSE 8080

CMD ["node", "src/server.js"]
