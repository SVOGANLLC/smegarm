#!/usr/bin/env bash
# Сборка архива smeg-armenia-site.zip для передачи заказчику.
# Запускать из корня репозитория: bash deploy/scripts/build-handover-archive.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
STAGE="$ROOT/_handover_build/smeg-armenia"
ZIP="$ROOT/smeg-armenia-site.zip"
VPS="root@89.108.66.148"
PASS="${HANDOVER_SSH_PASS:-evHUCuCJoy53t0HQ}"

rm -rf "$ROOT/_handover_build"
mkdir -p "$STAGE/app" "$STAGE/database" "$STAGE/credentials"

echo "==> Copy project files..."
rsync -a \
  --exclude '.git' \
  --exclude 'node_modules' \
  --exclude 'dist' \
  --exclude 'dist-ssr' \
  --exclude '.output' \
  --exclude '.nitro' \
  --exclude '.tanstack' \
  --exclude '_handover_build' \
  --exclude 'smeg-armenia-site.zip' \
  --exclude '.DS_Store' \
  "$ROOT/" "$STAGE/app/"

echo "==> Fetch .env from VPS..."
/tmp/sshpass-cmd.exp "$PASS" "scp -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null root@89.108.66.148:/opt/smeg/.env $STAGE/credentials/app.env" >/dev/null 2>&1
/tmp/sshpass-cmd.exp "$PASS" "scp -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null root@89.108.66.148:/opt/smeg/deploy/supabase/.env $STAGE/credentials/supabase.env" >/dev/null 2>&1
test -s "$STAGE/credentials/app.env" && test -s "$STAGE/credentials/supabase.env" || { echo "ERROR: failed to fetch .env files" >&2; exit 1; }

echo "==> Database dump from VPS..."
/tmp/sshpass-cmd.exp "$PASS" "ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null root@89.108.66.148 \"docker exec smeg-db pg_dump -U postgres -d postgres --no-owner --no-acl -n public -n auth -n storage\"" > "$STAGE/database/dump.sql" 2>/dev/null

DUMP_SIZE=$(wc -c < "$STAGE/database/dump.sql" | tr -d ' ')
if [ "$DUMP_SIZE" -lt 10000 ]; then
  echo "ERROR: database dump too small ($DUMP_SIZE bytes)" >&2
  exit 1
fi
echo "    dump size: $DUMP_SIZE bytes"

echo "==> Write docs..."
cp "$ROOT/DEPLOY.md" "$ROOT/DNS-INSTRUCTIONS.md" "$ROOT/SERVER-ACCESS.md" "$STAGE/"

cat > "$STAGE/database/RESTORE.md" <<'MD'
# Восстановление базы данных

Файл `dump.sql` — полный дамп схем и данных (`public`, `auth`, `storage`)
на момент сборки архива.

## На уже работающем Supabase (контейнер smeg-db)

```bash
# Остановить API, чтобы не было записей во время импорта
cd /opt/smeg/deploy/supabase && docker compose stop rest auth storage

# Импорт (займёт 1–3 мин)
docker exec -i smeg-db psql -U postgres -d postgres < /path/to/dump.sql

# Запустить обратно
docker compose start rest auth storage
```

## С нуля

См. `DEPLOY.md` — сначала поднять Supabase, затем импортировать `dump.sql`.

## После импорта

Проверьте, что `JWT_SECRET`, `ANON_KEY` и `SERVICE_ROLE_KEY` в
`deploy/supabase/.env` и `/opt/smeg/.env` **совпадают** с теми, что были при дампе.
Иначе авторизация и API вернут ошибки подписи JWT.
MD

cat > "$STAGE/CREDENTIALS.md" <<'MD'
# Доступы и секреты

> Храните этот файл и папку `credentials/` в безопасном месте. Не публикуйте в открытом доступе.

## Сервер (VPS Reg.ru)

| Параметр | Значение |
|---|---|
| IP | `89.108.66.148` |
| SSH | `ssh root@89.108.66.148` |
| Папка проекта | `/opt/smeg` |
| Логин / пароль | из панели Reg.ru (владелец VPS) |

## Сайт

| URL | Назначение |
|---|---|
| https://smeg.previewsite.cc | Текущий рабочий адрес |
| https://smeg.previewsite.cc/admin | Админка |
| http://89.108.66.148 | Доступ по IP (HTTP) |
| smeg.am | Основной домен — переключить DNS на `89.108.66.148` (см. DNS-INSTRUCTIONS.md) |

## DNS (Reg.ru / Cloudflare)

Панель DNS для `smeg.am` — у итальянских партнёров (Cloudflare: `shubhi.ns.cloudflare.com`).

## GitHub

| Параметр | Значение |
|---|---|
| Репозиторий | https://github.com/edmanukyan1994/smeg-armenia-boutique |
| Ветка | `main` |
| Deploy key на VPS | read-only, имя `smeg-vps (read-only)` |

## Файлы с секретами в этом архиве

| Файл | Содержимое |
|---|---|
| `credentials/app.env` | Ключи приложения, ConverseBank, Telegram, Supabase (клиент) |
| `credentials/supabase.env` | Postgres, JWT, ANON_KEY, SERVICE_ROLE_KEY |

Скопируйте на сервер:

```bash
cp credentials/app.env /opt/smeg/.env
cp credentials/supabase.env /opt/smeg/deploy/supabase/.env
```

## Тестовый админ

Создан на сервере: `edmanukyanofficial@gmail.com` (роль admin).
Пароль — у администратора проекта.

## ConverseBank / Telegram

Значения `CONVERSE_*` и `TELEGRAM_BOT_TOKEN` — в `credentials/app.env`.
MD

cat > "$STAGE/HANDOVER.md" <<'MD'
# Smeg Armenia Boutique — передача проекта

Архив собран: DATE_PLACEHOLDER

## Состав архива

```
smeg-armenia/
├── app/                    # Исходный код (копия репозитория)
├── database/
│   ├── dump.sql            # Дамп PostgreSQL
│   └── RESTORE.md          # Как восстановить
├── credentials/
│   ├── app.env             # Секреты приложения
│   └── supabase.env        # Секреты Supabase
├── HANDOVER.md             # Этот файл
├── CREDENTIALS.md          # Доступы (сводка)
├── DEPLOY.md               # Развёртывание с нуля
├── SERVER-ACCESS.md          # Где файлы на сервере, SSH/SFTP
└── DNS-INSTRUCTIONS.md     # DNS для smeg.am (EN/IT)
```

## Что уже работает на сервере

- Сайт: https://smeg.previewsite.cc (HTTPS)
- Код в `/opt/smeg`, обновление: `git pull` + `docker compose build web`
- Self-hosted Supabase (PostgreSQL, Auth, REST, Storage)
- Онлайн-оплата ConverseBank, Telegram-уведомления
- Админка `/admin`

## Архитектура

```
Браузер → nginx (443/80) → Docker smeg-armenia (Node SSR, :3000)
                         → Docker smeg-api (:8000) → PostgreSQL (smeg-db)
```

## Для программистов заказчика

1. Прочитать **SERVER-ACCESS.md** — как найти файлы на VPS.
2. Получить доступ к **GitHub** (collaborator) для правок кода.
3. Не редактировать только на сервере без git — изменения потеряются при `git pull`.
4. После правок кода: `docker compose build web && docker compose up -d web`.

## Переключение smeg.am на прод

1. DNS: A-записи `@` и `www` → `89.108.66.148` (DNS-INSTRUCTIONS.md).
2. SSL: `bash /usr/local/bin/enable-https.sh smeg.am www.smeg.am`
3. В `.env`: `PUBLIC_BASE_URL=https://smeg.am`, `VITE_SUPABASE_URL=https://smeg.am`
4. Пересобрать: `docker compose build web && docker compose up -d web`
5. Telegram webhook: `node deploy/scripts/setup-telegram-webhook.mjs`

## Важно

- Зависимостей от Lovable **нет** — полный self-host.
- База на **этом же VPS**, не в облаке Lovable.
- Резервные копии таблиц до нормализации: `products_bak_20260616`, `color_swatches_bak_20260616`.
MD

# Substitute date in HANDOVER.md
BUILD_DATE=$(date '+%Y-%m-%d %H:%M')
sed "s/DATE_PLACEHOLDER/$BUILD_DATE/" "$STAGE/HANDOVER.md" > "$STAGE/HANDOVER.md.tmp" && mv "$STAGE/HANDOVER.md.tmp" "$STAGE/HANDOVER.md"

echo "==> Create zip..."
rm -f "$ZIP"
(cd "$ROOT/_handover_build" && zip -rq "$ZIP" smeg-armenia)

ZIP_SIZE=$(ls -lh "$ZIP" | awk '{print $5}')
echo "Done: $ZIP ($ZIP_SIZE)"
echo "Staging kept at: $ROOT/_handover_build/smeg-armenia"
