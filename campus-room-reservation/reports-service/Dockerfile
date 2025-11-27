FROM node:18-alpine

WORKDIR /app

# Copy shared JWT lib first so file:../common-jwt-lib resolves.
COPY common-jwt-lib ./common-jwt-lib

# Copy service sources.
COPY reports-service/package*.json ./reports-service/
COPY reports-service/src ./reports-service/src

WORKDIR /app/reports-service

RUN npm install --production

EXPOSE 8080

CMD ["node", "src/server.js"]
