#!/usr/bin/env bash

# Awdah Stack Outputs, readable summary
# Usage: ./scripts/deploy/list-outputs.sh [env]

SET_ENV=${1:-dev}
REGION=${AWS_DEFAULT_REGION:-eu-west-1}

YELLOW='\033[1;33m'
BLUE='\033[1;34m'
GREEN='\033[0;32m'
DIM='\033[2m'
NC='\033[0m'

echo -e "${YELLOW}====================================================${NC}"
echo -e "${YELLOW}  Awdah Stack Outputs: ${SET_ENV}${NC}"
echo -e "${YELLOW}====================================================${NC}"

STACKS=("auth" "api" "frontend" "data" "alarm")

for STACK_TYPE in "${STACKS[@]}"; do
    STACK="Awdah-${STACK_TYPE}-stack-${SET_ENV}"

    RAW=$(aws cloudformation describe-stacks \
        --stack-name "$STACK" \
        --region "$REGION" \
        --query "Stacks[0].Outputs[].{k:OutputKey,v:OutputValue}" \
        --output text 2>/dev/null)

    if [ $? -ne 0 ] || [ -z "$RAW" ]; then
        continue
    fi

    echo -e "\n${BLUE}  ${STACK_TYPE}${NC}"
    echo -e "${DIM}  $(printf '%.0s─' {1..46})${NC}"

    while IFS=$'\t' read -r key value; do
        # Skip CDK internal export keys, they're noise
        [[ "$key" == ExportsOutput* ]] && continue
        printf "  ${GREEN}%-35s${NC}  %s\n" "$key" "$value"
    done <<< "$RAW"
done

echo -e "\n${YELLOW}====================================================${NC}"
