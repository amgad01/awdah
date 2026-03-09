# Stage 1: Build
FROM node:24-slim AS builder

WORKDIR /app

# Copy root configs and package files
COPY package*.json ./
COPY tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY apps/backend ./apps/backend

# Install dependencies (using workspaces)
RUN npm install --ignore-scripts

# Build shared package first
RUN npm run build --workspace=packages/shared

# Build backend
RUN npm run build --workspace=@awdah/backend

# Stage 2: Runtime
FROM node:24-slim

WORKDIR /app

# Only copy what's needed for production
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/backend/dist ./apps/backend/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist

EXPOSE 3000

# This is a lambda-based project, but for a standalone Docker container 
# we'll use a simple entry point or custom runner if needed.
# Since the project is built for Lambda, this container is primarily for 
# local simulation/consistency or ECS deployment.
CMD ["node", "apps/backend/dist/index.js"]
