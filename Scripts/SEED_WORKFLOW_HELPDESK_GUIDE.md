# TTS & HDTS Seeding Script Guide

## Overview

The `seed_workflow_helpdesk.ps1` script is a "one-click" solution to set up the database state for the **Workflow API** and **Helpdesk (HDTS)** services. It handles the full chain of dependencies, starting from the Auth service (source of truth) down to the specific application data.

## 🚀 Quick Start

1.  **Open PowerShell** as Administrator (recommended, or standard user).
2.  **Ensure RabbitMQ is running** (required for connection checks, though syncs are handled locally by the script where possible).
    ```powershell
    # If using Docker
    docker run --rm --name rabbitmq -p 5672:5672 -p 15672:15672 -e RABBITMQ_DEFAULT_USER=admin -e RABBITMQ_DEFAULT_PASS=admin rabbitmq:3.13-management-alpine
    ```
3.  **Run the script**:
    ```powershell
    .\Scripts\seed_workflow_helpdesk.ps1
    ```

## 📋 What the Script Does

The script performs the following actions in order:

### 1. Environment & Dependencies
*   Checks if **RabbitMQ** is reachable on port 5672.
*   Activates the Python **Virtual Environment** (`venv`).
*   Installs/Updates Python `requirements.txt` for:
    *   Auth Service
    *   Workflow API
    *   Helpdesk

### 2. Auth Service (The Foundation)
*   Runs database migrations (`migrate`).
*   **Seeds Systems**: Creates definitions for TTS, HDTS, AMS, BMS.
*   **Seeds TTS Data**: Creates TTS-specific Roles and Users.
*   **Seeds HDTS Data**: Creates HDTS-specific Roles and Users.

### 3. Workflow API (TTS)
*   Runs database migrations.
*   **Seeds Roles**: Manually seeds roles locally (safe fallback if RabbitMQ sync workers aren't running).
*   **Seeds Workflows**: Creates the 5 core workflows (Asset Check In/Out, Budget, IT Support, etc.).

### 4. Helpdesk (HDTS)
*   Runs database migrations.
*   **Seeds Employees**: Generates 50 local employee records (safe fallback for sync).
*   **Seeds Tickets**: Generates 20 sample tickets assigned to those employees.

## ⚠️ Important Notes

*   **RabbitMQ**: While this script performs "local fallbacks" (seeding data directly in services instead of waiting for RabbitMQ sync), RabbitMQ should still be running because the Django applications try to connect to it on startup/seeding.
*   **Data Reset**: This script creates data. If you run it multiple times, it may fail on unique constraint violations depending on the specific seed command logic (most are idempotent or check for existence, but `seed_employees` typically adds more).
*   **Workers**: This script prepares the **Database**. For the application to function fully in real-time (syncing new users created in the UI), you still need to run the **Celery Workers** defined in the setup guide.

## 🛠️ Troubleshooting

**Error: "RabbitMQ is NOT reachable"**
*   Make sure your Docker container is running or your local RabbitMQ service is active.

**Error: "ModuleNotFoundError"**
*   The script attempts to install requirements, but if it fails, try manually activating the venv and installing:
    ```powershell
    .\venv\Scripts\Activate.ps1
    pip install -r auth\requirements.txt
    ```

**Error: "Database is locked" (SQLite)**
*   Ensure no other server processes (like `runserver`) are holding a lock on the `db.sqlite3` files while seeding. Stop running servers before seeding if you encounter this.
