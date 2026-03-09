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

# Scenario 1: Agent files are fully renamed
assert_exists ".opencode/agents/Nova Agent Squad.md"
assert_exists ".opencode/agents/nas_researcher.md"
assert_exists ".opencode/agents/nas_developer.md"
assert_exists ".opencode/agents/nas_qa.md"

# Scenario 2: Primary agent permissions and workflow references use nas_* IDs
assert_contains ".opencode/agents/Nova Agent Squad.md" '"nas_researcher": allow'
assert_contains ".opencode/agents/Nova Agent Squad.md" '"nas_developer": allow'
assert_contains ".opencode/agents/Nova Agent Squad.md" '"nas_qa": allow'
assert_contains ".opencode/agents/Nova Agent Squad.md" "invoke nas_developer"

# Scenario 3: Makefile references new branding and IDs
assert_contains "Makefile" "Nova Agent Squad - Makefile"
assert_contains "Makefile" "Nova Agent Squad agents"
assert_contains "Makefile" "~/.config/opencode/agents/\"Nova Agent Squad.md\""
assert_contains "Makefile" "~/.config/opencode/agents/nas_researcher.md"
assert_contains "Makefile" "~/.config/opencode/agents/nas_developer.md"
assert_contains "Makefile" "~/.config/opencode/agents/nas_qa.md"
assert_contains "Makefile" "The default agent should be 'Nova Agent Squad'."

# Scenario 4: Core documentation uses Nova Agent Squad and nas_* IDs
assert_contains "README.md" "Nova Agent Squad"
assert_contains "docs/architecture.md" "Nova Agent Squad"
assert_contains "docs/AGENTS.md" "Nova Agent Squad"
assert_contains "CHANGELOG.md" "Nova Agent Squad"
assert_contains "CONTRIBUTING.md" "Nova Agent Squad"

echo "PASS: rename Nova + NAS contract checks"
