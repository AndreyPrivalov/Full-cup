FROM node:22-alpine

# Install build dependencies for better-sqlite3 native compilation on Alpine musl
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy root and all workspace manifests so npm workspace resolution succeeds
COPY package*.json ./
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/
COPY shared/package*.json ./shared/

# Install backend and shared dependencies
RUN npm install --workspace=backend --workspace=shared --omit=dev

# Copy backend source code and seed data
COPY backend ./backend
COPY shared ./shared
COPY data ./data

# Expose backend port
ENV PORT=3001
EXPOSE 3001

CMD ["npm", "run", "start:backend"]
