#!/usr/bin/env bash

load_env_defaults() {
  local env_file="$1"

  if [ ! -f "$env_file" ]; then
    return 0
  fi

  while IFS= read -r raw_line || [ -n "$raw_line" ]; do
    local line="$raw_line"
    line="${line%"${line##*[![:space:]]}"}"
    line="${line#"${line%%[![:space:]]*}"}"

    if [ -z "$line" ] || [[ "$line" == \#* ]] || [[ "$line" != *=* ]]; then
      continue
    fi

    local key="${line%%=*}"
    local value="${line#*=}"

    key="${key%"${key##*[![:space:]]}"}"
    key="${key#"${key%%[![:space:]]*}"}"

    if [ -z "$key" ] || [ -n "${!key+x}" ]; then
      continue
    fi

    if [[ "$value" =~ ^\".*\"$ ]] || [[ "$value" =~ ^\'.*\'$ ]]; then
      value="${value:1:${#value}-2}"
    fi

    export "$key=$value"
  done < "$env_file"
}

frontend_target_for_env() {
  local env_name="${1:-dev}"

  case "$env_name" in
    prod)
      printf 'pages\n'
      ;;
    *)
      printf 'cloudfront\n'
      ;;
  esac
}

normalize_base_path() {
  local base_path="${1:-/}"

  if [ -z "$base_path" ]; then
    printf '/\n'
    return 0
  fi

  if [[ "$base_path" != /* ]]; then
    base_path="/$base_path"
  fi

  if [[ "$base_path" != */ ]]; then
    base_path="$base_path/"
  fi

  printf '%s\n' "$base_path"
}

compute_site_url() {
  local origin="${1%/}"
  local base_path
  base_path="$(normalize_base_path "${2:-/}")"

  printf '%s%s\n' "$origin" "$base_path"
}

pages_path_segments_to_keep() {
  local base_path
  base_path="$(normalize_base_path "${1:-/}")"
  local trimmed="${base_path#/}"
  trimmed="${trimmed%/}"

  if [ -z "$trimmed" ]; then
    printf '0\n'
    return 0
  fi

  local segments=()
  IFS='/' read -r -a segments <<< "$trimmed"
  printf '%s\n' "${#segments[@]}"
}

aws_session_active() {
  if ! command -v aws >/dev/null 2>&1; then
    return 1
  fi

  aws sts get-caller-identity --query "Arn" --output text >/dev/null 2>&1
}

read_stack_output() {
  local stack_name="$1"
  local output_key="$2"
  local region="${3:-${AWS_DEFAULT_REGION:-eu-west-1}}"
  local value

  value="$(
    aws cloudformation describe-stacks \
      --stack-name "$stack_name" \
      --region "$region" \
      --query "Stacks[0].Outputs[?OutputKey=='$output_key'].OutputValue" \
      --output text 2>/dev/null || true
  )"

  if [ "$value" = "None" ] || [ "$value" = "null" ]; then
    value=""
  fi

  printf '%s\n' "$value"
}
