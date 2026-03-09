#!/usr/bin/env bash
set -euo pipefail

assert_contains() {
  local file="$1"
  local pattern="$2"
  if ! grep -Fq "$pattern" "$file"; then
    echo "FAIL: '$pattern' not found in $file"
    exit 1
  fi
}

assert_not_contains() {
  local file="$1"
  local pattern="$2"
  if grep -Fq "$pattern" "$file"; then
    echo "FAIL: unexpected '$pattern' found in $file"
    exit 1
  fi
}

extract_validate_block() {
  awk '/^validate:/{flag=1; next} /^doctor:/{flag=0} flag {print}' Makefile
}

# Scenario: validate uses centralized source/artifact, not .opencode as source-of-truth
validate_block="$(extract_validate_block)"
if echo "$validate_block" | grep -Fq ".opencode/agents"; then
  echo "FAIL: validate target still references .opencode/agents"
  exit 1
fi
if ! echo "$validate_block" | grep -Fq "src/agents"; then
  echo "FAIL: validate target does not reference src/agents"
  exit 1
fi

# Scenario: build script does not sync legacy .opencode/agents as side effect
assert_not_contains "scripts/build.sh" ".opencode/agents"

# Scenario: local .opencode garbage is explicitly ignored
assert_contains ".gitignore" ".opencode/node_modules/"
assert_contains ".gitignore" ".opencode/package.json"
assert_contains ".gitignore" ".opencode/bun.lock"

echo "PASS: final cleanup contract checks"
