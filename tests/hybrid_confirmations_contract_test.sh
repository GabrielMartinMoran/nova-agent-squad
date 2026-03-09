#!/usr/bin/env bash
set -euo pipefail

make build TARGET=opencode >/tmp/nas-build-opencode-hybrid.log

assert_contains() {
  local file="$1"
  local pattern="$2"
  if ! grep -Fq "$pattern" "$file"; then
    echo "FAIL: '$pattern' not found in $file"
    exit 1
  fi
}

# Scenario: Planning without unnecessary confirmations
assert_contains "dist/platforms/opencode/agents/Nova Agent Squad.md" "In planning: confirm only scope changes or critical assumptions."
assert_contains "dist/platforms/opencode/agents/Nova Agent Squad.md" "Do not ask for confirmation for minor analysis/spec steps."

# Scenario: Confirmation on scope change
assert_contains "dist/platforms/opencode/agents/Nova Agent Squad.md" "Must ask for explicit user confirmation when scope changes from the approved contract."

# Scenario: Confirmation on critical assumption
assert_contains "dist/platforms/opencode/agents/Nova Agent Squad.md" "Must ask for explicit user confirmation for any critical assumption before delegating implementation."

# Scenario: Exact mandatory apply gate
assert_contains "dist/platforms/opencode/agents/Nova Agent Squad.md" "Implementation plan is ready. Do you want me to apply it now?"
assert_contains "README.md" "Implementation plan is ready. Do you want me to apply it now?"
assert_contains "docs/architecture.md" "Implementation plan is ready. Do you want me to apply it now?"

# Scenario: Block without explicit approval
assert_contains "dist/platforms/opencode/agents/Nova Agent Squad.md" "Only after a clear affirmative answer can you invoke nas_developer."
assert_contains "dist/platforms/opencode/agents/Nova Agent Squad.md" "Prior approvals from earlier in the same conversation do NOT auto-authorize new changes."

# Documentation alignment
assert_contains "README.md" "confirm only scope changes or critical assumptions"
assert_contains "docs/architecture.md" "confirm only scope changes or critical assumptions"
assert_contains "docs/AGENTS.md" "confirm only scope changes or critical assumptions"

echo "PASS: hybrid confirmations contract checks"
