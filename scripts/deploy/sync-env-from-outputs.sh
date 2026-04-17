#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
INFRA_DIR="$ROOT_DIR/infra"
OUTPUT_JSON="$INFRA_DIR/outputs.json"
ENV_FILE="$ROOT_DIR/.env"

# shellcheck source=../lib/common.sh
source "$SCRIPT_DIR/../lib/common.sh"

load_env_defaults "$ENV_FILE"

ENV="${DEPLOY_ENV:-dev}"
AWS_REGION="${AWS_DEFAULT_REGION:-eu-west-1}"

if [ ! -f "$OUTPUT_JSON" ]; then
  echo "=> [Warning] outputs.json not found. Skipping .env sync."
  exit 0
fi

echo "=> Syncing root .env from deployment outputs..."

node <<EOF
const fs = require('fs');

const outputsPath = '$OUTPUT_JSON';
const envPath = '$ENV_FILE';
const env = '$ENV';
const region = '$AWS_REGION';

/** Reads .env file and returns lines array preserving comments. */
function readEnvLines(filePath) {
  if (!fs.existsSync(filePath)) return [];
  return fs.readFileSync(filePath, 'utf8').split('\n');
}

/** Updates or adds a key in .env lines. */
function updateEnvLine(lines, key, value) {
  const pattern = new RegExp('^' + key + '=');
  let found = false;
  const updated = lines.map(line => {
    if (pattern.test(line)) {
      found = true;
      return key + '=' + value;
    }
    return line;
  });
  if (!found) {
    updated.push(key + '=' + value);
  }
  return updated;
}

try {
  const outputs = JSON.parse(fs.readFileSync(outputsPath, 'utf8'));
  const authStack = outputs[\`Awdah-auth-stack-\${env}\`];
  const apiStack = outputs[\`Awdah-api-stack-\${env}\`];
  
  let lines = readEnvLines(envPath);
  const updates = [];
  
  if (authStack) {
    if (authStack.UserPoolId) {
      lines = updateEnvLine(lines, 'COGNITO_USER_POOL_ID', authStack.UserPoolId);
      lines = updateEnvLine(lines, 'VITE_COGNITO_USER_POOL_ID', authStack.UserPoolId);
      updates.push('VITE_COGNITO_USER_POOL_ID');
    }
    if (authStack.UserPoolClientId) {
      lines = updateEnvLine(lines, 'COGNITO_CLIENT_ID', authStack.UserPoolClientId);
      lines = updateEnvLine(lines, 'VITE_COGNITO_CLIENT_ID', authStack.UserPoolClientId);
      updates.push('VITE_COGNITO_CLIENT_ID');
    }
  }
  
  if (apiStack && apiStack.ApiUrl) {
    lines = updateEnvLine(lines, 'VITE_API_BASE_URL', apiStack.ApiUrl);
    updates.push('VITE_API_BASE_URL');
  }
  
  // Always ensure region is set
  lines = updateEnvLine(lines, 'AWS_DEFAULT_REGION', region);
  lines = updateEnvLine(lines, 'VITE_AWS_REGION', region);
  
  fs.writeFileSync(envPath, lines.join('\n') + '\n');
  
  if (updates.length > 0) {
    console.log('   Updated: ' + updates.join(', '));
  } else {
    console.log('   No Cognito/API changes to sync.');
  }
} catch (err) {
  console.error('=> [Warning] Failed to sync .env:', err.message);
  // Don't fail the deployment for this
  process.exit(0);
}
EOF

echo "=> Root .env sync complete."
