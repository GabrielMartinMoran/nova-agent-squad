#!/usr/bin/env bash
set -euo pipefail

TARGET="${1:-all}"
MANIFEST="config/platforms.manifest"

if [ ! -f "$MANIFEST" ]; then
  echo "ERROR: missing $MANIFEST" >&2
  exit 1
fi

build_entry() {
  local target="$1" kind="$2" source="$3" dist_path="$4"
  local out="dist/${dist_path}"

  rm -rf "dist/platforms/${target}"

  case "$kind" in
    dir)
      mkdir -p "$(dirname "$out")"
      cp -R "$source" "$out"
      ;;
    file)
      mkdir -p "$(dirname "$out")"
      cp "$source" "$out"
      ;;
    *)
      echo "ERROR: unsupported kind '$kind' for target '$target'" >&2
      exit 1
      ;;
  esac

  echo "Built target: $target -> $out"
}

found=0
while IFS='|' read -r target kind source dist_path install_path; do
  [ -z "$target" ] && continue
  [[ "$target" = \#* ]] && continue

  if [ "$TARGET" = "all" ] || [ "$TARGET" = "$target" ]; then
    found=1
    build_entry "$target" "$kind" "$source" "$dist_path"
  fi
done < "$MANIFEST"

if [ "$found" -eq 0 ]; then
  echo "ERROR: unknown TARGET '$TARGET'" >&2
  exit 1
fi
