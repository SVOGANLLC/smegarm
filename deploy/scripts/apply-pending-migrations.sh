#!/usr/bin/env bash
# Apply SQL migrations not yet recorded in schema_migrations (VPS / self-hosted).
# Usage on server: cd /opt/smeg && ./deploy/scripts/apply-pending-migrations.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
DB_CONTAINER="${DB_CONTAINER:-smeg-db}"
DB_USER="${DB_USER:-postgres}"
DB_NAME="${DB_NAME:-postgres}"

for f in "$ROOT"/supabase/migrations/*.sql; do
  base="$(basename "$f")"
  echo "Applying $base ..."
  docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 < "$f"
done
echo "Done."
