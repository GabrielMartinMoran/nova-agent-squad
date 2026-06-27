#!/usr/bin/env bash
set -euo pipefail

TARGET="${1:-all}"
MANIFEST="config/platforms.manifest"

if [ ! -f "$MANIFEST" ]; then
  echo "ERROR: missing $MANIFEST" >&2
  exit 1
fi

inject_caveman_rules() {
  local template="src/references/nas_caveman.md.tmpl"
  local staging_dir="$1"
  if [ ! -f "$template" ]; then echo "WARNING: caveman template not found" >&2; return 0; fi
  local tmp_header tmp_shared tmp_agent
  tmp_header=$(mktemp); tmp_shared=$(mktemp); tmp_agent=$(mktemp)
  sed -n '1,/<!-- BEGIN SHARED -->/p' "$template" | sed '$d' > "$tmp_header"
  sed -n '/<!-- BEGIN SHARED -->/,/<!-- END SHARED -->/p' "$template" | sed '1d;$d' > "$tmp_shared"
  cat "$tmp_header" "$tmp_shared" > "$tmp_agent"; echo "" >> "$tmp_agent"
  sed -n '/<!-- BEGIN AGENT:developer -->/,/<!-- END AGENT:developer -->/p' "$template" | sed '1d;$d' >> "$tmp_agent"
  sed -i -e "/<!-- INJECT:caveman_developer -->/r $tmp_agent" -e "/<!-- INJECT:caveman_developer -->/d" "${staging_dir}/nas_developer.md"
  echo "  Injected caveman_developer"
  cat "$tmp_header" "$tmp_shared" > "$tmp_agent"; echo "" >> "$tmp_agent"
  sed -n '/<!-- BEGIN AGENT:qa -->/,/<!-- END AGENT:qa -->/p' "$template" | sed '1d;$d' >> "$tmp_agent"
  sed -i -e "/<!-- INJECT:caveman_qa -->/r $tmp_agent" -e "/<!-- INJECT:caveman_qa -->/d" "${staging_dir}/nas_qa.md"
  echo "  Injected caveman_qa"
  rm -f "$tmp_header" "$tmp_shared" "$tmp_agent"
}

build_entry() {
  local target="$1" kind="$2" source="$3" dist_path="$4"
  local out="dist/${dist_path}"

  case "$kind" in
    dir)
      mkdir -p "$(dirname "$out")"
      if [ "$source" = "src/agents" ] && [ -f "src/references/nas_caveman.md.tmpl" ]; then
        local staging_dir
        staging_dir=$(mktemp -d)
        cp "$source"/* "$staging_dir/"
        inject_caveman_rules "$staging_dir"
        mkdir -p "$out"
        cp "$staging_dir"/* "$out/"
        rm -rf "$staging_dir"
      else
        cp -R "$source" "$out"
      fi
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
cleaned_targets=""
while IFS='|' read -r target kind source dist_path install_path; do
  [ -z "$target" ] && continue
  [[ "$target" = \#* ]] && continue

  if [ "$TARGET" = "all" ] || [ "$TARGET" = "$target" ]; then
    found=1
    if [[ " $cleaned_targets " != *" $target "* ]]; then
      rm -rf "dist/platforms/${target}"
      cleaned_targets="$cleaned_targets $target"
    fi
    build_entry "$target" "$kind" "$source" "$dist_path"
  fi
done < "$MANIFEST"

if [ "$found" -eq 0 ]; then
  echo "ERROR: unknown TARGET '$TARGET'" >&2
  exit 1
fi
