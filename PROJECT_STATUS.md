# Статус проекту: Система обліку для агробізнесу

## Огляд проекту

**Назва**: ERP система для обліку витратних матеріалів та запчастин
**Тип**: Web-додаток (FastAPI + React)
**База даних**: SQLite (локально) → PostgreSQL/Neon (production)
**Розташування**: `C:\elev\`
**Версія**: 0.9.1
**Останнє оновлення**: 2026-03-09

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
├── main.py                    — FastAPI app, CORS, роутери (16 роутерів), lifespan (scheduler)
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
│   ├── transport.py           — TransportUnit
│   └── electricity.py         — ElectricityRecord (місячний облік ел-ії)
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
│   ├── reports.py             — 5 типів звітів + dashboard + writeoffs endpoint
│   ├── notifications.py       — Telegram endpoints + POST /send-stock-report
│   ├── transport.py           — CRUD транспорту
│   └── electricity.py         — GET /{month}, POST /save (admin only), GET /
├── services/
│   ├── notifications.py       — Telegram через httpx (chunking 4000 chars)
│   ├── scheduler.py           — APScheduler: job_weekly_reminder (пн 9:00) + job_friday_check
│   └── audit.py               — write_audit() хелпер (без commit)
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
│   ├── AppRoutes.jsx          — 13 маршрутів
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
│   ├── transport.js
│   ├── electricity.js         — getMonth, save, listMonths
│   └── audit.js               — getLog(params), getMeta()
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
│   ├── transport/TransportPage.jsx
│   ├── electricity/
│   │   ├── ElectricityPage.jsx    — введення даних (admin) + вкладки
│   │   └── ElectricityAnalytics.jsx — 5 блоків (BarChart, Pie, таблиця, MoM, YoY)
│   └── audit/
│       └── AuditPage.jsx          — журнал дій (тільки admin)
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

#### 37. Облік запчастин по конкретному ТЗ (2026-03-03)
- ✅ `models/transport.py` — додано `department_id` (FK → departments) + relationship
- ✅ `api/v1/transport.py` — при CREATE авто-створює `Department` з назвою ТЗ; при UPDATE — оновлює назву підрозділу; при DELETE — деактивує підрозділ
- ✅ `main.py` — `_run_schema_migrations()` при кожному старті додає `department_id` до існуючої таблиці (idempotent, `ALTER TABLE ... IF NOT EXISTS`)
- ✅ `scripts/migrate_transport_departments.py` — міграція для ручного запуску (існуючі ТЗ)
- ✅ `render.yaml` — startCommand: `seed_data → migration → uvicorn`
- ✅ `TransportPage.jsx` — кнопка 📦 Залишки (переходить на `/inventory?dept=...`)
- ✅ `InventoryPage.jsx` — читає URL param `?dept=` для авто-фільтрації

**Логіка**: кожен ТЗ = окремий `Department` (type='transport'). Переміщення → "На підрозділ" → вибираєш конкретний ТЗ. Залишки фільтруються по підрозділу ТЗ.

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
| Telegram scheduler (понеділок 9:00 + остання п'ятниця) | ✅ |
| Транспорт CRUD + облік запчастин по конкретному ТЗ | ✅ |
| Пагінація всіх таблиць | ✅ |
| Підрозділи (13 шт.) | ✅ |
| Звіт списань по підрозділах (таб "Списання") | ✅ |
| Електроенергія (облік + аналітика + генератор) | ✅ |
| Audit Trail UI (журнал дій, фільтри, IP) | ✅ |
| Dashboard — графік електроенергії (останні 6 місяців) | ✅ |
| Електроенергія — MoM порівняння з дельтою % | ✅ |

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
`users`, `roles`, `departments`, `suppliers`, `products`, `product_categories`, `units`, `purchases`, `purchase_items`, `inventory`, `inventory_transactions`, `transfers`, `transfer_items`, `writeoffs`, `writeoff_items`, `inventory_counts`, `inventory_count_items`, `audit_log`, `transport_units`, `electricity_records`

> `transport_units.department_id` → FK на `departments.id` (кожен ТЗ має свій підрозділ)
> `electricity_records.gen_start/gen_end` — nullable (генератор не завжди працює); auto-migrated via `_run_schema_migrations()`

### Типові помилки
1. **"Write-off not found"** → перевірити ID, можливо вже видалено
2. **"Insufficient stock"** → товар є на іншому підрозділі, не на цьому
3. **Повільні звіти** → при великих даних є пагінація
4. **Старий uvicorn процес** → запустити `kill_backend.ps1`
5. **Render засинає** → UptimeRobot або GitHub Actions keep-alive
6. **"department_id column does not exist"** → `_run_schema_migrations()` в main.py виправляє при старті автоматично
7. **"date: Input should be None"** при редагуванні підтвердженої закупівлі → ✅ ВИПРАВЛЕНО (commit `7b44b5f`). Причина: Pydantic v2 `none_required` для `Optional[date]` — жоден `field_validator` не допомагав. Рішення: `PurchaseUpdate.date: Optional[str]` (бай-пас Pydantic), конвертація `date_type.fromisoformat()` вручну в ендпоінті.

---

## Плани розвитку

---

### Сесія 15–17: Scheduler + Write-off report + Electricity module (2026-03-06)

#### 38. APScheduler — Telegram автосповіщення
- ✅ `backend/app/services/scheduler.py` — BackgroundScheduler, timezone=Europe/Kiev
- ✅ `job_weekly_reminder` — щопонеділка 9:00, нагадування перевірити залишки
- ✅ `job_friday_check` — остання п'ятниця місяця (last_friday logic), low-stock звіт
- ✅ `build_low_stock_report(db)` — запит до inventory WHERE qty < min_stock_level
- ✅ `backend/app/main.py` — lifespan context manager: start_scheduler() / stop_scheduler()
- ✅ `backend/requirements.txt` — apscheduler==3.10.4
- ✅ `backend/app/api/v1/notifications.py` — POST /send-stock-report (ручний тригер)
- ✅ `backend/app/services/notifications.py` — chunking: split by lines, max 4000 chars/message
- **Bug fix**: NameError `job_weekly_report` → перейменовано на `job_weekly_reminder` в start_scheduler()

#### 39. Звіт Списань по підрозділах (новий таб у Reports)
- ✅ `backend/app/schemas/report.py` — WriteoffMaterialRow, WriteoffDepartmentData, WriteoffReportResponse
- ✅ `backend/app/api/v1/reports.py` — GET /writeoffs з фільтрами date_from/date_to/department_id
- ✅ SQL GROUP BY: WriteOff JOIN Department JOIN WriteOffItem JOIN Product JOIN Category JOIN Unit
- ✅ `frontend/src/api/reports.js` — getWriteoffReport(params)
- ✅ `frontend/src/pages/reports/ReportsPage.jsx`:
  - Таб 5 "Списання": таблиця підрозділів → матеріали → к-сть, сума
  - Promise.all → Promise.allSettled (resilience коли один endpoint недоступний)
  - Excel export для нового табу
  - Виправлено мітки: "Отримано" → "Переміщено (вхід)", "Відправлено" → "Переміщено (вихід)"

#### 40. Модуль Електроенергія — повний
- ✅ `backend/app/models/electricity.py` — ElectricityRecord (місяць unique, 8 лічильників + генератор)
- ✅ `backend/app/api/v1/electricity.py`:
  - Коефіцієнти: MLYN_1=100, MLYN_2=1, PALETKA=1000
  - _calc(): ktp_total, gen_kwh, total_kwh, mlyn1_kwh, mlyn2_kwh, mlyn_total, palet_kwh, elevator_kwh
  - GET /{month} — завантажити місяць (all users)
  - POST /save — зберегти/оновити (admin only, get_current_admin_user)
  - GET / — список всіх місяців (all users)
- ✅ `backend/app/main.py`:
  - Importer electricity model
  - electricity router registered
  - _run_schema_migrations(): gen_start/gen_end columns (idempotent ALTER TABLE IF NOT EXISTS)
- ✅ `frontend/src/api/electricity.js` — getMonth, save, listMonths
- ✅ `frontend/src/pages/electricity/ElectricityPage.jsx`:
  - 3 секції вводу: КТП, Млин (2 лічильники), Пелетний цех
  - Генератор (опціональний, dashed border, warning кольори)
  - `n(v) = parseFloat(String(v).replace(',', '.')) || 0` — підтримка коми як десяткового
  - Авто-завантаження при зміні місяця (404 → очистити поля)
  - Підсумок розподілу з % від загального
  - Ролі: admin бачить 2 табки (введення + аналітика); інші — тільки аналітику
- ✅ `frontend/src/pages/electricity/ElectricityAnalytics.jsx`:
  - Блок 1: BarChart стек (Млин/Пелетний/Елеватор) по місяцях + фільтр року
  - Блок 2: PieChart — 3 споживачі (генератор виключено, він ДЖЕРЕЛО а не споживач!)
  - Блок 3: таблиця місяців (КТП, Генератор*, Всього, Млин, Пелетний, Елеватор) + Excel
  - Блок 4: BarChart рік-до-року (total_kwh)
  - CustomTooltip показує генератор як окреме джерело
  - ⚡ на мітці X-осі для місяців де працював генератор
- ✅ `frontend/src/components/layout/MainLayout.jsx` — пункт меню "Електроенергія"
- ✅ `frontend/src/routes/AppRoutes.jsx` — route `/electricity`
- **Bug fix**: генератор показувався як споживач у pie/bar → виправлено (він джерело!)

**БД**: `electricity_records` (id, month unique, ktp_old, ktp_new, mlyn1_start/end, mlyn2_start/end, palet_start/end, gen_start nullable, gen_end nullable, created_by FK, timestamps)

---

---

### Сесія 18: Audit Trail + Dashboard electricity + MoM (2026-03-09)

#### 41. Audit Trail UI
- ✅ `backend/app/services/audit.py` — `write_audit(db, user_id, action, entity_type, entity_id, changes)` без commit
- ✅ `backend/app/api/v1/audit.py` — GET /audit/ (фільтри: user_id, action, entity_type, date_from, date_to, skip, limit), GET /audit/meta
- ✅ Логування в: auth (login з IP, logout), purchases (confirm), transfers (confirm), writeoffs (confirm), inventory_counts (approve)
- ✅ `frontend/src/api/audit.js` — getLog, getMeta
- ✅ `frontend/src/pages/audit/AuditPage.jsx` — таблиця (дата, user, дія-Chip, об'єкт+іконка, ID, деталі змін розкладні, IP), фільтри, пагінація server-side
- ✅ Меню admin: "Журнал змін" (ManageSearch іконка), маршрут `/audit`

#### 42. Dashboard — графік електроенергії
- ✅ `Dashboard.jsx`: завантаження `electricityAPI.listMonths()` через Promise.allSettled
- ✅ Стековий BarChart (Млин/Пелетний/Елеватор), останні 6 місяців, вісь Y в 'k'
- ✅ Блок видимий тільки якщо є дані

#### 43. ElectricityAnalytics — MoM порівняння
- ✅ Блок між таблицею і YoY: два селектори місяців (дефолт — два останніх)
- ✅ Grouped BarChart: для кожного споживача + Всього — два стовпці поряд
- ✅ Дельта під графіком: значення + % зміни, ▲ червоний (більше) / ▼ зелений (менше)

#### Fix: PieChart мітка "Млин" обрізалась
- ✅ height 250→280, margin top:30, outerRadius 100→90

---

### ★ НАСТУПНЕ ПОЧИНАТИ З ЦЬОГО

#### ✅ BUG: "date: Input should be None" — ВИПРАВЛЕНО (commit `7b44b5f`)

**Причина**: Pydantic v2 `none_required` error для `Optional[date]` в `PurchaseUpdate`. Попередні спроби (`.split('T')[0]` на фронті, `@field_validator('date', mode='before')`) не допомогли — Pydantic v2 відхиляв рядок ще до виклику валідатора.
**Кінцеве рішення**:
- `backend/app/schemas/purchase.py`: `date: Optional[str] = None` — повний бай-пас Pydantic date validation
- `backend/app/api/v1/purchases.py` (`update_purchase`): `model_dump(exclude_unset=True, exclude={'items', 'date'})` + ручна конвертація `date_type.fromisoformat(str(purchase.date).split('T')[0])`

---

#### ✅ Dashboard — ДООПРАЦЬОВАНО (commit `47c348d`, chart fix `7b44b5f`)

- Низькі залишки — завжди видимі (empty state "Все в нормі" якщо OK)
- Останні 5 закупівель з номером, датою, постачальником, сумою, статусом
- Останні 5 переміщень з номером, датою, звідки-куди, статусом
- Типи транзакцій українською (Прихід / Переміщення / Списання / Коригування)
- KPI-картки з кольоровою лівою смугою, числа через toLocaleString
- **Chart fix**: `total_amount` від API — Decimal-рядок, Recharts не міг порахувати домен → Y-вісь показувала 2420 замість реальних 123000+. Виправлено: `parseFloat()` для всіх значень + `maxAmount` розраховується заздалегідь як `Math.max(0, ...data.map(d => d.total_amount))`, домен `[0, Math.ceil(maxAmount * 1.3)]`

---

#### ✅ Searchable Autocomplete у діалогах закупівель і переміщень (commit `20f39e3`)

- `CreatePurchaseDialog`: поля Постачальник, Підрозділ, Товар у рядках — замінено з `<TextField select>` на MUI `<Autocomplete>` з текстовим пошуком
- `CreateTransferDialog`: поля "З підрозділу", "На підрозділ", Товар у рядках — аналогічно; для товарів збережено `renderOption` з відображенням доступного залишку (`є: N`)
- Пошук по першим літерам назви, фільтрація списку в реальному часі

---

#### ✅ Аналітика — 3 вкладки (commit `79ed646`)

- **Динаміка цін** — для обраного товару лінійний графік зміни `unit_price` по датах; кожен постачальник — окрема лінія свого кольору. Діапазон дат довільний, дефолт — останній рік
- **По постачальниках** — витрати по кожному постачальнику за вказаний місяць/період; рядки розкриваються → накладна, товар, к-сть, ціна, сума. Зручно для звірки рахунку від постачальника
- **ABC-аналіз** — ранжування товарів за сумою закупівель: A (80% витрат), B (15%), C (5%); картки з сумами і таблиця з накопиченим %; чіпи A/B/C
- Маршрут `/analytics`, пункт меню "Аналітика" для ролей admin/manager/accountant
- Backend: `GET /api/v1/reports/price-dynamics`, `/supplier-monthly`, `/abc-analysis`

---

#### ✅ BUG: дублювання позицій у закупівлях і переміщеннях (commit `70c8080`)

**Причина**: shallow copy + спільне посилання на об'єкт.
- `handleAddItem` додавав той самий об'єкт `emptyItem` (не копію) → всі нові рядки посилались на один об'єкт
- `handleItemChange` робив `[...items]` (shallow copy масиву) → `newItems[index][field] = value` мутував оригінальний об'єкт, що відображалось у всіх рядках
**Виправлення**: `{ ...emptyItem }` при додаванні + `items.map((item, i) => i === index ? { ...item, [field]: value } : item)`. Виправлено в обох діалогах.

---

#### ✅ BUG: ТОП-5 Постачальників — неправильний масштаб осі (commit `5c45d7a`)

**Причина**: та сама що і з графіком закупівель — `total_purchases` від API є Decimal-рядком, Recharts не міг порахувати домен (показував макс. 5000 замість реальних значень).
**Виправлення**: `total_purchases: parseFloat(d.total_purchases) || 0` при обробці `topSuppliers` + `domain={[0, 'dataMax']}` на XAxis BarChart.

---

#### Пріоритет 1 — Імпорт з Excel
**Що потрібно:**
- [ ] Backend: `POST /api/v1/products/import` — читає xlsx, створює товари пакетно
- [ ] Backend: `POST /api/v1/suppliers/import` — те саме для постачальників
- [ ] Frontend: кнопка "Імпорт Excel" + drag-and-drop + preview перед збереженням
- [ ] Шаблон Excel для завантаження (правильні колонки)

**Складність**: середня | **Цінність**: висока (початкове завантаження даних клієнта)

---

#### Пріоритет 2 — Telegram бот з кнопками
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

**Останнє оновлення**: 2026-03-09 (сесія 18 — Audit Trail UI, Dashboard electricity, MoM chart)
**Версія**: 0.9.1
**Статус**: ✅ Production Live | CI/CD ✅ | Моніторинг ✅
