# BudgetPro (BMS) - Budget Management System

This is the **Budget Management System (BMS)** for MAP Active Philippines. It handles budget planning, expense tracking, and financial forecasting.

It is built with:
- **Backend:** Django + PostgreSQL
- **Frontend:** React + Vite
- **Auth:** Centralized Authentication Service (Django)

---

## 🚀 Getting Started (Local Development)

### Prerequisites
- **Docker Desktop** installed and running.
- **Git** installed.

### 1. Clone the Repository
```bash
git clone https://github.com/mrccdrc27/MAP-SYSTEM
cd bms
```

### 2. Configure Environment Variables
We use `.env` files for configuration. Example files are provided.

**Step 2a: Backend Config**
Copy the example file in `budget_service/capstone/`:
```bash
cp budget_service/capstone/.env.example budget_service/capstone/.env
```

**Step 2b: Frontend Config**
Copy the example file in `frontend/`:
```bash
cp frontend/.env.example frontend/.env
```

**Step 2c: Auth Service Config**
Copy the example file in `../auth/` (root auth folder):
```bash
cp ../auth/.env.example ../auth/.env
```

### 3. Run with Docker Compose
This command builds all services (Backend, Frontend, Auth, Databases) and starts them up.

```bash
docker-compose up --build
```

**Access Points:**
- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:8000
- **Auth Service:** http://localhost:8001

### 4. Data Seeding (Automatic)
The `entrypoint.sh` script automatically runs migrations and seeds data on container startup.
- If you need to **reset** the database entirely, run:
  ```bash
  docker-compose down -v
  docker-compose up --build
  ```
### 5. Frontend
- cd bms/frontend
- npm run dev
- Go to  http://localhost:5173/

---

## 🔑 Test Credentials

Use these accounts to test different roles in the system.

| Role | Email | Password | Access Level |
| :--- | :--- | :--- | :--- |
| **Finance Head** | `finance_head@example.com` | `Password123!` | Full Access (Budgets, Reports, Approvals) |
| **Ops User** | `ops_user@example.com` | `password123` | Limited Access (Expense Tracking, Proposals) |
| **Admin** | `admin@example.com` | `Password123!` | System Admin Access |

---

## ☁️ Deployment (Render)

### Build Command
The build command ensures the database is migrated and fully seeded with the latest logic.

```bash
pip install -r requirements.txt && python manage.py migrate --noinput && python manage.py cleanup_categories && python manage.py controlled_seeder && python manage.py fix_missing_allocations && python manage.py seed_budget_caps && python manage.py generate_forecasts && python manage.py collectstatic --noinput
```

### Start Command
```bash
gunicorn capstone.wsgi:application
```

---

## 📚 API Documentation

### Authentication
- The system uses **Centralized Authentication**.
- All requests must include the `Authorization: Bearer <token>` header.
- The Frontend handles token management automatically via `AuthContext`.

### Key Endpoints
-



### Workflows:

- MAP-SYSTEM/.github/workflows/basic-ci.yml
- build-and-test.yml
