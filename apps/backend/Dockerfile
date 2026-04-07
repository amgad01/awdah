# syntax=docker/dockerfile:1
# -----------------------------------------------------------------------------
# Awdah Backend - Multi-stage Production Build
# -----------------------------------------------------------------------------

# Stage 1: Dependencies + Build
# -----------------------------
FROM node:20-slim AS builder

# OCI Labels
LABEL org.opencontainers.image.title="Awdah Backend" \
      org.opencontainers.image.description="API backend for Awdah worship tracking" \
      org.opencontainers.image.vendor="Awdah" \
      org.opencontainers.image.source="https://github.com/amgad/awdah" \
      org.opencontainers.image.licenses="SEE LICENSE IN LICENSE"

WORKDIR /app

# Layer 1: Root configuration (rarely changes)
COPY package*.json tsconfig.base.json ./

# Layer 2: Workspace package manifests (changes occasionally)
RUN mkdir -p ./packages/shared ./apps/backend
COPY packages/shared/package*.json ./packages/shared/
COPY apps/backend/package*.json ./apps/backend/

# Layer 3: Install dependencies (cached unless package files change)
RUN npm ci --ignore-scripts && npm cache clean --force

# Layer 4: Source code (changes frequently)
COPY packages/shared ./packages/shared
COPY apps/backend ./apps/backend

# Layer 5: Build shared package
RUN npm run build --workspace=packages/shared

# Layer 6: Build backend
RUN npm run build --workspace=@awdah/backend

# Stage 2: Production Runtime
# ---------------------------
FROM node:20-slim

# OCI Labels
LABEL org.opencontainers.image.title="Awdah Backend - Runtime" \
      org.opencontainers.image.description="Node.js runtime for Awdah API" \
      org.opencontainers.image.vendor="Awdah"

WORKDIR /app

# Layer 7: Copy only production artifacts
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/backend/node_modules ./apps/backend/node_modules
COPY --from=builder /app/apps/backend/dist ./apps/backend/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist

EXPOSE 3000

# Lambda-based project; this container is for local simulation or ECS deployment
CMD ["node", "apps/backend/dist/index.js"]
