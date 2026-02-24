# Agro ERP — Система обліку для агробізнесу

Система обліку витратних матеріалів та запчастин. Версія **0.7.0**.

**Стек:** Python 3.12 + FastAPI · React 18 + MUI · SQLite (локально) / PostgreSQL (production)
**Деплой:** Render (backend) · Vercel (frontend) · Neon.tech (PostgreSQL)

---

## Функціонал

| Модуль | Статус |
|---|---|
| Аутентифікація (JWT + refresh token) | ✅ |
| Ролі: admin, manager, warehouse_manager, accountant, department_head | ✅ |
| Постачальники | ✅ |
| Товари / Матеріали (категорії, одиниці виміру) | ✅ |
| Закупівлі (draft → підтвердження → оприбуткування) | ✅ |
| Переміщення між підрозділами | ✅ |
| Списання (з підтвердженням адміном) | ✅ |
| Залишки на складах | ✅ |
| Інвентаризація (акти + коригування залишків) | ✅ |
| Звіти × 5 типів + Excel + PDF | ✅ |
| Dashboard (KPI, графіки, low-stock) | ✅ |
| Telegram сповіщення | ✅ |
| Транспорт (облік техніки) | ✅ |
| Пагінація всіх таблиць | ✅ |

**Підрозділи (13):** Основний склад, Склад готової продукції, Млин, Елеватор,
Цех паливної гранули, Адміністрація, Вагова, Охорона, Лабораторія,
Бухгалтерія, Прибирання, Офіс, Транспорт.

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
│   │   ├── api/v1/          # 13 роутерів (auth, products, purchases, ...)
│   │   ├── models/          # 13 SQLAlchemy моделей
│   │   ├── schemas/         # Pydantic схеми
│   │   ├── services/        # Telegram notifications
│   │   └── core/            # JWT, bcrypt
│   ├── scripts/             # seed_data.py, add_departments.py, ...
│   ├── render.yaml          # Render.com конфіг
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── pages/           # 11 сторінок
│   │   ├── components/      # Діалоги, layout
│   │   ├── api/             # Axios клієнти
│   │   ├── context/         # AuthContext
│   │   └── hooks/           # usePagination
│   └── vercel.json          # Vercel SPA routing
├── .github/workflows/       # CI/CD (GitHub Actions)
├── .gitignore
└── README.md
```

---

## Деплой (Render + Vercel + Neon)

### Порядок дій

1. **Neon.tech** → Create project → скопіювати `DATABASE_URL`
2. **Render** → New Web Service → підключити GitHub → вибрати `backend/` → заповнити env vars:

   | Variable | Де взяти |
   |---|---|
   | `DATABASE_URL` | Neon.tech connection string |
   | `SECRET_KEY` | `openssl rand -hex 32` |
   | `TELEGRAM_BOT_TOKEN` | @BotFather |
   | `TELEGRAM_CHAT_ID` | з getUpdates |
   | `ALLOWED_ORIGINS` | URL Vercel (після п.3) |
   | `DEBUG` | `False` |

3. **Vercel** → New Project → підключити GitHub → вибрати `frontend/` → env var:
   - `VITE_API_URL` = `https://your-backend.onrender.com/api/v1`

4. Повернутись на Render → оновити `ALLOWED_ORIGINS` = URL Vercel
5. Після першого деплою: прибрати `python scripts/seed_data.py &&` з startCommand у `render.yaml`

### GitHub Actions secrets (Settings → Secrets → Actions)

```
RENDER_DEPLOY_HOOK_URL    # Render → Settings → Deploy Hooks
VERCEL_TOKEN              # vercel.com → Account Settings → Tokens
VERCEL_ORG_ID             # vercel.com → team/personal settings
VERCEL_PROJECT_ID         # vercel.com → project settings
```

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

**Ліцензія:** внутрішнє використання
