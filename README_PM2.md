# PM2 Process Manager Setup

This project uses [PM2](https://pm2.keymetrics.io/) to manage the development services. This allows you to start, stop, and monitor all services with simple commands.

## Prerequisites

1.  **Node.js & NPM**: Ensure Node.js is installed.
2.  **PM2**: Install PM2 globally if you haven't already:
    ```bash
    npm install pm2 -g
    ```
3.  **RabbitMQ**: Ensure RabbitMQ is running. You can start it using Docker:
    ```bash
    docker run --rm --name rabbitmq -p 5672:5672 -p 15672:15672 -e RABBITMQ_DEFAULT_USER=admin -e RABBITMQ_DEFAULT_PASS=admin -e RABBITMQ_DEFAULT_VHOST=/ rabbitmq:3.13-management-alpine
    ```

## Starting Services

To start all configured services (Auth, Workflow, Notification, Messaging, Helpdesk, Frontends):

```bash
pm2 start ecosystem.config.js
```

**Note:** The `ticket-service` is intentionally excluded from this setup.

## Managing Processes

-   **List all running processes:**
    ```bash
    pm2 list
    ```

-   **View logs (stream all logs):**
    ```bash
    pm2 logs
    ```

-   **View logs for a specific app:**
    ```bash
    pm2 logs workflow-api
    ```

-   **Restart all services:**
    ```bash
    pm2 restart all
    ```

-   **Stop all services:**
    ```bash
    pm2 stop all
    ```

-   **Delete all processes:**
    ```bash
    pm2 delete all
    ```

## Configuration Details

The configuration is located in `ecosystem.config.js`. It sets up the following:

-   **Python Services**: Uses the virtual environment at `venv/Scripts/python.exe`.
-   **Celery Workers**: Runs using `venv/Scripts/celery.exe`.
-   **Frontend Apps**: Runs using `npm run dev`.
-   **Environment Variables**: Injected directly into the process environment as defined in the original PowerShell scripts.
