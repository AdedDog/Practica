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
uvicorn app.main:app --reload
```

Документация: http://127.0.0.1:8000/docs

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

1. `POST /api/team/login` — логин + пароль → в консоли backend появится OTP-код  
2. `POST /api/team/verify-otp?subject_id=1` — ввод кода → получаете `access_token`

Дальше в заголовке запросов: `Authorization: Bearer <token>`

| Метод | URL | Действие |
|-------|-----|----------|
| GET | `/api/team/me` | Профиль |
| PATCH | `/api/team/me` | Изменить ФИО, email, телефон, название |
| PATCH | `/api/team/me/case` | Сменить кейс |
| POST | `/api/team/resend-otp?subject_id=1` | Повторно отправить код (email или sms) |

## Этап 5 — админ-панель

**Тестовый админ** (создаётся при старте, если админов ещё нет):

- Email: `admin@itkub.local`
- Пароль: `admin123`

Вход как у команды: `POST /api/admin/login` → OTP в консоли → `POST /api/admin/verify-otp?subject_id=1`

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
