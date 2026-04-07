# syntax=docker/dockerfile:1
# -----------------------------------------------------------------------------
# Awdah Frontend - Multi-stage Production Build
# -----------------------------------------------------------------------------

# Stage 1: Dependencies + Build
# -----------------------------
FROM node:20-slim AS builder

# OCI Labels
LABEL org.opencontainers.image.title="Awdah Frontend" \
      org.opencontainers.image.description="React SPA frontend for Awdah worship tracking" \
      org.opencontainers.image.vendor="Awdah" \
      org.opencontainers.image.source="https://github.com/amgad/awdah" \
      org.opencontainers.image.licenses="SEE LICENSE IN LICENSE"

WORKDIR /app

# Layer 1: Root configuration (rarely changes)
COPY package*.json tsconfig.base.json ./

# Layer 2: Workspace package manifests (changes occasionally)
RUN mkdir -p ./packages/shared ./apps/frontend
COPY packages/shared/package*.json ./packages/shared/
COPY apps/frontend/package*.json ./apps/frontend/

# Layer 3: Install dependencies (cached unless package files change)
RUN npm ci --ignore-scripts && npm cache clean --force

# Layer 4: Source code (changes frequently)
COPY packages/shared ./packages/shared
COPY apps/frontend ./apps/frontend

# Layer 5: Build shared package
RUN npm run build --workspace=packages/shared

# Layer 6: Build frontend with build-time env vars
ARG VITE_API_BASE_URL
ARG VITE_AUTH_MODE
ARG VITE_COGNITO_USER_POOL_ID
ARG VITE_COGNITO_CLIENT_ID
ARG VITE_AWS_REGION
ARG VITE_APP_EMAIL

ENV VITE_API_BASE_URL=${VITE_API_BASE_URL} \
    VITE_AUTH_MODE=${VITE_AUTH_MODE} \
    VITE_COGNITO_USER_POOL_ID=${VITE_COGNITO_USER_POOL_ID} \
    VITE_COGNITO_CLIENT_ID=${VITE_COGNITO_CLIENT_ID} \
    VITE_AWS_REGION=${VITE_AWS_REGION} \
    VITE_APP_EMAIL=${VITE_APP_EMAIL}

RUN npm run build --workspace=frontend

# Stage 2: Production Runtime (Nginx)
# -----------------------------------
FROM nginx:alpine

# OCI Labels
LABEL org.opencontainers.image.title="Awdah Frontend - Runtime" \
      org.opencontainers.image.description="Nginx serving Awdah React SPA" \
      org.opencontainers.image.vendor="Awdah"

# Copy built assets from builder
COPY --from=builder /app/apps/frontend/dist /usr/share/nginx/html

# Copy Nginx configuration
COPY apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
