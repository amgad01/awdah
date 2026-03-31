# Stage 1: Build
FROM node:20-slim AS builder

WORKDIR /app

# Copy root configs and package files
COPY package*.json ./
COPY tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY apps/frontend ./apps/frontend

# Install dependencies
RUN npm ci --ignore-scripts

# Build shared package first
RUN npm run build --workspace=packages/shared

# Build frontend with build-time environment variables
ARG VITE_API_BASE_URL
ARG VITE_AUTH_MODE
ARG VITE_COGNITO_USER_POOL_ID
ARG VITE_COGNITO_CLIENT_ID
ARG VITE_AWS_REGION
ARG VITE_APP_EMAIL

ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_AUTH_MODE=$VITE_AUTH_MODE
ENV VITE_COGNITO_USER_POOL_ID=$VITE_COGNITO_USER_POOL_ID
ENV VITE_COGNITO_CLIENT_ID=$VITE_COGNITO_CLIENT_ID
ENV VITE_AWS_REGION=$VITE_AWS_REGION
ENV VITE_APP_EMAIL=$VITE_APP_EMAIL

RUN npm run build --workspace=frontend

# Stage 2: Serve with Nginx
FROM nginx:alpine

# Copy built assets to Nginx html directory
COPY --from=builder /app/apps/frontend/dist /usr/share/nginx/html

# Copy custom Nginx config for SPA routing and API proxying
COPY apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
