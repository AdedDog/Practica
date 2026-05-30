# Backend

FastAPI + SQLite.

## Структура

```
backend/app/
├── main.py           # запуск сервера
├── models.py         # таблицы БД
├── schemas.py        # формат ответов API (Pydantic)
├── services.py       # подсчёт мест в кейсах
├── seed.py           # демо-данные при первом запуске
└── routers/
    ├── public.py        # этап 2: публичное API
    ├── registration.py  # этап 3: регистрация команды
    ├── team.py          # этап 4: личный кабинет
    └── admin.py         # этап 5: админ-панель
```

## Запуск

```bash
cd backend
source .venv/bin/activate
pip install -r requirements.txt
cp env.example .env
uvicorn app.main:app --reload
```

Документация: http://127.0.0.1:8000/docs

## OTP на email (Gmail)

1. В Google-аккаунте включите **двухэтапную аутентификацию**.
2. Создайте **пароль приложения**: [App Passwords](https://myaccount.google.com/apppasswords) → «Почта» / «Другое».
3. В `backend/.env`:

```env
DEV_LOG_OTP=false
SMTP_USER=ваш@gmail.com
SMTP_PASSWORD=пароль_приложения_16_символов
ADMIN_EMAIL=ваш@gmail.com
```

4. Перезапустите uvicorn. При входе команды/админа код уйдёт на **реальный** email из профиля (для админа — `ADMIN_EMAIL`, не `admin@itkub.local`).

Без SMTP или с `DEV_LOG_OTP=true` код по-прежнему печатается в консоль backend.

**Частые проблемы**

- В логе `admin@itkub.local`, а в `.env` другой `ADMIN_EMAIL` — перезапустите uvicorn (seed обновит email в БД). Входите в админку с **тем же email**, что в `ADMIN_EMAIL`.
- Таймаут на порту 587 — в `.env` поставьте `SMTP_PORT=465` или оставьте `SMTP_FALLBACK_CONSOLE=true`: код появится в консоли, вход не упадёт с 503.
- Пароль приложения Gmail можно вставлять с пробелами — они убираются автоматически.

## Этап 2 — проверка API

| Метод | URL | Что делает |
|-------|-----|------------|
| GET | `/api/events` | Список **активных** мероприятий |
| GET | `/api/events/hackathon-2026` | Одно мероприятие + кейсы + свободные места |

Примеры в терминале:

```bash
curl http://127.0.0.1:8000/api/events
curl http://127.0.0.1:8000/api/events/hackathon-2026
```

При первом запуске создаётся демо-мероприятие `hackathon-2026` с тремя кейсами.

## Этап 3 — регистрация команды

**POST** `/api/events/{slug}/register`

Тело запроса (JSON):

```json
{
  "case_id": 1,
  "team_name": "Команда Альфа",
  "captain_name": "Иван Иванов",
  "email": "ivan@test.ru",
  "phone": "+79001234567",
  "invite_code": "DEMO-INVITE"
}
```

Ответ: `login` и `password` для личного кабинета (этап 4).

Демо-код приглашения: **`DEMO-INVITE`** (создаётся при старте сервера).

Проверки: email, телефон, лимит мест в кейсе, одноразовый код, уникальное имя команды.

## Этап 4 — личный кабинет

Двухшаговый вход:

1. `POST /api/team/login` — логин + пароль → OTP на email (или в консоли backend, см. Gmail выше)  
2. `POST /api/team/verify-otp?subject_id=1` — ввод кода → получаете `access_token`

Дальше в заголовке запросов: `Authorization: Bearer <token>`

| Метод | URL | Действие |
|-------|-----|----------|
| GET | `/api/team/me` | Профиль |
| PATCH | `/api/team/me` | Изменить ФИО, email, телефон, название |
| PATCH | `/api/team/me/case` | Сменить кейс |
| POST | `/api/team/resend-otp?subject_id=1` | Повторно отправить код (email или sms) |

## Публичный список мероприятий

На главной (`GET /api/events`) показываются только мероприятия со статусом **active**. Черновик (`draft`) и завершённые (`closed`) видны только в админке — нажмите «Активировать» после создания.

## Этап 5 — админ-панель

**Тестовый админ** (создаётся при старте; пароль синхронизируется с `ADMIN_PASSWORD` из `.env`, по умолчанию `admin123`):

- Email: `admin@itkub.local`
- Пароль: `admin123`

**Вход в UI** (`http://localhost:5173/admin/login`): шаг 1 — email и пароль → шаг 2 — OTP на почту `ADMIN_EMAIL` (или в консоли uvicorn без Gmail).

Вход через API: `POST /api/admin/login` → OTP → `POST /api/admin/verify-otp?subject_id=1`

| Метод | URL |
|-------|-----|
| GET | `/api/admin/events` |
| POST | `/api/admin/events` |
| PATCH | `/api/admin/events/{id}` |
| POST | `/api/admin/events/{id}/cases` |
| GET | `/api/admin/events/{id}/teams` |
| GET/POST | `/api/admin/events/{id}/invite-codes` |
| GET | `/api/admin/events/{id}/export` — скачать CSV |

Все маршруты (кроме login/verify-otp) требуют заголовок `Authorization: Bearer <token>`.
