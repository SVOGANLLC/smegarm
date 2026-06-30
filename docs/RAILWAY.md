# Деплой на Railway (окружение заказчика)

Railway подходит для **отдельного** окружения (staging / preview). Продакшен smeg.am остаётся на VPS с self-hosted Supabase (`DEPLOY.md`).

> **Важно:** полный стек Supabase (Auth, Storage, RLS, Realtime) на Railway в один контейнер не ставится как на VPS. Для Railway нужен **Supabase Cloud** (рекомендуется) или отдельный managed Postgres + доработка (не рекомендуется).

---

## Архитектура для заказчика

```
GitHub (заказчик) → Railway Service (Node SSR) → Supabase Cloud (Postgres + Auth + Storage)
```

Приложение — тот же Dockerfile / TanStack Start, что и на VPS.

---

## 1. Supabase Cloud (проект заказчика)

1. [supabase.com](https://supabase.com) → New project (регион ближе к Армении: eu-central-1).
2. SQL Editor → выполнить все файлы из `supabase/migrations/` **по порядку** (или `supabase db push` CLI).
3. Storage → создать bucket `product-media` (public).
4. Settings → API: скопировать `Project URL` и `anon` / `service_role` keys.
5. Authentication → URL Configuration: Site URL = `https://<railway-domain>.up.railway.app`, redirect URLs для `/auth`.

---

## 2. Репозиторий на GitHub заказчика

```bash
git remote add client git@github.com:CLIENT/smegarm.git
git push client main
```

В их репо Railway подключит auto-deploy.

---

## 3. Сервис на Railway

1. [railway.app](https://railway.app) → New Project → Deploy from GitHub repo (аккаунт заказчика).
2. **Builder:** Dockerfile (в корне репозитория уже есть `Dockerfile`).
3. **Variables** (Settings → Variables):

| Переменная | Значение |
|------------|----------|
| `VITE_SUPABASE_URL` | `https://xxxx.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | anon key |
| `VITE_SUPABASE_PROJECT_ID` | ref из Supabase |
| `SUPABASE_URL` | тот же URL API |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role (секрет) |
| `PUBLIC_BASE_URL` | `https://<ваш-railway-домен>` |
| `PORT` | `3000` (Railway часто подставляет сам) |
| `CONVERSE_MERCHANT_ID` | тестовый или пусто |
| `CONVERSE_TOKEN` | тестовый или пусто |
| `TELEGRAM_BOT_TOKEN` | опционально |

`VITE_*` нужны **на этапе build** — в Railway включите их до первого deploy или используйте Railway Dockerfile build args (см. ниже).

4. **Networking** → Generate domain → прописать в Supabase Auth URLs.

5. **Deploy** — Railway соберёт образ и запустит `node .output/server/index.mjs`.

### Build args на Railway

В `railway.toml` или UI → Docker build arguments:

```
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
VITE_SUPABASE_PROJECT_ID
```

Без них клиентский bundle не увидит Supabase.

---

## 4. Файл `railway.toml` (опционально)

Можно добавить в корень репозитория:

```toml
[build]
builder = "DOCKERFILE"
dockerfilePath = "Dockerfile"

[deploy]
healthcheckPath = "/"
restartPolicyType = "ON_FAILURE"
```

---

## 5. Миграции при обновлении

При каждом релизе с новыми SQL-файлами:

- **VPS:** `docker exec smeg-db psql ... -f migration.sql` или ваш скрипт.
- **Supabase Cloud:** SQL Editor или `supabase link` + `supabase db push`.

Код и схема БД должны быть синхронны.

---

## 6. Параллельная работа: VPS + Railway

| | VPS (prod) | Railway (client) |
|--|------------|------------------|
| Домен | smeg.am | *.up.railway.app |
| БД | Postgres на VPS | Supabase Cloud |
| Деплой | `git pull` + `docker compose` | push в GitHub → auto |
| Данные | боевые | тестовые / копия |

Разработка:

1. Коммит → push в **origin** (ваш GitHub).
2. Push в **client** (GitHub заказчика) → Railway пересобирается.
3. Prod на VPS обновляете отдельно, когда готово (`DEPLOY.md`).

---

## 7. Ограничения Railway

- Нет self-hosted Supabase compose из `deploy/supabase/` — только облачный Supabase или свой Postgres без готового Auth.
- Cron (`/api/public/translate/tick`, email queue) — на Railway настроить **Cron Job** service или внешний cron (cron-job.org) с URL + секретом.
- Файлы storage — только Supabase Storage, не локальный диск контейнера.

---

## 8. Проверка после деплоя

- [ ] Главная открывается, каталог грузится
- [ ] Вход `/auth` → `/admini`
- [ ] Сохранение товара / коллекции в админке
- [ ] Загрузка фото в `product-media`
- [ ] Checkout (тестовый заказ)

---

## 9. Стоимость (ориентир)

- Railway: Hobby ~$5/мес + usage
- Supabase Cloud: Free tier для staging, Pro при росте

Для продакшена smeg.am оставляйте VPS — он уже настроен под полный стек.
