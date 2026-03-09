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

# Scenario: Planning sin confirmaciones innecesarias
assert_contains ".opencode/agents/Nova Agent Squad.md" "En planning: confirmar solo cambios de scope o suposiciones críticas."
assert_contains ".opencode/agents/Nova Agent Squad.md" "No pedir confirmación por pasos menores de análisis/spec."

# Scenario: Confirmación en cambio de scope
assert_contains ".opencode/agents/Nova Agent Squad.md" "Must ask for explicit user confirmation when scope changes from the approved contract."

# Scenario: Confirmación en suposición crítica
assert_contains ".opencode/agents/Nova Agent Squad.md" "Must ask for explicit user confirmation for any critical assumption before delegating implementation."

# Scenario: Gate de apply exacto obligatorio
assert_contains ".opencode/agents/Nova Agent Squad.md" "Implementation plan is ready. Do you want me to apply it now?"
assert_contains "README.md" "Implementation plan is ready. Do you want me to apply it now?"
assert_contains "docs/architecture.md" "Implementation plan is ready. Do you want me to apply it now?"

# Scenario: Bloqueo sin aprobación explícita
assert_contains ".opencode/agents/Nova Agent Squad.md" "Only after a clear affirmative answer can you invoke nas_developer."
assert_contains ".opencode/agents/Nova Agent Squad.md" "Prior approvals from earlier in the same conversation do NOT auto-authorize new changes."

# Documentation alignment
assert_contains "README.md" "confirm only scope changes or critical assumptions"
assert_contains "docs/architecture.md" "confirm only scope changes or critical assumptions"
assert_contains "docs/AGENTS.md" "confirm only scope changes or critical assumptions"

echo "PASS: hybrid confirmations contract checks"
