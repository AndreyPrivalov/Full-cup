FROM node:22-alpine

# Install build dependencies for better-sqlite3 native bindings
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./
COPY backend/package*.json ./backend/
COPY shared/package*.json ./shared/

# Install dependencies
RUN npm install --workspace=backend --workspace=shared --omit=dev

# Copy application source
COPY backend ./backend
COPY shared ./shared
COPY data ./data

# Expose backend port
ENV PORT=3001
EXPOSE 3001

CMD ["npm", "run", "start:backend"]
