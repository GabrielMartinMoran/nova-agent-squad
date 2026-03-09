#!/usr/bin/env bash
set -euo pipefail

make build TARGET=opencode >/tmp/nas-build-opencode-orchestrator.log

assert_contains() {
  local file="$1"
  local pattern="$2"
  if ! grep -Fq "$pattern" "$file"; then
    echo "FAIL: '$pattern' not found in $file"
    exit 1
  fi
}

# Scenario: Orchestrator can ask at most 3 questions per message
assert_contains "dist/platforms/opencode/agents/Nova Agent Squad.md" "Ask at most 3 questions per message."

echo "PASS: orchestrator question limit contract checks"
