#!/usr/bin/env bash
set -euo pipefail

# ── AWS Session Check ────────────────────────────────────────────────────────
# Verifies that the current shell has valid AWS credentials.
# Specifically tailored for AWS CLI v2 SSO login.

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -n "▸ Checking AWS session... "

if ! aws sts get-caller-identity --query "Arn" --output text >/dev/null 2>&1; then
  echo -e "${RED}EXPIRED or MISSING${NC}"
  echo ""
  echo -e "${YELLOW}No active AWS session found.${NC}"
  echo "Please run the following command to log in:"
  echo ""
  echo -e "  ${GREEN}aws sso login${NC}"
  echo ""
  exit 1
fi

IDENTITY=$(aws sts get-caller-identity --query "Arn" --output text)
echo -e "${GREEN}ACTIVE${NC} ($IDENTITY)"
echo ""
