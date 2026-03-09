#!/usr/bin/env bash
set -euo pipefail

assert_contains_text() {
  local text="$1"
  local pattern="$2"
  if ! grep -Fq "$pattern" <<<"$text"; then
    echo "FAIL: '$pattern' not found in make help output"
    exit 1
  fi
}

help_output="$(make help)"

# Scenario: Help output exposes explicit sections
assert_contains_text "$help_output" "make commands:"
assert_contains_text "$help_output" "supported platform TARGET values:"
if grep -Fq "Target details:" <<<"$help_output"; then
  echo "FAIL: 'Target details:' should not be present in make help output"
  exit 1
fi

# Scenario: TARGET values come from manifest entries
while IFS='|' read -r target _rest; do
  case "$target" in
    ""|\#*)
      continue
      ;;
  esac
  assert_contains_text "$help_output" "  - ${target}"
done < config/platforms.manifest

# Scenario: command list includes inline descriptions and keeps scope hints
assert_contains_text "$help_output" "make build TARGET=<target|all> - Build centralized artifacts to dist/"
assert_contains_text "$help_output" "make install TARGET=<target> [DRY_RUN=1] [DESTDIR=...] - Install built target"
assert_contains_text "$help_output" "make uninstall   - Remove agents from global OpenCode config"
assert_contains_text "$help_output" "make validate   - Validate agent file structure"
assert_contains_text "$help_output" "make doctor     - Check build/install preconditions"
assert_contains_text "$help_output" "make test       - Run contractual tests"
assert_contains_text "$help_output" "make list-platform-templates - List distribution templates by platform"
assert_contains_text "$help_output" "make check-deps - Check OpenCode installation"
assert_contains_text "$help_output" "make help       - Show this help message"

echo "PASS: make help TARGET values contract checks"
