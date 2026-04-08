#!/usr/bin/env bash
set -euo pipefail

semver_pattern='^v[0-9]+\.[0-9]+\.[0-9]+$'
release_branch_pattern='^release/(v[0-9]+\.[0-9]+\.[0-9]+)([-/].*)?$'

source_ref="${TRIGGERING_HEAD_BRANCH:-${GITHUB_REF_NAME:-}}"
source_sha="${TRIGGERING_HEAD_SHA:-${GITHUB_SHA:-}}"
input_release_tag="${INPUT_RELEASE_TAG:-}"

if [ -z "$source_ref" ] || [ -z "$source_sha" ]; then
  echo "Unable to resolve source ref/SHA for the release." >&2
  echo "source_ref='$source_ref' source_sha='$source_sha'" >&2
  exit 1
fi

validate_semver() {
  local value="$1"
  if ! printf '%s' "$value" | grep -Eq "$semver_pattern"; then
    echo "Invalid release tag '$value'. Expected format vX.Y.Z" >&2
    exit 1
  fi
}

git fetch --tags --force >/dev/null 2>&1

branch_release_tag=""
if [[ "$source_ref" =~ $release_branch_pattern ]]; then
  branch_release_tag="${BASH_REMATCH[1]}"
fi

commit_release_tag=""
if git tag --points-at "$source_sha" --list 'v[0-9]*.[0-9]*.[0-9]*' >/dev/null 2>&1; then
  commit_release_tag="$(git tag --points-at "$source_sha" --list 'v[0-9]*.[0-9]*.[0-9]*' --sort=-v:refname | head -n 1)"
fi

release_tag_source=""
release_tag=""

if [ -n "$input_release_tag" ]; then
  validate_semver "$input_release_tag"
  release_tag="$input_release_tag"
  release_tag_source="manual-input"
elif [ -n "$branch_release_tag" ]; then
  release_tag="$branch_release_tag"
  release_tag_source="release-branch"
elif printf '%s' "$source_ref" | grep -Eq "$semver_pattern"; then
  release_tag="$source_ref"
  release_tag_source="tag-ref"
elif [ -n "$commit_release_tag" ]; then
  release_tag="$commit_release_tag"
  release_tag_source="existing-commit-tag"
else
  cat >&2 <<EOF
Unable to determine a deterministic release version.

Provide one of the following:
- a release branch named release/vX.Y.Z-*
- an explicit workflow input release_tag=vX.Y.Z
- an existing semver tag already attached to the source commit

Resolved source ref: $source_ref
Resolved source sha: $source_sha
EOF
  exit 1
fi

if git rev-parse --verify --quiet "refs/tags/$release_tag" >/dev/null 2>&1; then
  tagged_sha="$(git rev-list -n 1 "$release_tag")"
  if [ "$tagged_sha" != "$source_sha" ]; then
    cat >&2 <<EOF
Release tag collision detected.

Tag $release_tag already points to $tagged_sha, but this run is trying to deploy $source_sha.
Use a different release_tag or deploy the branch whose version matches this commit.
EOF
    exit 1
  fi
fi

if [ -n "${GITHUB_OUTPUT:-}" ]; then
  {
    echo "source_ref=$source_ref"
    echo "source_sha=$source_sha"
    echo "release_tag=$release_tag"
    echo "release_tag_source=$release_tag_source"
  } >> "$GITHUB_OUTPUT"
fi

if [ -n "${GITHUB_STEP_SUMMARY:-}" ]; then
  {
    echo "## Release Context"
    echo
    echo "- Source ref: \


  $source_ref"
    echo "- Source SHA: \


  $source_sha"
    echo "- Resolved release tag: \


  $release_tag"
    echo "- Release tag source: \


  $release_tag_source"
    echo
    echo "GitHub Actions cannot dynamically prefill the workflow approval dialog with a computed value."
    echo "This workflow resolves the version before the protected deploy job starts and exposes it in the run summary and job name instead."
  } >> "$GITHUB_STEP_SUMMARY"
fi

printf 'Resolved release tag %s from %s (%s)\n' "$release_tag" "$release_tag_source" "$source_ref"