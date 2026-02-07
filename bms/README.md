# BudgetPro (BMS) - Budget Management System

![Backend Build](https://github.com/mrccdrc27/MAP-SYSTEM/actions/workflows/ci-cd.yml/badge.svg)

**BudgetPro** is the financial backbone of the MAP Active ecosystem. It handles budget planning, expense tracking, forecasting, and integrates with external operational systems (TTS, AMS, HDS).

---

## 🔗 Live System Access

**Note:** The system runs on Render's Free Tier. **Please allow 50–90 seconds** for the backend to wake up upon first access.

| Component | URL | Description |
| :--- | :--- | :--- |
| **Frontend UI** | [https://bms.mapactive.tech](https://bms.mapactive.tech) | Dashboard for Finance & Ops users. |
| **API Root** | [https://api.bms.mapactive.tech](https://api.bms.mapactive.tech) | REST API Entry point. |
| **API Docs (Swagger)**| [https://api.bms.mapactive.tech/api/docs/](https://api.bms.mapactive.tech/api/docs/) | Interactive API testing & documentation. |
| **Health Check** | [https://api.bms.mapactive.tech/health/](https://api.bms.mapactive.tech/health/) | System status (DB connection check). |

---

## 🛠️ Architecture Overview

The system is built on a microservices-inspired architecture:

*   **Backend:** Django Rest Framework (Python 3.11)
*   **Frontend:** React + Vite (Node 18)
*   **Database:** PostgreSQL (NeonDB / Local Docker)
*   **Authentication:** 
    *   **Users:** Centralized SSO (JWT) via `auth_service`.
    *   **Services:** API Key Authentication (`X-API-Key` header).

---

## 🚀 Local Development Setup

### Prerequisites
*   Docker Desktop installed.
*   Git installed.

### 1. Clone & Configure
```bash
git clone https://github.com/mrccdrc27/MAP-SYSTEM
cd bms

# Create Environment Files
cp budget_service/capstone/.env.example budget_service/capstone/.env
cp frontend/.env.example frontend/.env
```

### 2. Run with Docker Compose
This builds the Backend, Frontend, and Redis (for caching/Celery) containers.

```bash
docker-compose up --build
```

*   **Frontend:** http://localhost:5173
*   **Backend:** http://localhost:8000

### 3. Data Seeding
The system includes a controlled seeder that generates realistic demo data (Fiscal Years, Departments, Expenses).
*   **Automatic:** Runs via `entrypoint.sh` if `SEED_DEMO_DATA=true` in `.env`.
*   **Manual:**
    ```bash
    docker-compose exec web python manage.py controlled_seeder
    ```

---

## 🔐 Authentication & Integration Guide

BMS supports two distinct authentication methods.

### 1. User Authentication (Frontend)
Users (Finance Heads, Operators) authenticate via the **Centralized Auth Service**.
*   **Protocol:** JWT (JSON Web Tokens).
*   **Header:** `Authorization: Bearer <access_token>`
*   **Flow:** Frontend redirects to `login.ticketing.mapactive.tech`, receives token, and stores it in context.

### 2. Service Integration (External Systems)
External systems (TTS, AMS, HDS) must use API Keys to push data into BMS.

*   **Header:** `X-API-Key: <your-service-key>`
*   **Valid API Keys:** Configured in `settings.SERVICE_API_KEYS`.

#### Key Integration Endpoints

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/external-budget-proposals/` | Submit a budget request from TTS. | ✅ API Key |
| `POST` | `/api/external-expenses/` | Log an expense from AMS/HDS. | ✅ API Key |
| `GET` | `/api/external-references/departments/` | Fetch valid departments. | ✅ API Key |
| `GET` | `/api/external-references/accounts/` | Fetch valid GL accounts. | ✅ API Key |

> **Developer Note:** You may use [Swagger UI](https://api.bms.mapactive.tech/api/docs/) to test these endpoints.

---

## 🧪 Test Credentials

Use these accounts to verify Role-Based Access Control (RBAC). Other credentials exists in auth\users\management\commands\seed_bms.py.

| Role | Email | Password | Scope |
| :--- | :--- | :--- | :--- |
| **Finance Head** | `finance_head@example.com` | *See Seeder* | Full access (Approvals, Allocations, Reports). |
| **Ops User** | `ops_user@example.com` | *See Seeder* | Department-scoped access (Requests, Tracking). |
| **Admin** | `admin@example.com` | *See Seeder* | Django Admin & System Config. |

---


### Manual Deployment Commands (Render Shell)
If you need to manually trigger maintenance tasks on the live server:

```bash
# Apply Database Migrations
python manage.py migrate

# Generate Forecast Data (Cold Start)
python manage.py generate_forecasts

# Update Static Files
python manage.py collectstatic --noinput
```
