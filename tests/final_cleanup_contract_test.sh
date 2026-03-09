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

# Scenario: validate uses centralized source/artifact paths
validate_block="$(extract_validate_block)"
if ! echo "$validate_block" | grep -Fq "src/agents"; then
  echo "FAIL: validate target does not reference src/agents"
  exit 1
fi
if ! echo "$validate_block" | grep -Fq "dist/platforms/opencode/agents"; then
  echo "FAIL: validate target does not reference dist/platforms/opencode/agents"
  exit 1
fi

# Scenario: build script copies only from centralized source
assert_contains "scripts/build.sh" 'cp -R "$source" "$out"'

# Scenario: make test ensures OpenCode artifacts are built before contractual checks
assert_contains "Makefile" '@$(MAKE) build TARGET=opencode'

# Scenario: build artifacts are ignored by policy
assert_contains ".gitignore" "dist/"

echo "PASS: final cleanup contract checks"
