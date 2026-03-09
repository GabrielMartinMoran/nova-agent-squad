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

# Scenario: Ajuste de frontmatter steps para margen operativo
assert_contains ".opencode/agents/nas_researcher.md" "steps: 30"
assert_contains ".opencode/agents/nas_developer.md" "steps: 30"
assert_contains ".opencode/agents/nas_qa.md" "steps: 30"

for file in \
  ".opencode/agents/nas_researcher.md" \
  ".opencode/agents/nas_developer.md" \
  ".opencode/agents/nas_qa.md"
do
  # Scenario: Comportamiento estándar en tramo <=10
  assert_contains "$file" "<=10: estándar"
  # Scenario: Evaluación de cercanía de cierre en >=20
  assert_contains "$file" ">=20: tarea compleja; evaluar cercanía de cierre"
  # Scenario: Decisión obligatoria en >=27
  assert_contains "$file" ">=27: decisión obligatoria: cerrar si está cerca o handoff al orquestador si falta trabajo sustantivo"
  # Scenario: Formato de handoff obligatorio al orquestador
  assert_contains "$file" "progreso_actual"
  assert_contains "$file" "trabajo_restante"
  assert_contains "$file" "riesgos"
  assert_contains "$file" "recomendacion: [SEGUIR | NO_SEGUIR]"
  assert_contains "$file" "pregunta_al_usuario"
done

# Scenario: Documentación alineada
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
