#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
MIGRATIONS="$ROOT/supabase/migrations"

# Skip duplicate email infra migrations (keep latest only).
SKIP=(
  "20260610083548_email_infra.sql"
  "20260610083601_email_infra.sql"
)

should_skip() {
  local f="$1"
  for s in "${SKIP[@]}"; do
    [[ "$f" == "$s" ]] && return 0
  done
  return 1
}

echo "Applying migrations to local Postgres (container smeg-db)..."
for f in $(ls "$MIGRATIONS"/*.sql | sort); do
  base=$(basename "$f")
  if should_skip "$base"; then
    echo "  SKIP $base (duplicate)"
    continue
  fi
  echo "  -> $base"
  docker exec -i smeg-db psql -U postgres -d postgres -v ON_ERROR_STOP=1 < "$f"
done

echo "Done."
