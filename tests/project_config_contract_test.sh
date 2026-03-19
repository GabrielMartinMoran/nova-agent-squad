#!/usr/bin/env bash
set -euo pipefail

make build TARGET=opencode >/tmp/nas-build-project-config.log

assert_contains() {
  local file="$1"
  local pattern="$2"
  if ! grep -Fq -- "$pattern" "$file"; then
    echo "FAIL: '$pattern' not found in $file"
    exit 1
  fi
}

assert_not_contains() {
  local file="$1"
  local pattern="$2"
  if grep -Fq -- "$pattern" "$file"; then
    echo "FAIL: '$pattern' should NOT be in $file"
    exit 1
  fi
}

# Scenario: Orchestrator has mandatory config section with schema
assert_contains "src/agents/Nova Agent Squad.md" "Mandatory Project Config"
assert_contains "src/agents/Nova Agent Squad.md" ".agents/nas.config.yaml"
assert_contains "src/agents/Nova Agent Squad.md" "version:"

# Scenario: Config schema includes memory provider config
assert_contains "src/agents/Nova Agent Squad.md" "memory:"
assert_contains "src/agents/Nova Agent Squad.md" "provider: mind"

# Scenario: Config schema includes mind spaces (project + checkpoint)
assert_contains "src/agents/Nova Agent Squad.md" "mind_spaces:"
assert_contains "src/agents/Nova Agent Squad.md" "project_space:"
assert_contains "src/agents/Nova Agent Squad.md" "checkpoint_space:"

# Scenario: Config schema includes gherkin persistence with filters
assert_contains "src/agents/Nova Agent Squad.md" "gherkin:"
assert_contains "src/agents/Nova Agent Squad.md" "include:"
assert_contains "src/agents/Nova Agent Squad.md" "exclude:"

# Scenario: Config schema includes config_policy
assert_contains "src/agents/Nova Agent Squad.md" "config_policy:"
assert_contains "src/agents/Nova Agent Squad.md" "require_confirmation:"

# Scenario: First-run enforcement defined
assert_contains "src/agents/Nova Agent Squad.md" "First-Run Enforcement"
assert_contains "src/agents/Nova Agent Squad.md" "First run** is defined as"

# Scenario: Startup config check in workflow
assert_contains "src/agents/Nova Agent Squad.md" "Startup: Config Check"
assert_contains "src/agents/Nova Agent Squad.md" "HALT all normal workflow"

# Scenario: Config modification requires confirmation
assert_contains "src/agents/Nova Agent Squad.md" "Config Modification"
assert_contains "src/agents/Nova Agent Squad.md" "requires explicit user confirmation"

# Scenario: Orchestrator delegates config writes to developer
assert_contains "src/agents/Nova Agent Squad.md" "delegate the write to \`nas_developer\`"

# Scenario: Config Field Explanations section exists (new requirement)
assert_contains "src/agents/Nova Agent Squad.md" "### Config Field Explanations"
assert_contains "src/agents/Nova Agent Squad.md" "**\`version\`**: Config schema version"
assert_contains "src/agents/Nova Agent Squad.md" "memory.enabled"
assert_contains "src/agents/Nova Agent Squad.md" "memory.provider"
assert_contains "src/agents/Nova Agent Squad.md" "mind_spaces.project_space"
assert_contains "src/agents/Nova Agent Squad.md" "mind_spaces.checkpoint_space"
assert_contains "src/agents/Nova Agent Squad.md" "gherkin.enabled"
assert_contains "src/agents/Nova Agent Squad.md" "gherkin.include"
assert_contains "src/agents/Nova Agent Squad.md" "gherkin.exclude"
assert_contains "src/agents/Nova Agent Squad.md" "config_policy.require_confirmation"

# Scenario: Quick Start Defaults section exists (new requirement)
assert_contains "src/agents/Nova Agent Squad.md" "### Quick Start Defaults"
assert_contains "src/agents/Nova Agent Squad.md" "version: \"1.0\""
assert_contains "src/agents/Nova Agent Squad.md" "provider: mind"
assert_contains "src/agents/Nova Agent Squad.md" "name: \"projects/myproject\""
assert_contains "src/agents/Nova Agent Squad.md" "name: \"sessions/myproject\""
assert_contains "src/agents/Nova Agent Squad.md" "storage_path: \"specs/features\""

# Scenario: Monorepo guidance with package-level examples
assert_contains "src/agents/Nova Agent Squad.md" "packages/api/specs/features"

# Scenario: Runtime config propagation section exists
assert_contains "src/agents/Nova Agent Squad.md" "Runtime Config Propagation"

# Scenario: Optimization - do not pass disabled blocks
assert_contains "src/agents/Nova Agent Squad.md" "DO NOT pass config blocks that are disabled"

# Scenario: Exception for config editing tasks
assert_contains "src/agents/Nova Agent Squad.md" "task purpose is specifically to edit the config file"

# Scenario: What you should never do includes config items
assert_contains "src/agents/Nova Agent Squad.md" "Proceed without checking for project config"
assert_contains "src/agents/Nova Agent Squad.md" "Skip first-run config creation flow"
assert_contains "src/agents/Nova Agent Squad.md" "Write config files yourself"

# Scenario: Built artifacts include config schema
assert_contains "dist/platforms/opencode/agents/Nova Agent Squad.md" ".agents/nas.config.yaml"
assert_contains "dist/platforms/opencode/agents/Nova Agent Squad.md" "Runtime Config Propagation"

# Scenario: Architecture docs document the config
assert_contains "docs/architecture.md" "Project Configuration"
assert_contains "docs/architecture.md" "First-Run Enforcement"
assert_contains "docs/architecture.md" "Runtime Config Propagation"

# Scenario: README documents the config
assert_contains "README.md" "Project Configuration"
assert_contains "README.md" "First-Run Enforcement"
assert_contains "README.md" "Config Modification"

echo "PASS: project config contract checks"
