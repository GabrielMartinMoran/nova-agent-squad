#!/usr/bin/env bash
set -euo pipefail

assert_exists() {
  local path="$1"
  if [ ! -e "$path" ]; then
    echo "FAIL: missing $path"
    exit 1
  fi
}

assert_contains() {
  local file="$1" pattern="$2"
  if ! grep -Fq -- "$pattern" "$file"; then
    echo "FAIL: '$pattern' not found in $file"
    exit 1
  fi
}

assert_not_contains() {
  local file="$1" pattern="$2"
  if grep -Fq -- "$pattern" "$file"; then
    echo "FAIL: '$pattern' should NOT be in $file"
    exit 1
  fi
}

# Scenario: OpenCode build emits agents (but NOT per-agent caveman reference files).
make build TARGET=opencode >/tmp/nas-caveman-build.log
assert_exists "dist/platforms/opencode/agents/nas_developer.md"
assert_exists "dist/platforms/opencode/agents/nas_qa.md"

# Scenario: No per-agent caveman reference files in dist/ (build injects inline).
if [ -f "dist/platforms/opencode/references/nas_caveman_developer.md" ]; then
  echo "FAIL: dist/platforms/opencode/references/nas_caveman_developer.md should not exist (caveman is now inline)"
  exit 1
fi
if [ -f "dist/platforms/opencode/references/nas_caveman_qa.md" ]; then
  echo "FAIL: dist/platforms/opencode/references/nas_caveman_qa.md should not exist (caveman is now inline)"
  exit 1
fi

# Scenario: No monolithic nas_caveman.md (without suffix) lingers in dist.
if [ -f "dist/platforms/opencode/references/nas_caveman.md" ]; then
  echo "FAIL: stale monolithic dist/platforms/opencode/references/nas_caveman.md should not exist"
  exit 1
fi

# Scenario: OpenCode install dry-run does NOT install per-agent caveman references.
install_output="$(make install TARGET=opencode DRY_RUN=1 DESTDIR=/tmp/nas-caveman-contract 2>&1)"
if echo "$install_output" | grep -Fq "nas_caveman_developer.md\|nas_caveman_qa.md"; then
  echo "FAIL: install should NOT reference per-agent caveman files (caveman is now inline)"
  exit 1
fi

# Scenario: Source agents contain injection markers (build-time injection points).
assert_contains "src/agents/nas_developer.md" "<!-- INJECT:caveman_developer -->"
assert_contains "src/agents/nas_qa.md" "<!-- INJECT:caveman_qa -->"

# Scenario: Source agents do NOT contain "fail closed" or "read ~/.config/opencode/references" anymore.
assert_not_contains "src/agents/nas_developer.md" "fail closed"
assert_not_contains "src/agents/nas_developer.md" "read \`~/.config/opencode/references/"
assert_not_contains "src/agents/nas_qa.md" "fail closed"
assert_not_contains "src/agents/nas_qa.md" "read \`~/.config/opencode/references/"

# Scenario: Source agents do NOT contain external_directory references.
assert_not_contains "src/agents/nas_developer.md" "external_directory"
assert_not_contains "src/agents/nas_qa.md" "external_directory"

# Scenario: Source agents do NOT contain caveman_reference_read.
assert_not_contains "src/agents/nas_developer.md" "caveman_reference_read"
assert_not_contains "src/agents/nas_qa.md" "caveman_reference_read"

# Scenario: Built dist agents contain caveman rules inline.
DEV_DIST="dist/platforms/opencode/agents/nas_developer.md"
QA_DIST="dist/platforms/opencode/agents/nas_qa.md"
assert_contains "$DEV_DIST" "NAS Caveman Reference"
assert_contains "$QA_DIST" "NAS Caveman Reference"
assert_contains "$DEV_DIST" "## Preserve exactly"
assert_contains "$QA_DIST" "## Preserve exactly"
assert_contains "$DEV_DIST" "## Do not apply to"
assert_contains "$QA_DIST" "## Do not apply to"

# Scenario: Built dist agents contain agent-specific caveman rules.
assert_contains "$DEV_DIST" "## Developer"
assert_contains "$QA_DIST" "## QA"

# Scenario: Built dist agents do NOT contain injection markers.
assert_not_contains "$DEV_DIST" "<!-- INJECT:caveman_developer -->"
assert_not_contains "$DEV_DIST" "<!-- INJECT:caveman_qa -->"
assert_not_contains "$QA_DIST" "<!-- INJECT:caveman_developer -->"
assert_not_contains "$QA_DIST" "<!-- INJECT:caveman_qa -->"

# Scenario: Built dist agents do NOT contain external file references.
assert_not_contains "$DEV_DIST" "nas_caveman_developer.md"
assert_not_contains "$DEV_DIST" "nas_caveman_qa.md"
assert_not_contains "$QA_DIST" "nas_caveman_developer.md"
assert_not_contains "$QA_DIST" "nas_caveman_qa.md"

# Scenario: Built dist agents do NOT contain caveman_reference_read.
assert_not_contains "$DEV_DIST" "caveman_reference_read"
assert_not_contains "$QA_DIST" "caveman_reference_read"

# Scenario: Built dist agents do NOT contain external_directory.
assert_not_contains "$DEV_DIST" "external_directory"
assert_not_contains "$QA_DIST" "external_directory"

# Scenario: Template source has SHARED, AGENT:developer, and AGENT:qa markers.
TEMPLATE="src/references/nas_caveman.md.tmpl"
assert_exists "$TEMPLATE"
assert_contains "$TEMPLATE" "<!-- BEGIN SHARED -->"
assert_contains "$TEMPLATE" "<!-- END SHARED -->"
assert_contains "$TEMPLATE" "<!-- BEGIN AGENT:developer -->"
assert_contains "$TEMPLATE" "<!-- END AGENT:developer -->"
assert_contains "$TEMPLATE" "<!-- BEGIN AGENT:qa -->"
assert_contains "$TEMPLATE" "<!-- END AGENT:qa -->"

# Scenario: Shared content exists in both built dist agents (inlined from template).
# Attribution
assert_contains "$DEV_DIST" "Julius Brussee's Caveman skill"
assert_contains "$QA_DIST" "Julius Brussee's Caveman skill"
# Core rules
assert_contains "$DEV_DIST" "## Auto-clarity"
assert_contains "$QA_DIST" "## Auto-clarity"
assert_contains "$DEV_DIST" "## General"
assert_contains "$QA_DIST" "## General"
assert_contains "$DEV_DIST" "## Conflict"
assert_contains "$QA_DIST" "## Conflict"
assert_contains "$DEV_DIST" "## Test coverage"
assert_contains "$QA_DIST" "## Test coverage"
assert_contains "$DEV_DIST" "Test coverage is a project artifact"
assert_contains "$QA_DIST" "Test coverage is a project artifact"

# Scenario: Developer dist output does NOT contain QA-only terms.
assert_not_contains "$DEV_DIST" "QA is read-only"
assert_not_contains "$DEV_DIST" "Caveman never authorizes edits"

# Scenario: QA dist output does NOT contain Developer-only terms.
assert_not_contains "$QA_DIST" "RED done"
assert_not_contains "$QA_DIST" "TDD engineer"

# Scenario: QA prompt remains read-only (source) and scopes caveman to its own prose only (dist).
assert_not_contains "src/agents/nas_qa.md" "Only proceed with edits when explicitly requested"
assert_contains "src/agents/nas_qa.md" "If asked to edit or fix files, refuse and escalate to Orchestrator because QA is read-only."
assert_contains "$QA_DIST" "Use this style only for QA's own visible/intermediate verification prose"
assert_contains "$QA_DIST" "Keep final \`<qa_verdict>\`, evidence, logs, errors, filenames, XML/tags, and Gherkin exact"

# Scenario: No OpenCode references config is introduced.
if [ -f "opencode.json" ]; then
  assert_not_contains "opencode.json" '"references"'
fi

# Scenario: Original monolithic source file no longer exists.
if [ -f "src/references/nas_caveman.md" ]; then
  echo "FAIL: monolithic src/references/nas_caveman.md should not exist after per-agent migration"
  exit 1
fi

# Scenario: QA dist agent does not leak Developer-specific heading.
assert_not_contains "$QA_DIST" "## Developer"

echo "PASS: caveman reference contract checks"
