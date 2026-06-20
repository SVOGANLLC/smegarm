# Доступ к файлам проекта на сервере

Инструкция для владельца VPS и программистов: где лежит код, как подключиться
и как безопасно вносить изменения.

**Сервер:** `89.108.66.148` (Reg.ru)  
**Папка проекта:** `/opt/smeg`  
**Сайт сейчас:** https://smeg.previewsite.cc (основной домен `smeg.am` — после переключения DNS)

---

## 1. Где что лежит

| Что | Путь на сервере |
|---|---|
| **Код сайта (весь проект)** | `/opt/smeg` |
| Исходники страниц и логики | `/opt/smeg/src/` |
| Картинки, иконки, favicon | `/opt/smeg/public/` |
| Docker и деплой | `/opt/smeg/docker-compose.yml` |
| Nginx, Supabase, скрипты | `/opt/smeg/deploy/` |
| Секреты (пароли, ключи API) | `/opt/smeg/.env` |
| Секреты базы Supabase | `/opt/smeg/deploy/supabase/.env` |
| Конфиг nginx (домены, SSL) | `/etc/nginx/sites-enabled/smeg.am.conf` |
| SSL-сертификаты Let's Encrypt | `/etc/letsencrypt/` |
| Данные PostgreSQL (не редактировать вручную) | Docker volume `supabase_db-data` |

Проект — **git-репозиторий**. Код синхронизируется с GitHub:
https://github.com/edmanukyan1994/smeg-armenia-boutique

---

## 2. Подключение по SSH (терминал)

Нужны **IP, логин и пароль** (или SSH-ключ) из панели Reg.ru.

### Windows

- Установить [PuTTY](https://www.putty.org/) или использовать терминал Windows 11+
- Хост: `89.108.66.148`, пользователь: `root` (или выданный логин)

### macOS / Linux

```bash
ssh root@89.108.66.148
```

После входа:

```bash
cd /opt/smeg
ls -la
```

Полезные команды:

```bash
# Текущая версия кода (коммит)
git log -1 --oneline

# Статус контейнеров
docker ps

# Логи сайта
docker logs smeg-armenia --tail 50

# Логи базы
docker logs smeg-db --tail 30
```

---

## 3. Подключение через файловый менеджер (SFTP)

Удобно, если нужен интерфейс «как проводник».

| Параметр | Значение |
|---|---|
| Протокол | **SFTP** |
| Хост | `89.108.66.148` |
| Порт | `22` |
| Логин / пароль | из панели Reg.ru |

Программы: [FileZilla](https://filezilla-project.org/), [WinSCP](https://winscp.net/) (Windows), встроенный SFTP в VS Code / Cursor.

После подключения откройте папку **`/opt/smeg`**.

---

## 4. Структура проекта (кратко)

```
/opt/smeg/
├── src/                    # Код приложения
│   ├── routes/             # Страницы (каталог, товар, админка…)
│   ├── components/         # UI-компоненты
│   ├── lib/                # Логика, i18n, товары, оплата
│   └── integrations/       # Supabase, OAuth
├── public/                 # Статика (логотипы, brand/, favicon)
├── deploy/
│   ├── nginx/              # Конфиг nginx
│   ├── supabase/           # Docker Compose для БД и API
│   └── scripts/            # Миграции, нормализация, SSL
├── docker-compose.yml      # Запуск сайта в Docker
├── .env                    # Секреты (НЕ в git)
└── DEPLOY.md               # Полная инструкция по развёртыванию
```

---

## 5. Как правильно менять код

### ⚠️ Не рекомендуется

Редактировать файлы **только на сервере** без git — при следующем `git pull`
изменения **пропадут**.

### ✅ Рекомендуется

1. Получить доступ к **GitHub** (collaborator в репозитории).
2. Клонировать репозиторий на свой компьютер:

   ```bash
   git clone https://github.com/edmanukyan1994/smeg-armenia-boutique.git
   ```

3. Внести правки локально → `git commit` → `git push`.
4. На сервере обновить и пересобрать:

   ```bash
   cd /opt/smeg
   git pull
   docker compose build web
   docker compose up -d web
   ```

### Если правили прямо на сервере

Обязательно закоммитьте и отправьте в GitHub, иначе правки потеряются:

```bash
cd /opt/smeg
git add .
git commit -m "Описание изменения"
git push origin main
```

---

## 6. После изменения кода — пересборка

Любое изменение в `src/`, `public/` или конфигах требует пересборки контейнера:

```bash
cd /opt/smeg
docker compose build web
docker compose up -d web
```

Проверка: открыть https://smeg.previewsite.cc и обновить страницу с очисткой кеша
(Ctrl+Shift+R / Cmd+Shift+R).

---

## 7. Секреты и база данных

| Файл | Содержимое |
|---|---|
| `/opt/smeg/.env` | Ключи Supabase, ConverseBank, Telegram, `PUBLIC_BASE_URL` |
| `/opt/smeg/deploy/supabase/.env` | Пароль Postgres, JWT, ANON_KEY, SERVICE_ROLE_KEY |

**Не публикуйте** эти файлы и не коммитьте в git.

Данные товаров, заказов, пользователей — в **PostgreSQL** (контейнер `smeg-db`).
Редактирование через админку сайта (`/admin`) или SQL, не через файлы.

---

## 8. Админка сайта

| URL | Назначение |
|---|---|
| https://smeg.previewsite.cc/admin | Управление товарами, заказами, контентом |
| https://smeg.previewsite.cc/auth | Вход |

Учётные записи создаются в базе; пароли — у администратора проекта.

---

## 9. Частые вопросы

**Где nginx?**  
`/etc/nginx/sites-enabled/smeg.am.conf` — после правок: `nginx -t && systemctl reload nginx`

**Где логи nginx?**  
`/var/log/nginx/access.log`, `/var/log/nginx/error.log`

**Как перезапустить только сайт?**  
`cd /opt/smeg && docker compose restart web`

**Как перезапустить всю базу?**  
`cd /opt/smeg/deploy/supabase && docker compose restart`  
(кратковременный простой API и админки)

**Как выпустить SSL для нового домена?**  
Когда DNS домена указывает на `89.108.66.148`:

```bash
bash /usr/local/bin/enable-https.sh smeg.am www.smeg.am
```

---

## 10. Контакты и документация

| Документ | Описание |
|---|---|
| `DEPLOY.md` | Полное развёртывание с нуля |
| `DNS-INSTRUCTIONS.md` | Настройка DNS для `smeg.am` |
| `SERVER-ACCESS.md` | Этот файл — доступ к файлам на сервере |

При передаче проекта заказчику: сохраните SSH-доступ, `.env` и доступ к GitHub
в надёжном месте (менеджер паролей, не в открытой переписке).

---

*English summary for partners:*  
Project files live at **`/opt/smeg`** on VPS **`89.108.66.148`**. Connect via **SSH** or **SFTP** (port 22). Edit code via **GitHub**, then run `git pull` and `docker compose build web && docker compose up -d web` on the server. Secrets are in **`.env`** (never commit to git).
