#!/usr/bin/env bash
# Finish specs_hy translations on VPS. Needs GEMINI_API_KEY in /opt/smeg/.env
set -euo pipefail
cd /opt/smeg
set -a
source .env
set +a
export SUPABASE_URL="${SUPABASE_URL:-http://smeg-api:8000}"
export TRANSLATE_CACHE_PATH="/opt/smeg/deploy/scripts/.translate-cache.json"
mkdir -p deploy/scripts
docker cp deploy/scripts/complete-specs-translations.mjs smeg-armenia:/tmp/complete-specs.mjs
docker exec \
  -e SUPABASE_URL=http://smeg-api:8000 \
  -e SUPABASE_SERVICE_ROLE_KEY \
  -e GEMINI_API_KEY \
  -e TRANSLATE_CACHE_PATH=/tmp/.translate-cache.json \
  smeg-armenia node /tmp/complete-specs.mjs
# Persist cache on host
docker cp smeg-armenia:/tmp/.translate-cache.json "$TRANSLATE_CACHE_PATH" 2>/dev/null || true
