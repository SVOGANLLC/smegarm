#!/usr/bin/env bash
# Finish missing description_hy / specs_hy. Needs GEMINI_API_KEY in /opt/smeg/.env
set -euo pipefail
cd /opt/smeg
set -a
source .env
set +a
export SUPABASE_URL="${SUPABASE_URL:-http://smeg-api:8000}"
export TRANSLATE_CACHE_PATH="/opt/smeg/deploy/scripts/.translate-cache.json"
SCRIPT="complete-translations.mjs"
[[ -f deploy/scripts/.translate-cache.json ]] && \
  docker cp "$TRANSLATE_CACHE_PATH" smeg-armenia:/tmp/.translate-cache.json 2>/dev/null || true
docker cp "deploy/scripts/$SCRIPT" smeg-armenia:/tmp/complete-translations.mjs
docker exec \
  -e SUPABASE_URL=http://smeg-api:8000 \
  -e SUPABASE_SERVICE_ROLE_KEY \
  -e GEMINI_API_KEY \
  -e TRANSLATE_CACHE_PATH=/tmp/.translate-cache.json \
  smeg-armenia node /tmp/complete-translations.mjs "$@"
docker cp smeg-armenia:/tmp/.translate-cache.json "$TRANSLATE_CACHE_PATH" 2>/dev/null || true
