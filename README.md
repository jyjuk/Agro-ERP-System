# Agro ERP — Система обліку для агробізнесу

Система обліку витратних матеріалів та запчастин. Версія **0.9.0**.

**Стек:** Python 3.12 + FastAPI · React 18 + MUI · SQLite (локально) / PostgreSQL (production)
**Деплой:** Render (backend) · Vercel (frontend) · Neon.tech (PostgreSQL)
**CI/CD:** GitHub Actions → автодеплой при кожному push до `main`

---

## Функціонал

| Модуль | Статус |
|---|---|
| Аутентифікація (JWT + refresh token + auto-refresh) | ✅ |
| RBAC: admin, manager, warehouse_manager, accountant, department_head | ✅ |
| Постачальники (CRUD + автокод SUP-XXXX) | ✅ |
| Товари / Матеріали (категорії + одиниці виміру на льоту) | ✅ |
| Закупівлі (draft → підтвердження → оприбуткування) | ✅ |
| Переміщення між підрозділами | ✅ |
| Списання (з підтвердженням адміном) | ✅ |
| Залишки на складах | ✅ |
| Інвентаризація (акти INV-YYYYMMDD-NNN + коригування залишків) | ✅ |
| Звіти × 5 типів + Excel export + PDF/Print | ✅ |
| Dashboard (KPI-картки, графіки, low-stock, топ-5 постачальників) | ✅ |
| Аналітика (динаміка цін, витрати по постачальниках, ABC-аналіз) | ✅ |
| Telegram сповіщення + щотижневий scheduler (понеділок 9:00 + остання п'ятниця) | ✅ |
| Транспорт (облік техніки + запчастини по кожному ТЗ) | ✅ |
| Пагінація всіх таблиць | ✅ |
| Searchable Autocomplete у всіх діалогах | ✅ |
| Електроенергія (облік по місяцях + аналітика + дизельний генератор) | ✅ |
| Звіт списань по підрозділах (новий таб "Списання" у звітах) | ✅ |

**Підрозділи (13):** Основний склад, Склад готової продукції, Млин, Елеватор,
Цех паливної гранули, Адміністрація, Вагова, Охорона, Лабораторія,
Бухгалтерія, Прибирання, Офіс, Транспорт.

---

## Production

| Сервіс | URL |
|---|---|
| Frontend | https://agro-erp-system.vercel.app |
| Backend | https://agro-erp-backend.onrender.com |
| API Docs | https://agro-erp-backend.onrender.com/docs |
| GitHub | https://github.com/jyjuk/Agro-ERP-System |

---

## Локальний запуск

### 1. Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # Linux/Mac
pip install -r requirements.txt
python scripts/seed_data.py    # Початкові дані (один раз)
uvicorn app.main:app --reload --port 8000
```

### 2. Frontend

```bash
cd frontend
npm install
npm start                      # http://localhost:3000
```

### 3. Налаштування `.env`

```bash
cp backend/.env.example backend/.env
# Заповніть backend/.env своїми значеннями
```

**Логін за замовчуванням:** `admin` / `admin`
**⚠️ Обов'язково змініть пароль після першого входу!**

---

## Структура проекту

```
elev/
├── backend/
│   ├── app/
│   │   ├── api/v1/          # 16 роутерів (auth, products, purchases, reports, electricity, ...)
│   │   ├── models/          # 15 SQLAlchemy моделей
│   │   ├── schemas/         # Pydantic схеми (включно з аналітикою)
│   │   ├── services/        # Telegram notifications + APScheduler
│   │   └── core/            # JWT, bcrypt
│   ├── scripts/             # seed_data.py, міграції
│   ├── render.yaml          # Render.com конфіг
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── pages/           # 15 сторінок
│   │   ├── components/      # Діалоги, layout
│   │   ├── api/             # Axios клієнти
│   │   ├── context/         # AuthContext
│   │   └── hooks/           # usePagination
│   └── vercel.json          # Vercel SPA routing
├── .github/workflows/       # CI/CD (GitHub Actions)
├── .gitignore
├── PROJECT_STATUS.md        # Детальна документація проекту
└── README.md
```

### Backend — API роутери

| Роутер | Endpoints |
|---|---|
| `auth.py` | login, logout, /me, /refresh |
| `users.py` | CRUD користувачів + GET /roles |
| `suppliers.py` | CRUD + автокод SUP-XXXX |
| `products.py` | CRUD + категорії + одиниці виміру |
| `departments.py` | GET список підрозділів |
| `purchases.py` | CRUD + confirm + receive |
| `transfers.py` | CRUD + confirm |
| `writeoffs.py` | CRUD + approve |
| `inventory.py` | залишки + low-stock |
| `inventory_counts.py` | CRUD актів + approve + коригування |
| `reports.py` | 5 типів звітів + dashboard + 3 аналітичних endpoint + writeoffs |
| `notifications.py` | Telegram endpoints + manual low-stock trigger |
| `transport.py` | CRUD транспорту + auto-department |
| `electricity.py` | GET /{month}, POST /save (admin), GET / (список місяців) |
| `audit.py` | AuditLog (модель) |

### Frontend — сторінки

| Сторінка | Шлях |
|---|---|
| Dashboard | `/` |
| Постачальники | `/suppliers` |
| Товари/Матеріали | `/products` |
| Закупівлі | `/purchases` |
| Переміщення | `/transfers` |
| Списання | `/writeoffs` |
| Залишки | `/inventory` |
| Інвентаризація | `/inventory-counts` |
| Звіти | `/reports` |
| Аналітика | `/analytics` |
| Транспорт | `/transport` |
| Електроенергія | `/electricity` |
| Користувачі | `/users` |
| Логін | `/login` |

---

## Деплой (Render + Vercel + Neon)

### Порядок дій

1. **Neon.tech** → Create project → скопіювати `DATABASE_URL`
2. **Render** → New Web Service → підключити GitHub → `backend/` → env vars:

   | Variable | Де взяти |
   |---|---|
   | `DATABASE_URL` | Neon.tech connection string |
   | `SECRET_KEY` | `openssl rand -hex 32` |
   | `TELEGRAM_BOT_TOKEN` | @BotFather |
   | `TELEGRAM_CHAT_ID` | з getUpdates |
   | `ALLOWED_ORIGINS` | URL Vercel (після п.3) |
   | `DEBUG` | `False` |

3. **Vercel** → New Project → підключити GitHub → `frontend/` → env var:
   - `VITE_API_URL` = `https://your-backend.onrender.com/api/v1`

4. Повернутись на Render → оновити `ALLOWED_ORIGINS` = URL Vercel
5. Після першого деплою: прибрати `python scripts/seed_data.py &&` з startCommand у `render.yaml`

### GitHub Actions secrets (Settings → Secrets → Actions)

```
RENDER_DEPLOY_HOOK_URL    # Render → Settings → Deploy Hooks
VERCEL_TOKEN              # vercel.com → Account Settings → Tokens
VERCEL_ORG_ID             # vercel.com → team/personal settings
VERCEL_PROJECT_ID         # vercel.com → project settings
VITE_API_URL              # URL бекенду для фронтенду
```

---

## БД — таблиці

`users`, `roles`, `departments`, `suppliers`, `products`, `product_categories`, `units`,
`purchases`, `purchase_items`, `inventory`, `inventory_transactions`,
`transfers`, `transfer_items`, `writeoffs`, `writeoff_items`,
`inventory_counts`, `inventory_count_items`, `audit_log`, `transport_units`,
`electricity_records`

> `transport_units.department_id` → FK на `departments.id` (кожен ТЗ має свій підрозділ)
> `electricity_records.gen_start/gen_end` — nullable (генератор не завжди працює)

---

## Ключові архітектурні рішення

1. **Auto-refresh token**: `isRefreshing` flag + `failedQueue` — усі concurrent 401 стають у чергу і повторюються після рефрешу
2. **Автокоди**: `SUP-XXXX`, `PROD-XXXX` — генеруються автоматично, read-only
3. **Основний склад**: всі закупівлі → Основний склад → переміщення по підрозділах
4. **Транспорт = підрозділ**: при створенні ТЗ автоматично створюється `Department` → переміщення запчастин на ТЗ через стандартний модуль переміщень
5. **PostgreSQL switching**: `is_sqlite` flag в `database.py`, автоперемикання за `DATABASE_URL`
6. **Searchable Autocomplete**: MUI `<Autocomplete>` у всіх діалогах для списків постачальників, товарів, підрозділів

---

## Резервні копії

**SQLite (локально):**
```batch
copy C:\elev\data\agro_erp.db D:\Backups\agro_erp_%date%.db
```

**PostgreSQL (production):**
```bash
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql
```

---

## Плани розвитку

| Пріоритет | Функція | Опис |
|---|---|---|
| 1 | Audit Trail UI | Сторінка "Журнал змін" — хто і коли підтвердив, змінив; `GET /api/v1/audit/` |
| 2 | Імпорт з Excel | Масовий імпорт товарів і постачальників з .xlsx |
| 3 | Telegram бот | ConversationHandler: Перемістити / Списати / Залишки з телефону |

---

**Ліцензія:** внутрішнє використання
