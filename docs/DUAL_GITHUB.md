# Два репозитория GitHub — параллельная работа

Как вести разработку, когда есть **ваш** GitHub и **отдельный репозиторий заказчика**.

**См. также:** [CLIENT_INFRA.md](./CLIENT_INFRA.md) — Reg.ru, DNS, VPS, Railway, автодеплой.

---

## Репозитории (зафиксировано)

| Remote | URL |
|--------|-----|
| `origin` | `https://github.com/edmanukyan1994/smeg-armenia-boutique.git` |
| `client` | `https://github.com/SVOGANLLC/smegarm.git` |

Пока меняется DNS — **сайт для пользователей остаётся на сервере Reg.ru**. VPS и Railway — параллельно.

```
┌─────────────────┐     push      ┌──────────────────┐
│  Ваш GitHub     │ ────────────► │  VPS smeg.am     │  (prod, Supabase на VPS)
│  (origin)       │               └──────────────────┘
└────────┬────────┘
         │ push (mirror / cherry-pick)
         ▼
┌─────────────────┐     deploy    ┌──────────────────┐
│  GitHub заказчика│ ────────────► │  Railway         │  (staging / preview)
│  (client)       │               │  + их Supabase   │
└─────────────────┘               └──────────────────┘
```

**Один источник правды по коду** — выберите основной репозиторий (обычно ваш). Второй — зеркало или fork с регулярным merge.

---

## Настройка двух remote

В локальном клоне:

```bash
# Уже есть origin → ваш репозиторий
git remote -v

# Добавить репозиторий заказчика
git remote add client git@github.com:ORGANIZATION/smegarm.git

# Проверка
git remote -v
```

### Пуш в оба репозитория

После коммита:

```bash
git push origin main
git push client main
```

Или одной командой (после `git config`):

```bash
git push origin main && git push client main
```

### Разные ветки

| Ветка | Назначение |
|-------|------------|
| `main` | Продакшен (VPS smeg.am) |
| `staging` | Railway / тест заказчика |
| `feature/*` | Задачи, потом merge в main |

Заказчику можно пушить только `staging`, а в `main` — после проверки.

---

## Синхронизация без хаоса

1. **Не править код одновременно в двух репо вручную** — один пишет, второй получает через `git push` / `git pull`.
2. **Миграции БД** (`supabase/migrations/`) — применять на **каждом** окружении отдельно (VPS и Railway/Supabase заказчика).
3. **Секреты** — разные `.env` на VPS и Railway; не коммитить в git.
4. Раз в неделю (или перед релизом): `git fetch client` и сравнить, нет ли уникальных коммитов у заказчика.

Если заказчик что-то менял у себя:

```bash
git fetch client
git log origin/main..client/main   # их коммиты
git cherry-pick <hash>             # или merge client/main
```

---

## GitHub Actions (опционально)

Зеркалирование при каждом push в ваш `main`:

```yaml
# .github/workflows/mirror.yml — пример, настроить под токен заказчика
on:
  push:
    branches: [main]
jobs:
  mirror:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: |
          git push https://x-access-token:${{ secrets.CLIENT_GITHUB_TOKEN }}@github.com/ORG/REPO.git HEAD:main
```

Токен заказчика создаётся в их GitHub → Settings → Developer settings → PAT (repo scope).

---

## Что не дублируется автоматически

| Что | VPS prod | Railway / клиент |
|-----|----------|------------------|
| Код | git pull / deploy | auto-deploy из их GitHub |
| Postgres данные | smeg-db на VPS | отдельный проект Supabase |
| Загруженные фото | bucket на VPS | отдельный bucket |
| Заказы, товары | своя БД | своя БД |

Для теста с **реальными** данными нужен экспорт/импорт (скрипты в `deploy/scripts/`).

---

## Доступ заказчика к GitHub

1. Создать организацию или repo под их аккаунтом.
2. Добавить вас collaborator (write) и их менеджера (read или write).
3. Не хранить пароли в чате — использовать SSH-ключи или PAT с ограниченным сроком.

---

## Чеклист перед передачей репо заказчику

- [ ] Убрать из истории секреты (если случайно коммитили)
- [ ] Передать `.env.example`, не `.env`
- [ ] Документировать: `docs/PLATFORM.md`, `docs/RAILWAY.md`, `DEPLOY.md`
- [ ] Отдельный Supabase-проект для их staging
- [ ] Договориться: кто мержит в `main` prod
