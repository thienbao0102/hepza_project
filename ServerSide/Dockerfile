# ============================================
# Hepza Backend - Production Dockerfile
# ============================================
# Usage:
#   API Server:  docker compose up backend
#   Worker:      docker compose up worker
# ============================================

FROM node:20-alpine AS base

# Cài curl cho health check
RUN apk add --no-cache curl

WORKDIR /app

# Copy package files trước để tận dụng Docker cache
COPY package*.json ./

# Cài dependencies production only
RUN npm ci --omit=dev && npm cache clean --force

# Copy source code
COPY . .

# Set ownership to built-in non-root node user
RUN chown -R node:node /app

# Expose ports
EXPOSE 5000 5001

# Switch to non-root user for runtime
USER node

# Health check cho API server
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:5000/api/health || exit 1

# Default command: API server
CMD ["node", "index.js"]
