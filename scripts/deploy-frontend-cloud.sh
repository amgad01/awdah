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

# 3. Get Final URL
echo "📋 Fetching final URL..."
REGION=${AWS_DEFAULT_REGION:-eu-west-1}

FRONTEND_URL=$(aws cloudformation describe-stacks \
    --stack-name "Awdah-frontend-stack-$ENV" \
    --region "$REGION" \
    --query "Stacks[0].Outputs[?OutputKey=='FrontendUrl'].OutputValue" \
    --output text)

echo -e "\n✅ \033[0;32mDeployment Complete!\033[0m"
echo -e "🌐 \033[1;36mFrontend URL:\033[0m \033[1;33m$FRONTEND_URL\033[0m"
echo -e "\n💡 \033[0;90mView all outputs with: npm run outputs:$ENV\033[0m"
