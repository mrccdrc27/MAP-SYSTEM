# Local Orchestration Guide

This guide explains how to run the entire application stack locally on Windows without Docker for the services (except RabbitMQ), using SQLite databases.

## Prerequisites

1.  **Python 3.10+**: Installed and added to PATH.
2.  **Node.js 16+**: Installed and added to PATH.
3.  **Docker Desktop**: Running (required only for RabbitMQ).
4.  **Virtual Environment**: A virtual environment at `./venv` is assumed.
    *   If you haven't created it: `python -m venv venv`
    *   Install dependencies: `.\venv\Scripts\activate; pip install -r requirements.txt` (and for each service if they have separate requirements).

## VSCode Terminal Profiles

We have configured **VSCode Terminal Profiles** to make starting services easy.

1.  Open the **Terminal** dropdown (Ctrl+Shift+` or click the `+` arrow).
2.  You will see a list of profiles numbered 1-9 (e.g., `1. RabbitMQ`, `2. Auth Service`, etc.).
3.  Click on a profile to open a new terminal tab and automatically start that service.

**Recommended Startup Order:**

1.  **1. RabbitMQ** (Wait for it to fully start)
2.  **2. Auth Service**
3.  **3. Ticket Service**
4.  **4. Workflow API**
5.  **5. Workflow Worker**
6.  **6. Notification Service**
7.  **7. Notification Worker**
8.  **8. Messaging Service**
9.  **9. Frontend**

## Service Ports (Localhost)

| Service | Port | Database (SQLite) |
| :--- | :--- | :--- |
| **RabbitMQ** | 5672 (15672 UI) | N/A |
| **Auth Service** | 8003 | `auth/db.sqlite3` |
| **Ticket Service** | 8004 | `ticket_service/db.sqlite3` |
| **Workflow API** | 8002 | `workflow_api/db.sqlite3` |
| **Messaging** | 8005 | `messaging/db.sqlite3` |
| **Notification** | 8006 | `notification_service/db.sqlite3` |
| **Frontend** | 1000 | N/A |

## Troubleshooting

*   **Missing Modules:** If a service fails with "Module not found", ensure you have installed its requirements:
    ```powershell
    .\venv\Scripts\activate
    pip install -r auth/requirements.txt
    pip install -r ticket_service/requirements.txt
    # ... etc for all services
    ```
*   **Database Migrations:** If this is your first run with SQLite, you might need to run migrations:
    ```powershell
    # Example for Auth Service
    cd auth
    python manage.py migrate
    ```
    Repeat for each Django service.
*   **RabbitMQ Connection:** If workers fail to connect, ensure the RabbitMQ container is running (`docker ps`).

## Scripts

The automation relies on PowerShell scripts located in `./Scripts/start_*.ps1`. You can run these manually if you prefer not to use VSCode profiles.
