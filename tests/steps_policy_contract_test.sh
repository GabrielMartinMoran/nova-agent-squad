#!/usr/bin/env bash
set -euo pipefail

make build TARGET=opencode >/tmp/nas-build-opencode-steps.log

assert_contains() {
  local file="$1"
  local pattern="$2"
  if ! grep -Fq "$pattern" "$file"; then
    echo "FAIL: '$pattern' not found in $file"
    exit 1
  fi
}

# Scenario: Frontmatter steps adjusted for operational margin
assert_contains "dist/platforms/opencode/agents/nas_researcher.md" "steps: 30"
assert_contains "dist/platforms/opencode/agents/nas_developer.md" "steps: 30"
assert_contains "dist/platforms/opencode/agents/nas_qa.md" "steps: 30"

for file in \
  "dist/platforms/opencode/agents/nas_researcher.md" \
  "dist/platforms/opencode/agents/nas_developer.md" \
  "dist/platforms/opencode/agents/nas_qa.md"
do
  # Scenario: Standard behavior for <=10
  assert_contains "$file" "<=10: standard"
  # Scenario: Evaluate closeness to completion for >=20
  assert_contains "$file" ">=20: complex task; evaluate closeness to completion"
  # Scenario: Mandatory decision for >=27
  assert_contains "$file" ">=27: mandatory decision: close if near completion or handoff to orchestrator if substantial work remains"
  # Scenario: Mandatory handoff format to orchestrator
  assert_contains "$file" "current_progress"
  assert_contains "$file" "remaining_work"
  assert_contains "$file" "risks"
  assert_contains "$file" "recommendation: [CONTINUE | DO_NOT_CONTINUE]"
  assert_contains "$file" "question_for_user"
done

# Scenario: Documentation alignment
assert_contains "docs/AGENTS.md" "hard cap"
assert_contains "docs/AGENTS.md" "soft thresholds"
assert_contains "docs/AGENTS.md" "handoff"

assert_contains "docs/architecture.md" "hard cap"
assert_contains "docs/architecture.md" "soft thresholds"
assert_contains "docs/architecture.md" "handoff"

assert_contains "README.md" "hard cap"
assert_contains "README.md" "soft thresholds"
assert_contains "README.md" "handoff"

echo "PASS: steps policy contract checks"
