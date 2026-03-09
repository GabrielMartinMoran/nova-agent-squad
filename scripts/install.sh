#!/usr/bin/env bash
set -euo pipefail

TARGET="${1:-opencode}"
DRY_RUN="${2:-0}"
DESTDIR="${3:-}"
MANIFEST="config/platforms.manifest"

run_copy() {
  local src="$1" dest="$2"
  if [ "$DRY_RUN" = "1" ]; then
    echo "DRY-RUN: copy '$src' -> '$dest'"
    return 0
  fi
  mkdir -p "$dest"
  if [ -d "$src" ]; then
    cp -R "$src"/* "$dest"/
  else
    cp "$src" "$dest"/
  fi
}

resolve_dest() {
  local install_path="$1"
  if [ -n "$DESTDIR" ]; then
    echo "${DESTDIR%/}/$install_path"
  else
    echo "$HOME/$install_path"
  fi
}

matched=0
while IFS='|' read -r target kind source dist_path install_path; do
  [ -z "$target" ] && continue
  [[ "$target" = \#* ]] && continue

  if [ "$target" = "$TARGET" ]; then
    matched=1
    artifact="dist/${dist_path}"
    if [ ! -e "$artifact" ]; then
      echo "ERROR: missing built artifact '$artifact'. Run make build TARGET=$TARGET" >&2
      exit 1
    fi
    destination="$(resolve_dest "$install_path")"
    run_copy "$artifact" "$destination"
    echo "Installed target: $target -> $destination"
  fi
done < "$MANIFEST"

if [ "$matched" -eq 0 ]; then
  echo "ERROR: unknown TARGET '$TARGET'" >&2
  exit 1
fi
