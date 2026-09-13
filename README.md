# XLADA Backend

**XLADA** — самостоятельная панель управления Xray. Проект основан на
[Remnawave](https://github.com/remnawave) и является форком
[remnawave/backend](https://github.com/remnawave/backend).

| | |
|---|---|
| Организация | https://github.com/xray-panel |
| Версия | 1.1.1 |
| Лицензия | AGPL-3.0-only (см. `LICENCE`) |
| Апстрим | https://github.com/remnawave/backend |

## Атрибуция

XLADA — производная работа от Remnawave. Исходный код Remnawave
распространяется под лицензией AGPL-3.0-only, и XLADA сохраняет ту же
лицензию. Все права на оригинальный код принадлежат авторам Remnawave.
Подробности — в файле `NOTICE`.

Сеть — это AGPL: если вы предоставляете доступ к изменённой версии по сети,
вы обязаны опубликовать её исходный код.

Названия «Remnawave», её логотипы и домены принадлежат авторам Remnawave и в
XLADA не используются.

---

## Что такое XLADA Backend

Backend панели: REST API, работа с базой данных, очереди задач, планировщик и
отдача собранного фронтенда.

Стек:

| Компонент | Технология |
|---|---|
| HTTP-слой | NestJS |
| ORM и миграции | Prisma |
| База данных | PostgreSQL 18 |
| Кеш и очереди | Valkey / Redis |
| Архитектура | CQRS (`@nestjs/cqrs`) |
| Фоновые задачи | BullMQ |

Публичные контракты API лежат в репозитории, в `libs/contract`.

## Чем отличается от апстрима

- ребрендинг: убрано видимое имя и домены вендора;
- защита входа от перебора пароля (блокировка после серии неудачных попыток);
- пароль больше не попадает в уведомления о неудачном входе;
- журнал действий администраторов (`admin_audit_log`) и эндпоинт его чтения;
- управление администраторами панели (список, создание, смена пароля, удаление)
  с защитой от удаления последнего администратора и самого себя;
- очистка логов: статистика по лог-подобным таблицам и ручная очистка;
- retention для таблиц с персональными данными;
- очистка логов Xray на ноде из панели;
- TOTP: движок RFC 6238 и шифрование секрета (AES-256-GCM);
- приватность: убраны автоматические внешние обращения (ipinfo.io, ungh.cc);
- контракты перенесены внутрь репозитория (`libs/contract`), npm-пакеты
  `@remnawave/*` больше не нужны как источник истины;
- схемы Xray-валидатора исправлены под Xray v26.9.9.

## Установка панели

### Требования

**Сервер панели:**

- 2 ядра, 4 ГБ RAM, 20 ГБ диска (на тестовом стенде работает на 3,8 ГБ);
- Docker и Docker Compose;
- PostgreSQL 18 и Valkey — поднимаются контейнерами, ставить отдельно не нужно;
- домен и HTTPS. **Без обратного прокси с TLS панель не запустится**: в её коде
  есть middleware, который разрывает соединение, если нет заголовков
  `X-Forwarded-For` и `X-Forwarded-Proto: https`.

**Сервер ноды:**

- 1 ядро, 1 ГБ RAM;
- Docker;
- открытые порты для прокси (задаются в конфигурации Xray) и `NODE_PORT` (2222);
- для управления из панели — доступность `NODE_PORT` **с сервера панели**.

### Подготовка

Создайте каталог и файл окружения:

```bash
mkdir -p /opt/xpanel && cd /opt/xpanel
```

Сгенерируйте секреты. **`APP_SECRET` менять после запуска нельзя** — от него
зависят хеши паролей, JWT и секрет TOTP:

```bash
openssl rand -hex 32   # APP_SECRET (64 символа)
openssl rand -hex 16   # пароль PostgreSQL
```

### Файл `.env`

```ini
APP_PORT=3000
METRICS_PORT=3001
API_INSTANCES=1

POSTGRES_USER=xpanel
POSTGRES_PASSWORD=<пароль из шага генерации секретов>
POSTGRES_DB=xpanel
DATABASE_URL=postgresql://xpanel:<пароль>@xpanel-db:5432/xpanel?schema=public

APP_SECRET=<64 символа из шага генерации секретов>
JWT_AUTH_LIFETIME=12

PANEL_DOMAIN=https://panel.example.com
FRONT_END_DOMAIN=https://panel.example.com
SUB_PUBLIC_DOMAIN=https://panel.example.com

METRICS_USER=xpanel
METRICS_PASS=<любой пароль>

IS_TELEGRAM_NOTIFICATIONS_ENABLED=false
WEBHOOK_ENABLED=false
IS_HTTP_LOGGING_ENABLED=false

# Автоочистка. Включайте осознанно: она удаляет записи старше указанных сроков
SERVICE_CLEAN_USAGE_HISTORY=false
SERVICE_CLEAN_OLD_LOGS=false
USAGE_HISTORY_RETENTION_DAYS=14
AUDIT_LOG_RETENTION_DAYS=30
HWID_DEVICES_RETENTION_DAYS=90
SUBSCRIPTION_REQUEST_HISTORY_RETENTION_DAYS=30
NODES_USAGE_HISTORY_RETENTION_DAYS=90
```

`METRICS_USER` и `METRICS_PASS` обязательны — без них контейнер не стартует.

### `docker-compose.yml`

```yaml
services:
  xpanel-db:
    image: postgres:18.4
    container_name: xpanel-db
    restart: unless-stopped
    env_file: .env
    environment:
      - POSTGRES_USER=${POSTGRES_USER}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
      - POSTGRES_DB=${POSTGRES_DB}
      - TZ=UTC
    volumes:
      - xpanel-db-data:/var/lib/postgresql
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U $${POSTGRES_USER} -d $${POSTGRES_DB}']
      interval: 5s
      timeout: 5s
      retries: 10

  xpanel-redis:
    image: valkey/valkey:9-alpine
    container_name: xpanel-redis
    restart: unless-stopped
    command: >
      valkey-server --save "" --appendonly no
      --maxmemory-policy noeviction --loglevel warning
    healthcheck:
      test: ['CMD', 'valkey-cli', 'ping']
      interval: 5s
      timeout: 3s
      retries: 10

  xpanel:
    image: ghcr.io/xray-panel/backend:latest
    container_name: xpanel
    restart: unless-stopped
    env_file: .env
    environment:
      - REDIS_HOST=xpanel-redis
      - REDIS_PORT=6379
      - REDIS_DB=0
    ports:
      - 127.0.0.1:3000:3000
    depends_on:
      xpanel-db:
        condition: service_healthy
      xpanel-redis:
        condition: service_healthy

volumes:
  xpanel-db-data:
    name: xpanel-db-data
```

Порт публикуется только на `127.0.0.1` — наружу его отдаёт nginx. Так и должно
быть: панель не предназначена для прямого доступа из интернета.

### Запуск

```bash
docker compose up -d
docker compose logs -f xpanel
```

При первом запуске контейнер сам применяет миграции и заполняет базу.
Дождитесь в логе строки:

```
🌊 XLADA Backend v1.1.1
Nest application successfully started
```

### Обратный прокси и HTTPS

```nginx
server {
    server_name panel.example.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;

        # WebSocket — нужен для SSH-терминала к нодам
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_read_timeout 86400;
    }

    listen 80;
}
```

```bash
certbot --nginx -d panel.example.com
```

### Первый вход

Откройте `https://panel.example.com` — панель предложит создать администратора.
Подробности — в разделе «Первый вход» ниже.

## Первый вход

При первом открытии панели регистрируется суперадмин. Регистрация доступна
только пока в базе нет ни одной учётной записи администратора.

Требования к паролю (заданы в контракте `libs/contract`): **не короче 24
символов**, обязательно строчные, прописные и цифры. Например:
`XladaProd2026SecurePass!`.

Сразу после входа создайте API-токен в *Settings → API Tokens* — он нужен
странице подписки.

## Управление администраторами

Раздел находится в *Settings → Administrators*.

Что умеет:

- список администраторов панели;
- создание администратора (логин и пароль);
- смена пароля администратора;
- удаление администратора.

Ограничения:

- нельзя удалить самого себя;
- нельзя удалить последнего администратора — иначе в панель никто не сможет
  войти, потому что регистрация доступна только при пустой таблице
  администраторов;
- к разделу не допускаются API-токены: он защищён JWT-сессией администратора.

Пароль нового администратора подчиняется той же политике, что и пароль
суперадмина: не короче 24 символов, строчные, прописные и цифры.

## Логи и приватность

Панель хранит несколько видов записей. Что с ними происходит:

| Что | Где | Срок по умолчанию | Содержит |
|---|---|---|---|
| Журнал действий админов | `admin_audit_log` | 30 дней | кто, что, когда, IP |
| Устройства пользователей | `hwid_user_devices` | 90 дней | HWID, ОС, user-agent, IP |
| Запросы подписки | `user_subscription_request_history` | 30 дней | IP, user-agent |
| История трафика | `nodes_user_usage_history` | 14 дней | без IP |
| Статистика нод | `nodes_usage_history` | 90 дней | без IP |

**Автоочистка выключена по умолчанию.** Включается переменными
`SERVICE_CLEAN_USAGE_HISTORY` и `SERVICE_CLEAN_OLD_LOGS`; задача выполняется
раз в неделю.

**Тела запросов в журнал не пишутся.** Иначе туда попадали бы пароли, токены и
секреты OAuth2. Фиксируются только метод, путь, результат, IP и время.

**Ручная очистка** — на странице *Logs*: выберите источники и нажмите
«Delete selected». Сервер дополнительно требует явного подтверждения
(`confirm: true`), поэтому вызвать очистку в обход интерфейса нельзя.

**Журнал действий администраторов** — страница *Audit Log*: фильтры по
администратору и результату, пагинация.

## Обновление

```bash
docker compose pull
docker compose up -d
```

Миграции применяются автоматически при старте. Перед обновлением сделайте дамп:

```bash
docker exec xpanel-db pg_dump -U xpanel xpanel > backup-$(date +%F).sql
```

## Разработка

Требуется Node.js `>=24.18.0` (см. `engines` в `package.json`), а также
доступные PostgreSQL и Valkey/Redis.

Установка зависимостей из каталога `apps/backend`:

```bash
NODE_ENV=development npm ci --include=dev
```

Основные скрипты (полный список — в `package.json`):

```bash
npm run migrate:dev        # prisma migrate dev — создание и применение миграции
npm run migrate:generate   # prisma generate — генерация клиента
npm run migrate:deploy     # prisma migrate deploy — применение миграций
npm run migrate:seed       # prisma db seed

npm run build              # production-сборка (NODE_ENV=production rspack build)
npm run dev                # API в режиме watch
npm run dev:worker         # воркер
npm run dev:scheduler      # планировщик

npm run check              # oxfmt --check && oxlint
npm run lint               # oxlint
npm run fix                # oxfmt && oxlint --fix
npm run generate:openapi   # сборка и генерация OpenAPI-документа
```

Отдельного npm-скрипта для тестов в `package.json` нет. Проверочные скрипты
лежат в каталоге `scripts` и запускаются напрямую:

```bash
./scripts/test-totp.sh
./scripts/test-login-policy.sh
./scripts/test-admin-api.sh
```

## Связанные репозитории

- https://github.com/xray-panel/frontend — интерфейс панели
- https://github.com/xray-panel/node — нода
- https://github.com/xray-panel/subscription-page — страница подписки
- Telegram-канал проекта — https://t.me/x_lada

## Лицензия

AGPL-3.0-only. Полный текст лицензии — в файле `apps/backend/LICENCE`
(в таблице выше он указан как `LICENCE`). Уведомления об авторских правах и
лицензиях компонентов апстрима — в файле `NOTICE` в корне репозитория.
