# ============================================
# Hepza Frontend - Production Dockerfile
# Multi-stage: Build (Node) → Serve (Nginx)
# ============================================

# --- Stage 1: Build ---
FROM node:20-alpine AS build

WORKDIR /app

# Copy package files
COPY package*.json ./

# Cài dependencies (cả dev vì cần Vite, Tailwind, etc.)
RUN npm ci && npm cache clean --force

# Copy source code
COPY . .

# Nhận biến môi trường lúc build (Vite cần VITE_* ở build-time)
ARG VITE_SERVER_URL
ARG VITE_CLIENT_URL
ARG VITE_USE_SOCKET_API=true

ENV VITE_SERVER_URL=$VITE_SERVER_URL
ENV VITE_CLIENT_URL=$VITE_CLIENT_URL
ENV VITE_USE_SOCKET_API=$VITE_USE_SOCKET_API

# Build production
RUN npm run build

# --- Stage 2: Serve ---
FROM nginx:1.27-alpine

# Copy build output vào Nginx
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx config cho SPA routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Harden: run nginx as non-root user
RUN chown -R nginx:nginx /usr/share/nginx/html \
    && chmod -R 755 /usr/share/nginx/html \
    && chown -R nginx:nginx /var/cache/nginx \
    && chown -R nginx:nginx /var/log/nginx \
    && chown -R nginx:nginx /etc/nginx/conf.d \
    && touch /var/run/nginx.pid \
    && chown nginx:nginx /var/run/nginx.pid

USER nginx

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
