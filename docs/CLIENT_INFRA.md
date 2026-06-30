# Инфраструктура заказчика (зафиксировано)

Документ для команды: куда деплоить, какие репозитории, что пока на Reg.ru.

---

## Репозитории

| Remote | URL | Назначение |
|--------|-----|------------|
| `origin` | `https://github.com/edmanukyan1994/smeg-armenia-boutique.git` | Основная разработка |
| `client` | `https://github.com/SVOGANLLC/smegarm.git` | Репозиторий заказчика (пока пустой) |

Добавить remote локально:

```bash
git remote add client https://github.com/SVOGANLLC/smegarm.git
```

Автозеркало при push в `main`: GitHub Action `.github/workflows/sync-client-repo.yml`  
(нужен секрет `CLIENT_GITHUB_TOKEN` в репозитории origin).

Ручной push в оба:

```bash
./deploy/scripts/push-all-remotes.sh
```

---

## Серверы и DNS (переходный период)

| Окружение | Где сейчас | Примечание |
|-----------|------------|------------|
| **Продакшен smeg.am** | VPS `89.108.66.148` (`/opt/smeg`) | Docker + self-hosted Supabase |
| **Пока меняется DNS** | Сайт продолжает работать на **сервере Reg.ru** заказчика | Не ломать до переключения A-записей |
| **Staging заказчика** | Railway (планируется) | Отдельный Supabase Cloud, см. `docs/RAILWAY.md` |

Пока DNS не указывает на новый VPS — **боевой трафик остаётся на Reg.ru**.  
После переключения DNS — основной prod на VPS (или на инфраструктуре заказчика по договорённости).

---

## Что деплоить куда

### VPS prod (`89.108.66.148`)

```bash
ssh user@89.108.66.148
cd /opt/smeg
git pull origin main
# применить новые миграции — deploy/scripts/apply-pending-migrations.sh
docker compose build --no-cache web
docker compose up -d
```

### Reg.ru (пока основной для пользователей)

Тот же код, что и на VPS, деплоится **отдельно** на их хостинг Reg.ru до смены DNS.  
Процедура зависит от панели Reg.ru (Docker/Node) — синхронизировать артефакт с `main`.

### Railway (клиент)

- Repo: [SVOGANLLC/smegarm](https://github.com/SVOGANLLC/smegarm.git)
- Auto-deploy из `main` после настройки Railway + переменных окружения
- БД: **Supabase Cloud** (отдельный проект, не VPS Postgres)

---

## Миграции БД

Каждое окружение — **своя** база. Файлы в `supabase/migrations/`.

Обязательные для сохранения коллекций (2026-07):

- `20260703120000_admin_writes_collections_wkf01.sql` — `can_manage_catalog`
- `20260705120000_collections_staff_write.sql`
- `20260706120000_collections_rls_fix.sql`

На VPS:

```bash
./deploy/scripts/apply-pending-migrations.sh
```

---

## Секреты (не в git)

- VPS: `/opt/smeg/.env`, `deploy/supabase/.env`
- Railway: Variables в панели Railway
- GitHub client mirror: `CLIENT_GITHUB_TOKEN` (PAT заказчика с правом push в `SVOGANLLC/smegarm`)

---

## Чеклист «всё автоматизировано»

- [ ] `CLIENT_GITHUB_TOKEN` в GitHub Secrets origin-репо
- [ ] Push в `main` → Action заливает в `SVOGANLLC/smegarm`
- [ ] Railway подключён к `SVOGANLLC/smegarm`
- [ ] Supabase Cloud для Railway + миграции
- [ ] VPS prod обновлён после каждого релиза
- [ ] Reg.ru синхронизирован до переключения DNS
