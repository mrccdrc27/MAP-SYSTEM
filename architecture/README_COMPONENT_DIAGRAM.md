Component Diagram - Ticket Tracking System

This folder contains a high-level component diagram for the Ticket Tracking System and notes about components and interactions.

Files:
- component_diagram.puml - PlantUML source for the component diagram.

How to render:
1. Install PlantUML and Graphviz on your machine, or use an online PlantUML renderer (https://www.plantuml.com/plantuml).
2. From the project root, run (requires plantuml installed):
   plantuml architecture/component_diagram.puml

Key Components (derived from the repository):
- Frontend (React + Vite) - exposes UI on port 1000 and calls backend APIs.
- User Service (Django) - handles authentication/JWT, user management, runs on port 8001.
- Ticket Service (Django) - manages tickets, attachments, runs on 8004.
- Workflow API (Django) - workflow automation and orchestration, runs on 8002.
- RabbitMQ - AMQP message broker used by Celery for async tasks.
- Celery Workers - background processors started for user_service and workflow_api.
- PostgreSQL - single DB instance with multiple logical DBs for each service in production.
- Media Volume - shared Docker volume for uploaded files and media.

Interactions (high-level):
- Frontend -> Backend services: HTTP REST (JSON)
- Backend services -> PostgreSQL: SQL (psycopg2/django)
- Backend services -> RabbitMQ: AMQP (Celery tasks serialized as JSON)
- Celery Workers consume tasks from RabbitMQ and interact with DB and Media as needed.

Assumptions & Notes:
- The docker-compose.yml shows a single Postgres instance with logical DBs per service.
- Services expose internal Docker hostnames (e.g., `user-service`, `ticket_service`, `workflow_api`) and ports.
- Celery uses JSON task serialization and queues configured in Django settings.
- JWT is used for auth between Frontend and services; internal service-to-service auth is done via service URLs (no mTLS/API gateway present).

If you want, I can:
- Export a PNG/SVG of the diagram and add it to this folder.
- Produce a more detailed deployment diagram showing Docker networks, volumes, and exact queue names.
