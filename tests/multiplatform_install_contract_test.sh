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
  local file="$1"
  local pattern="$2"
  if ! grep -Fq "$pattern" "$file"; then
    echo "FAIL: '$pattern' not found in $file"
    exit 1
  fi
}

# Scenario: Existe guía/matriz para plataformas aprobadas
assert_exists "docs/installation-matrix.md"
for platform in \
  "OpenCode" \
  "Cursor" \
  "Cursor CLI Agent" \
  "Claude Code" \
  "Codex" \
  "Gemini CLI" \
  "Kiro" \
  "VS Code"
do
  assert_contains "docs/installation-matrix.md" "$platform"
done

# Scenario: Artefactos o plantillas por plataforma
assert_exists "dist/platforms/opencode"
assert_exists "dist/platforms/cursor"
assert_exists "dist/platforms/cursor-cli-agent"
assert_exists "dist/platforms/claude-code"
assert_exists "dist/platforms/codex"
assert_exists "dist/platforms/gemini-cli"
assert_exists "dist/platforms/kiro"
assert_exists "dist/platforms/vscode"

# Scenario: OpenCode documenta por qué no usa plantilla file-based
assert_exists "src/templates/platforms/opencode/README.md"
assert_contains "src/templates/platforms/opencode/README.md" "kind=dir"
assert_contains "src/templates/platforms/opencode/README.md" "src/agents"

# Scenario: Antigravity no viable temporal + razón
assert_contains "docs/installation-matrix.md" "Antigravity"
assert_contains "docs/installation-matrix.md" "No viable (temporal)"
assert_contains "docs/installation-matrix.md" "sin documentación técnica verificable"

# Scenario: OpenCode sin regresiones en ruta de instalación principal
assert_contains "README.md" "make install TARGET=opencode"
assert_contains "Makefile" "TARGET ?= opencode"
assert_contains "Makefile" "@bash scripts/install.sh"

echo "PASS: multiplatform installation contract checks"
