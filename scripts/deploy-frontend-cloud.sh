#!/bin/bash
set -e

# deploy-frontend-cloud.sh
# Builds and deploys the frontend to AWS CloudFront.
# Usage: ./scripts/deploy-frontend-cloud.sh [env]

ENV=${1:-dev}

echo "🚀 Deploying Frontend to CloudFront ($ENV)..."

# 1. Build
echo "🏗️ Building frontend..."
npm run build --workspace=apps/frontend

# 2. Deploy
echo "🚀 Deploying FrontendStack via CDK..."
cd infra
npx cdk deploy Awdah-frontend-stack-$ENV --context env=$ENV --require-approval never
cd ..

# 3. Show Final URL
echo -e "\n✅ \033[0;32mDeployment Complete!\033[0m"
./scripts/list-outputs.sh $ENV
