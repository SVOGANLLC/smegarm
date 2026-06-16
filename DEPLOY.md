# Развёртывание smeg.am на VPS

Сайт — SSR-приложение (TanStack Start / Node.js) в Docker. Перед ним nginx
(reverse proxy + SSL). База данных, авторизация и API — **самохостинговый Supabase**
на том же сервере (`deploy/supabase/`). Зависимостей от Lovable нет.

Текущий боевой сервер: `89.108.66.148`, код в `/opt/smeg`.

---

## 0. Что понадобится

Два файла с секретами (см. `.env.example` и `deploy/supabase/.env.example`):

**`/opt/smeg/.env`** (приложение):

| Переменная | Назначение |
|---|---|
| `VITE_SUPABASE_URL` | Публичный адрес API (после DNS: `https://smeg.am`) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Публичный ключ (ANON_KEY) |
| `SUPABASE_URL` | Внутренний адрес API: `http://smeg-api:8000` |
| `SUPABASE_SERVICE_ROLE_KEY` | Серверный ключ (полный доступ к БД) |
| `PUBLIC_BASE_URL` | Адрес возврата после оплаты ConverseBank |
| `CONVERSE_MERCHANT_ID`, `CONVERSE_TOKEN` | Онлайн-оплата |
| `TELEGRAM_BOT_TOKEN` | Бот `@smegarmbot` — уведомления о заказах |

**`/opt/smeg/deploy/supabase/.env`** (база):

| Переменная | Назначение |
|---|---|
| `POSTGRES_PASSWORD` | Пароль Postgres |
| `JWT_SECRET` | Секрет для подписи JWT |
| `ANON_KEY`, `SERVICE_ROLE_KEY` | Ключи API (генерируются из JWT_SECRET) |
| `SITE_URL`, `API_EXTERNAL_URL` | Внешние адреса для Auth-редиректов |

Сгенерировать ключи: `node deploy/scripts/generate-keys.mjs`

---

## 1. DNS

Партнёрам, управляющим зоной `smeg.am`, нужно указать A-записи на IP VPS:

```
Тип   Имя    Значение         TTL
A     @      89.108.66.148    3600
A     www    89.108.66.148    3600
```

Подробная инструкция (EN/IT) — `DNS-INSTRUCTIONS.md`.
Проверка: `dig smeg.am +short` должен вернуть IP VPS.

---

## 2. Подготовка сервера (Ubuntu 22.04/24.04)

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER   # перелогиньтесь

sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx git
```

Рекомендуется swap 2 ГБ (на малых VPS):
```bash
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

---

## 3. Код и переменные окружения

```bash
sudo mkdir -p /opt/smeg && sudo chown $USER /opt/smeg
cd /opt/smeg
git clone https://github.com/edmanukyan1994/smeg-armenia-boutique.git .

cp .env.example .env
cp deploy/supabase/.env.example deploy/supabase/.env
# вписать секреты в оба файла
```

Восстановить базу из дампа (если есть):
```bash
cd deploy/supabase && docker compose --env-file .env up -d
gunzip -c database-full.sql.gz > restore.sql
docker cp restore.sql smeg-db:/tmp/restore.sql
docker exec smeg-db psql -U postgres -d postgres -f /tmp/restore.sql
```

Или применить миграции и импортировать данные:
```bash
bash deploy/scripts/apply-migrations.sh
node deploy/scripts/import-data.mjs
```

---

## 4. Запуск Supabase + сайта

```bash
# Supabase (Postgres, Auth, REST, Storage)
cd /opt/smeg/deploy/supabase
docker compose --env-file .env up -d

# Сайт (SSR)
cd /opt/smeg
docker compose up -d --build
docker compose logs -f    # ожидаем: Listening on http://localhost:3000
```

Проверка:
```bash
curl -I http://127.0.0.1:3000          # HTTP 200
docker ps --format "{{.Names}} {{.Status}}"
```

---

## 5. nginx + SSL

```bash
sudo cp deploy/nginx/smeg.am.conf /etc/nginx/sites-available/smeg.am.conf
sudo ln -s /etc/nginx/sites-available/smeg.am.conf /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

После того как DNS указывает на VPS:
```bash
sudo certbot --nginx -d smeg.am -d www.smeg.am
```

---

## 6. После привязки домена

Обновить URL в `.env` и пересобрать:

**`/opt/smeg/.env`:**
```
PUBLIC_BASE_URL=https://smeg.am
VITE_SUPABASE_URL=https://smeg.am
```

**`/opt/smeg/deploy/supabase/.env`:**
```
SITE_URL=https://smeg.am
API_EXTERNAL_URL=https://smeg.am/auth/v1
ADDITIONAL_REDIRECT_URLS=https://smeg.am/**,https://www.smeg.am/**
```

```bash
cd /opt/smeg && docker compose up -d --build
```

Telegram webhook (чтобы бот отвечал Chat ID):
```bash
node deploy/scripts/setup-telegram-webhook.mjs
```

---

## 7. Обновление сайта

```bash
cd /opt/smeg
git pull
docker compose up -d --build
docker image prune -f
```

---

## 8. Резервная копия базы

```bash
docker exec smeg-db sh -c \
  "pg_dump -U postgres -d postgres -n public --no-owner --no-privileges -f /tmp/backup.sql"
docker cp smeg-db:/tmp/backup.sql ./backup-$(date +%F).sql
```

---

## 9. Если что-то не так

| Симптом | Что проверить |
|---|---|
| 502 Bad Gateway | `docker compose logs -f` — контейнер упал или `.env` пустой |
| Ошибки Supabase | `docker ps` — все 5 контейнеров (`smeg-db`, `smeg-auth`, `smeg-rest`, `smeg-storage`, `smeg-api`) запущены |
| Пустая страница | `VITE_*` заданы при сборке (`docker compose build`) |
| Оплата не возвращает | `PUBLIC_BASE_URL` в `.env` |
| Telegram не шлёт | `TELEGRAM_BOT_TOKEN` в `.env`, chat_id сохранён в админке |
| Цвета в фильтрах серые | swatch-и в `color_swatches` привязаны к `colour_en` (англ.) |

Логи nginx: `sudo tail -f /var/log/nginx/error.log`
