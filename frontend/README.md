# Frontend

React + Vite + Dashboard (sidebar) + API backend.

## Этап 1

- `src/lib/api.js` — запросы к `/api/*`
- `src/lib/auth.js` — JWT (для следующих этапов)
- `vite.config.js` — proxy на backend :8000
- `event-selection.jsx` — список мероприятий с сервера
- `EventDetailPage.jsx` — страница мероприятия с кейсами

## Запуск

```bash
cd backend && uvicorn app.main:app --reload
cd frontend && npm run dev
```

http://localhost:5173

## Этап 2 — регистрация команды

Компонент `TeamRegistrationForm.jsx` на странице `/events/:slug`:

1. Выбор кейса  
2. Данные команды (название, капитан, email, телефон)  
3. Код приглашения → `POST /api/events/:slug/register`  

После успеха показываются **логин и пароль** (один раз).

Демо-код: **DEMO-INVITE** (если ещё не использован — создайте новый в админке).

## Этап 4 — личный кабинет

| URL | Назначение |
|-----|------------|
| `/cabinet/login` | Логин + пароль → OTP (код в консоли backend) |
| `/cabinet` | Профиль, редактирование, смена кейса |

Токен хранится в `localStorage` (`itkub_token`).

## Этап 5 — админ-панель

| URL | Назначение |
|-----|------------|
| `/admin/login` | admin@itkub.local / admin123 → OTP |
| `/admin` | Мероприятия, кейсы, коды, команды, CSV |

Токен админа: `itkub_admin_token` (отдельно от кабинета команды).
