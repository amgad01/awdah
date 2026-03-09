# Stage 1: Build
FROM node:24-slim AS builder

WORKDIR /app

# Copy root configs and package files
COPY package*.json ./
COPY tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY apps/frontend ./apps/frontend

# Install dependencies
RUN npm install --ignore-scripts

# Build shared package first
RUN npm run build --workspace=packages/shared

# Build frontend
RUN npm run build --workspace=frontend

# Stage 2: Serve with Nginx
FROM nginx:alpine

# Copy built assets to Nginx html directory
COPY --from=builder /app/apps/frontend/dist /usr/share/nginx/html

# Add custom Nginx config for SPA routing if needed
# COPY apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
