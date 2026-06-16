#!/usr/bin/env bash
set -euo pipefail
# Создаёт админа на VPS через Supabase Auth admin API + роль admin.
# Использование: bash create-test-admin.sh <email> <password>
EMAIL="${1:?Укажи email первым аргументом}"
PASSWORD="${2:?Укажи пароль вторым аргументом}"

SR="$(grep '^SUPABASE_SERVICE_ROLE_KEY=' /opt/smeg/.env | cut -d= -f2-)"
API="http://127.0.0.1:8000"

cat > /tmp/admin_body.json <<JSON
{"email":"${EMAIL}","password":"${PASSWORD}","email_confirm":true}
JSON

echo "=== create user ==="
RESP="$(curl -s -X POST "${API}/auth/v1/admin/users" \
  -H "apikey: ${SR}" \
  -H "Authorization: Bearer ${SR}" \
  -H "Content-Type: application/json" \
  -d @/tmp/admin_body.json)"
echo "$RESP" | head -c 400
echo

# Достаём id пользователя (через psql, чтобы не парсить JSON)
UID_VAL="$(docker exec smeg-db psql -U postgres -d postgres -t -A -c \
  "select id from auth.users where email='${EMAIL}' limit 1;")"
echo "user_id=${UID_VAL}"

if [ -z "${UID_VAL}" ]; then
  echo "ERROR: пользователь не создан"; exit 1
fi

echo "=== assign admin role ==="
docker exec smeg-db psql -U postgres -d postgres -c \
  "insert into public.user_roles (user_id, role) values ('${UID_VAL}','admin') on conflict do nothing;"

echo "=== verify ==="
docker exec smeg-db psql -U postgres -d postgres -t -A -F'|' -c \
  "select u.email, r.role, (u.email_confirmed_at is not null) as confirmed from auth.users u join user_roles r on r.user_id=u.id where u.email='${EMAIL}';"

rm -f /tmp/admin_body.json
