#!/usr/bin/env bash
set -euo pipefail

MANIFEST="config/platforms.manifest"
FAILURES=0

pass() {
  echo "PASS: $1"
}

fail() {
  echo "FAIL: $1"
  FAILURES=$((FAILURES + 1))
}

check_command() {
  local cmd="$1"
  if command -v "$cmd" >/dev/null 2>&1; then
    pass "commands/$cmd available"
  else
    fail "commands/$cmd missing"
  fi
}

check_readable_dir() {
  local path="$1"
  if [ -d "$path" ] && [ -r "$path" ]; then
    pass "structure/$path directory readable"
  else
    fail "structure/$path missing or not readable"
  fi
}

check_readable_file() {
  local path="$1"
  if [ -f "$path" ] && [ -r "$path" ]; then
    pass "structure/$path file readable"
  else
    fail "structure/$path missing or not readable"
  fi
}

echo "== doctor: command preconditions =="
for cmd in bash make grep find cp mkdir rm; do
  check_command "$cmd"
done

echo ""
echo "== doctor: centralized structure =="
check_readable_file "$MANIFEST"
check_readable_dir "src"
check_readable_dir "src/templates"

echo ""
echo "== doctor: manifest targets and source routes =="
if [ -f "$MANIFEST" ] && [ -r "$MANIFEST" ]; then
  entries=0
  while IFS='|' read -r target kind source dist_path install_path; do
    [ -z "${target:-}" ] && continue
    [[ "$target" = \#* ]] && continue

    entries=$((entries + 1))
    prefix="manifest/$target"

    if [ -z "${kind:-}" ] || [ -z "${source:-}" ] || [ -z "${dist_path:-}" ] || [ -z "${install_path:-}" ]; then
      fail "$prefix has missing required fields"
      continue
    fi

    case "$kind" in
      dir)
        if [ -d "$source" ] && [ -r "$source" ]; then
          pass "$prefix source dir readable: $source"
        else
          fail "$prefix source dir missing/unreadable: $source"
        fi
        ;;
      file)
        if [ -f "$source" ] && [ -r "$source" ]; then
          pass "$prefix source file readable: $source"
        else
          fail "$prefix source file missing/unreadable: $source"
        fi
        ;;
      *)
        fail "$prefix invalid kind: $kind"
        ;;
    esac

    pass "$prefix dist_path present: $dist_path"
    pass "$prefix install_path present: $install_path"
  done < "$MANIFEST"

  if [ "$entries" -eq 0 ]; then
    fail "manifest has no target entries"
  fi
fi

echo ""
if [ "$FAILURES" -gt 0 ]; then
  echo "FAIL: doctor found $FAILURES critical issue(s)"
  exit 1
fi

echo "PASS: doctor checks completed"
