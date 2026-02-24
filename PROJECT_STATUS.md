# Статус проекту: Система обліку для агробізнесу

## Огляд проекту

**Назва**: ERP система для обліку витратних матеріалів та запчастин
**Тип**: Web-додаток (FastAPI + React)
**База даних**: SQLite (локально) → PostgreSQL/Neon (production)
**Розташування**: `C:\elev\`
**Версія**: 0.7.0
**Останнє оновлення**: 2026-02-24

### Стек технологій
- **Backend**: Python 3.12.6, FastAPI 0.109, SQLAlchemy 2.0, Pydantic 2.10.6
- **Frontend**: React 18.2, Vite, Material-UI 5.14, Axios
- **БД**: SQLite (локально), PostgreSQL/Neon (production)
- **Деплой**: Render (backend) + Vercel (frontend) + Neon.tech (DB)
- **CI/CD**: GitHub Actions

### Production URLs
- **Frontend**: https://agro-erp-system.vercel.app
- **Backend**: https://agro-erp-backend.onrender.com
- **API Docs**: https://agro-erp-backend.onrender.com/docs
- **GitHub**: https://github.com/jyjuk/Agro-ERP-System

---

### Підрозділи (13 штук)

| # | Назва | Тип |
|---|---|---|
| 1 | Основний склад | warehouse (центральний, всі закупівлі) |
| 2 | Склад готової продукції | warehouse |
| 3 | Млин | production |
| 4 | Елеватор | warehouse |
| 5 | Цех паливної гранули | production |
| 6 | Адміністрація | administration |
| 7 | Вагова | service |
| 8 | Охорона | service |
| 9 | Лабораторія | service |
| 10 | Бухгалтерія | administration |
| 11 | Прибирання | service |
| 12 | Офіс | administration |
| 13 | Транспорт | transport |

---

## Повна структура файлів (станом на 2026-02-24)

### Backend (`C:\elev\backend\`)
```
app/
├── main.py                    — FastAPI app, CORS, роутери (13 роутерів)
├── database.py                — SQLAlchemy, auto-switch SQLite↔PostgreSQL
├── config.py                  — Settings з pydantic-settings, читає .env
├── models/
│   ├── user.py                — User, Role
│   ├── department.py          — Department (13 шт.)
│   ├── product.py             — Product, ProductCategory, Unit
│   ├── supplier.py            — Supplier
│   ├── purchase.py            — Purchase, PurchaseItem
│   ├── inventory.py           — Inventory, InventoryTransaction
│   ├── transfer.py            — Transfer, TransferItem
│   ├── writeoff.py            — WriteOff, WriteOffItem
│   ├── inventory_count.py     — InventoryCount, InventoryCountItem
│   ├── audit.py               — AuditLog
│   └── transport.py           — TransportUnit
├── schemas/
│   ├── auth.py, supplier.py, product.py
│   ├── purchase.py, inventory.py, transfer.py
│   ├── writeoff.py, report.py
│   └── (transport схеми вбудовані в api/v1/transport.py)
├── api/v1/
│   ├── auth.py                — login, logout, /me, /refresh
│   ├── users.py               — CRUD користувачів
│   ├── suppliers.py           — CRUD постачальників
│   ├── products.py            — CRUD товарів + категорії + одиниці
│   ├── departments.py         — GET список підрозділів
│   ├── purchases.py           — CRUD закупівель + підтвердження
│   ├── transfers.py           — CRUD переміщень + підтвердження
│   ├── writeoffs.py           — CRUD списань + підтвердження
│   ├── inventory.py           — залишки + low-stock
│   ├── inventory_counts.py    — CRUD інвентаризацій + підтвердження
│   ├── reports.py             — 5 типів звітів + dashboard
│   ├── notifications.py       — Telegram endpoints
│   └── transport.py           — CRUD транспорту
├── services/
│   └── notifications.py       — Telegram через httpx
└── api/deps.py                — 5 permission guards

scripts/
├── seed_data.py               — початкові дані (13 підрозділів, ролі, admin)
├── add_departments.py         — ВИКОНАНО 2026-02-24, додано 7 підрозділів
├── add_accountant_role.py
├── cleanup_operator_role.py
└── seed_roles.py

render.yaml                    — конфіг для Render.com
requirements.txt               — всі залежності з фіксованими версіями
runtime.txt                    — Python 3.12.6
```

### Frontend (`C:\elev\frontend\`)
```
src/
├── App.jsx
├── routes/
│   ├── AppRoutes.jsx          — 11 маршрутів
│   └── PrivateRoute.jsx
├── context/
│   └── AuthContext.jsx        — 5 хелперів ролей, refresh token
├── hooks/
│   └── usePagination.js       — хук пагінації (page, rowsPerPage, paginate)
├── api/
│   ├── client.js              — Axios, VITE_API_URL, auto-refresh interceptor
│   ├── auth.js                — login/logout
│   ├── suppliers.js, products.js, purchases.js
│   ├── transfers.js, writeoffs.js, inventory.js
│   ├── departments.js, reports.js, users.js
│   ├── notifications.js
│   ├── inventory_counts.js
│   └── transport.js
├── pages/
│   ├── auth/Login.jsx
│   ├── dashboard/Dashboard.jsx
│   ├── suppliers/SuppliersList.jsx
│   ├── products/ProductsList.jsx
│   ├── purchases/PurchasesList.jsx
│   ├── transfers/TransfersList.jsx
│   ├── writeoffs/WriteOffsList.jsx
│   ├── inventory/InventoryPage.jsx
│   ├── inventory_counts/InventoryCountsPage.jsx
│   ├── reports/ReportsPage.jsx
│   ├── users/UsersList.jsx
│   └── transport/TransportPage.jsx
└── components/
    ├── layout/MainLayout.jsx
    ├── suppliers/SupplierDialog.jsx
    ├── products/ProductDialog.jsx
    ├── purchases/CreatePurchaseDialog.jsx
    ├── transfers/CreateTransferDialog.jsx
    ├── writeoffs/CreateWriteOffDialog.jsx
    ├── users/UserDialog.jsx
    ├── transport/TransportDialog.jsx
    └── (inventory counts — inline в InventoryCountsPage)

vercel.json                    — SPA routing (rewrites до /)
vite.config.js                 — port 3000, proxy /api → localhost:8000
```

### GitHub / CI/CD (`C:\elev\.github\`)
```
.github/workflows/
├── deploy.yml                 — push to main → deploy Render + Vercel
└── keep-alive.yml             — cron кожні 10 хв → ping /health
```

---

## Історія змін (детально)

### Сесії 1–7: Базовий функціонал та RBAC (до 2026-02-24)

| Сесія | Зміни |
|---|---|
| 1 | Видалення email, UI постачальники/товари, категорії на льоту, виправлення API шляхів |
| 2 | Автокоди SUP/PROD, звіти по підрозділах та матеріалах |
| 3 | Фільтри звітів, Excel export (SheetJS), PDF/Print |
| 4 | Telegram сповіщення, PostgreSQL готовність |
| 5 | RBAC (5 ролей), deps.py guards, RBAC меню |
| 6 | Видалено operator, додано accountant, kill_backend.ps1 |
| 7 | Аудит: 6 багів виправлено (schemas, auth.js хардкод, logout) |

---

### Сесія 8: Звіт підрозділів + 13 підрозділів + Транспорт (2026-02-24)

#### 27. Звіт по підрозділах — колонка "Переміщено"
- ✅ `schemas/report.py` → нові поля `transferred_quantity`, `transferred_value`, `total_transferred_value`
- ✅ `api/v1/reports.py` → SQL query `Transfer.from_department_id == dept.id` per product
- ✅ `ReportsPage.jsx` → 2 нові колонки + Summary bar + Excel export

**Таблиця:** Матеріал | Категорія | Отримано | Сума | Списано | Сума | **Переміщено** | **Сума** | Залишок | Вартість

#### 28. Нові підрозділи (7 штук)
- ✅ `scripts/add_departments.py` — виконано, в БД: Вагова, Охорона, Лабораторія, Бухгалтерія, Прибирання, Офіс, Транспорт
- ✅ `scripts/seed_data.py` — оновлено (13 підрозділів для нових інсталяцій)

#### 29. Модуль Транспорт (повний CRUD)
- ✅ `models/transport.py` — `TransportUnit` (id, name, unit_type, plate_number, notes, is_active)
- ✅ `api/v1/transport.py` — GET /, GET /types, POST /, PUT /{id}, DELETE /{id}
- ✅ `TransportPage.jsx` — summary картки, пошук, CRUD
- ✅ `TransportDialog.jsx` — freeSolo Autocomplete для типу

---

### Сесія 9: Функціональна 100% + GitHub + Деплой (2026-02-24)

#### 30. Refresh Token endpoint
- ✅ `api/v1/auth.py` → `POST /auth/refresh` (перевіряє `type == "refresh"`, повертає новий access_token)
- ✅ `AuthContext.jsx` → зберігає/очищає `refresh_token` в localStorage
- ✅ `api/client.js` → повний auto-refresh interceptor з чергою concurrent requests:
  - `isRefreshing` flag + `failedQueue[]`
  - при 401: якщо є refresh_token → рефреш → повторити запит
  - якщо немає refresh_token → redirect /login
  - якщо вже рефрешиться → поставити в чергу → виконати після рефрешу

#### 31. Пагінація всіх таблиць
- ✅ `hooks/usePagination.js` — хук: `page`, `rowsPerPage`, `handleChangePage`, `handleChangeRowsPerPage`, `paginate(items)`, `reset()`
- ✅ Застосовано до 8 сторінок (25/сторінка, Inventory 50/сторінка):
  - SuppliersList, ProductsList, UsersList, PurchasesList
  - TransfersList, WriteOffsList, InventoryPage, TransportPage
- Всі з українськими мітками (`Рядків на сторінці:`, `X–Y з Z`)

#### 32. Модуль Інвентаризація (повний CRUD)
- ✅ `api/v1/inventory_counts.py` — 6 endpoints:
  - `GET /` — список з фільтрами (department, status)
  - `GET /{id}` — деталі з items
  - `POST /` — створити (auto-fill з поточних залишків підрозділу)
  - `PUT /{id}/items` — оновити фактичні кількості
  - `POST /{id}/approve` — підтвердити (admin): коригує Inventory + створює InventoryTransaction(adjustment)
  - `DELETE /{id}` — видалити (тільки draft)
- ✅ `InventoryCountsPage.jsx` — фільтри, розгортувані рядки, inline редагування, кольорові різниці (зелений/червоний), пагінація
- ✅ Маршрут `/inventory-counts`, пункт меню "Інвентаризація"
- Номери актів: `INV-YYYYMMDD-NNN`

#### 33. GitHub готовність — 100%
- ✅ `README.md` — повна документація v0.7.0
- ✅ `backend/.env.example` — шаблон всіх змінних (без реальних значень)
- ✅ `.github/workflows/deploy.yml` — GitHub Actions: Render hook + Vercel deploy
- ✅ `.gitignore` — доповнено `.claude/`, `nul`
- ✅ Видалено артефакти: `nul`, unicode-файл
- ✅ `git init` → `git add` → Initial commit `a5007f7` (106 файлів, 15 854 рядки)
- ✅ `git push origin main` → https://github.com/jyjuk/Agro-ERP-System

#### 34. Деплой — Production

**Render (Backend):**
- ✅ Задеплоєно: https://agro-erp-backend.onrender.com
- ✅ Python 3.12.6 (env var `PYTHON_VERSION=3.12.6`)
- ✅ PostgreSQL/Neon підключена
- ✅ Seed data виконано (ролі, підрозділи, admin, одиниці, категорії)
- ✅ `pydantic` оновлено до 2.10.6 для сумісності

**Vercel (Frontend):**
- ✅ Задеплоєно: https://agro-erp-system.vercel.app
- ✅ Root Directory: `frontend`
- ✅ `VITE_API_URL` = `https://agro-erp-backend.onrender.com/api/v1`

**GitHub Actions secrets** (потрібно додати):
```
RENDER_DEPLOY_HOOK_URL
VERCEL_TOKEN
VERCEL_ORG_ID
VERCEL_PROJECT_ID
VITE_API_URL
```

#### 35. Keep-alive
- ✅ Frontend: `fetch('/health')` кожні 10 хв (MainLayout.jsx)
- ✅ `.github/workflows/keep-alive.yml` — GitHub Actions cron `*/10 * * * *` → curl /health
- ✅ UptimeRobot — налаштовано, пінг кожні 5 хв, моніторинг uptime

#### 36. CI/CD — повне налаштування
- ✅ GitHub Actions secrets додано (5 шт): `RENDER_DEPLOY_HOOK_URL`, `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, `VITE_API_URL`
- ✅ Виправлено `deploy.yml`: прибрано `working-directory: ./frontend` — конфліктувало з `rootDirectory: frontend` на Vercel (CLI запускався з `frontend/`, Vercel знову застосовував `rootDirectory` → шукав `vercel.json` в `frontend/frontend/`)
- ✅ Обидва jobs зелені: `Deploy Backend (Render)` + `Deploy Frontend (Vercel)`
- **Результат**: кожен `git push origin main` → автоматичний деплой backend (Render) + frontend (Vercel)

---

## Поточний стан системи (2026-02-24)

### ✅ Готовий функціонал — 100%

| Модуль | Статус |
|---|---|
| Аутентифікація (JWT + refresh token + auto-refresh) | ✅ |
| RBAC (5 ролей, всі endpoints захищені) | ✅ |
| Постачальники CRUD | ✅ |
| Товари/Матеріали CRUD (категорії + одиниці на льоту) | ✅ |
| Закупівлі (draft → confirm → inventory) | ✅ |
| Переміщення між підрозділами | ✅ |
| Списання (валідація + Telegram) | ✅ |
| Залишки (фільтри по підрозділу/товару) | ✅ |
| Інвентаризація (акти + коригування) | ✅ |
| Звіти (5 типів + Excel + PDF) | ✅ |
| Dashboard (KPI + графіки + low-stock) | ✅ |
| Telegram сповіщення | ✅ |
| Транспорт CRUD | ✅ |
| Пагінація всіх таблиць | ✅ |
| Підрозділи (13 шт.) | ✅ |

### 🚀 Запуск локально

```bash
# Backend
cd C:\elev\backend
venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000

# Frontend (новий термінал)
cd C:\elev\frontend
npm start

# http://localhost:3000 | admin / admin
```

### 🌐 Production

| Сервіс | URL | Статус |
|---|---|---|
| Frontend | https://agro-erp-system.vercel.app | ✅ Live |
| Backend | https://agro-erp-backend.onrender.com | ✅ Live |
| API Docs | https://agro-erp-backend.onrender.com/docs | ✅ Live |
| GitHub | https://github.com/jyjuk/Agro-ERP-System | ✅ Public |

---

## Аналіз готовності (фінальний)

| Аспект | Оцінка | Статус |
|---|---|---|
| Функціональний код | **100%** | ✅ Всі модулі реалізовані |
| GitHub-готовність | **100%** | ✅ Репо, CI/CD, secrets-free |
| Деплой | **100%** | ✅ Render + Vercel + Neon живі |
| Keep-alive | **100%** | ✅ Frontend ping + GitHub Actions cron |
| Unit тести | **0%** | ⚠️ Відсутні (прийнятно для MVP) |

### Рекомендації після запуску

1. **Змінити пароль admin** — обов'язково
2. **UptimeRobot** — https://uptimerobot.com → пінг /health кожні 5 хв + email alerts
3. **GitHub Actions secrets** — додати 5 secrets для повного CI/CD
4. **Telegram** — налаштувати BOT_TOKEN + CHAT_ID на Render для сповіщень
5. **Render startCommand** — seed_data.py вже не потрібен, можна прибрати з команди

---

## Деталі архітектури

### Ключові рішення
1. **Auto-refresh**: `isRefreshing` flag + `failedQueue` — всі concurrent 401 стають в чергу
2. **Автогенерація кодів**: SUP-XXXX, PROD-XXXX — автоматично, read-only
3. **Основний склад**: всі закупівлі → Основний склад → переміщення по підрозділах
4. **Вартість**: середня собівартість при переміщенні і списанні
5. **PostgreSQL switching**: `is_sqlite` flag в `database.py`, `pool_pre_ping=not is_sqlite`
6. **CORS**: `ALLOWED_ORIGINS` розбивається по комі → підтримує кілька доменів

### БД — таблиці
`users`, `roles`, `departments`, `suppliers`, `products`, `product_categories`, `units`, `purchases`, `purchase_items`, `inventory`, `inventory_transactions`, `transfers`, `transfer_items`, `writeoffs`, `writeoff_items`, `inventory_counts`, `inventory_count_items`, `audit_log`, `transport_units`

### Типові помилки
1. **"Write-off not found"** → перевірити ID, можливо вже видалено
2. **"Insufficient stock"** → товар є на іншому підрозділі, не на цьому
3. **Повільні звіти** → при великих даних є пагінація
4. **Старий uvicorn процес** → запустити `kill_backend.ps1`
5. **Render засинає** → UptimeRobot або GitHub Actions keep-alive

---

## Плани розвитку

### ★ ЗАВТРА ПОЧИНАТИ З ЦЬОГО

#### Пріоритет 1 — Audit Trail UI (хто що змінив, коли)
**Що є вже зараз:**
- ✅ Модель `AuditLog` в `backend/app/models/audit.py` — таблиця існує
- ✅ Дані пишуться (перевірити чи пишуться при підтвердженнях)

**Що потрібно зробити:**
- [ ] Backend: `GET /api/v1/audit/` з фільтрами (user, action, date, entity)
- [ ] Frontend: сторінка "Журнал змін" — таблиця з колонками: Дата/час | Користувач | Дія | Об'єкт | Деталі
- [ ] Додати в меню (тільки admin)

**Складність**: середня | **Цінність**: висока (хто і коли підтвердив списання, змінив дані)

---

#### Пріоритет 2 — Імпорт з Excel
**Що потрібно:**
- [ ] Backend: `POST /api/v1/products/import` — читає xlsx, створює товари пакетно
- [ ] Backend: `POST /api/v1/suppliers/import` — те саме для постачальників
- [ ] Frontend: кнопка "Імпорт Excel" + drag-and-drop + preview перед збереженням
- [ ] Шаблон Excel для завантаження (правильні колонки)

**Складність**: середня | **Цінність**: висока (початкове завантаження даних клієнта)

---

#### Пріоритет 3 — Telegram бот з кнопками
**Що потрібно:**
- [ ] `pip install python-telegram-bot>=20`
- [ ] `backend/app/telegram_bot/` — bot.py, handlers.py, api_client.py, states.py
- [ ] ConversationHandler: Перемістити / Списати / Залишки / Скасувати
- [ ] Окремий процес: `backend/run_bot.py`
- [ ] Render: окремий Worker сервіс (або thread в main.py)

**Складність**: висока | **Цінність**: висока (робота зі складу з телефону без браузера)

---

### Виконано (закрито)
- ✅ UptimeRobot — налаштовано (5 хв пінг)
- ✅ GitHub Actions secrets — всі 5 додано
- ✅ CI/CD повністю робочий (обидва jobs зелені)
- ✅ Keep-alive — GitHub Actions cron + UptimeRobot

### Довгострокові
1. **Бюджетування** — планування закупівель, контроль бюджету по підрозділах
2. **PWA / мобільний** — QR-сканування
3. **Сортування таблиць** — клік по заголовку колонки

---

**Останнє оновлення**: 2026-02-24 (сесія 10 — CI/CD fix, UptimeRobot, keep-alive, завтрашні пріоритети)
**Версія**: 0.7.0
**Статус**: ✅ Production Live | CI/CD ✅ | Моніторинг ✅
