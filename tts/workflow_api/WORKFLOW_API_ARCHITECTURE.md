# Workflow API System Architecture

## 1. Executive Summary

The `workflow_api` service is the central orchestration engine of the Ticket Tracking System. It manages the lifecycle of tickets through configurable workflows, handles task assignments, enforces Service Level Agreements (SLAs), and provides comprehensive auditing and reporting capabilities. It is built using **Django** and **Django REST Framework (DRF)**, utilizing **Celery** for asynchronous processing and **PostgreSQL** for persistence.

## 2. Technology Stack

*   **Framework**: Django 5.2, Django REST Framework 3.16
*   **Database**: PostgreSQL (via `dj_database_url`)
*   **Asynchronous Processing**: Celery 5.5 with RabbitMQ (AMQP) broker
*   **Authentication**: JWT (JSON Web Tokens) via Cookies, synchronized with the Auth Service.
*   **Containerization**: Docker (Multi-stage builds for production)
*   **Documentation**: OpenAPI/Swagger via `drf-spectacular`

## 3. Core Architecture & Components

The system is modularized into several Django apps, each responsible for a specific domain.

### 3.1. Tickets App (`tickets`)
*   **Purpose**: Acts as the ingestion point for tickets from external services (e.g., Helpdesk/Ticket Service).
*   **Key Models**:
    *   `WorkflowTicket` (alias `TicketSnapshot`): Stores a JSON snapshot of the ticket data (`ticket_data`) to decouple workflow logic from upstream schema changes. It maintains local state like `status`, `priority`, and `is_task_allocated`.
    *   `RoundRobin`: Manages state for round-robin user assignment algorithms.
*   **Key Flows**:
    *   **Ingestion**: `receive_ticket` (Celery task) receives raw ticket data, creates a snapshot, and triggers task creation.
    *   **Task Allocation**: `create_task_for_ticket` identifies the appropriate workflow based on Department and Category, creating a `Task` instance.

### 3.2. Workflow App (`workflow`)
*   **Purpose**: Defines the blueprint for how tickets are processed.
*   **Key Models**:
    *   `Workflows`: Defines metadata (Name, Department, Category, SLAs) and configuration.
    *   `WorkflowVersion`: Stores an immutable JSON snapshot (`definition`) of the workflow graph (nodes/edges) at the time of initialization. This ensures active tasks follow the logic that existed when they started, even if the workflow is edited later.
*   **Logic**:
    *   **Versioning**: When a workflow is "initialized", a new `WorkflowVersion` is created.
    *   **Visualizer**: Provides graph data (Nodes/Edges) for frontend visualization.

### 3.3. Step App (`step`)
*   **Purpose**: Represents individual states (nodes) and transitions (edges) within a workflow.
*   **Key Models**:
    *   `Steps`: Represents a distinct stage (e.g., "Triage", "Approval"). Links to a `Role` responsible for that step.
    *   `StepTransition`: Defines valid paths between steps.
*   **Features**:
    *   **Escalation**: Steps define an `escalate_to` role for handling SLA breaches or manual escalations.
    *   **Design**: Stores frontend coordinates (`x`, `y`) for graph rendering.

### 3.4. Task App (`task`)
*   **Purpose**: Manages the runtime execution of a workflow for a specific ticket.
*   **Key Models**:
    *   `Task`: The instance of a workflow execution. Tracks `current_step`, `status`, and `workflow_version`.
    *   `TaskItem`: Represents a specific assignment of a task to a user. A single `Task` can have multiple `TaskItem`s (e.g., if re-assigned or escalated).
    *   `TaskItemHistory`: Audit trail of status changes for assignments (e.g., Assigned -> In Progress -> Resolved).
*   **Key Mechanisms**:
    *   **Transitions**: The `TaskTransitionView` handles logic for moving a task from one step to another, validating the transition against the workflow definition.
    *   **Assignment**: Uses a Round-Robin algorithm (`task.utils.assignment`) to distribute work among users with the required Role.
    *   **SLA Calculation**: Calculates target resolution times dynamically based on Ticket Priority and Step Weights (`task.utils.target_resolution`).

### 3.5. Role App (`role`)
*   **Purpose**: Manages user roles and permissions locally, synchronized from the central Auth Service.
*   **Key Models**:
    *   `Roles`: System roles (e.g., "Admin", "IT Support").
    *   `RoleUsers`: Maps users to roles locally.
*   **Synchronization**:
    *   Consumes Celery messages (`tts.role.sync`, `tts.user_system_role.sync`) to keep local role data in sync with the Auth Service, ensuring the workflow engine always has up-to-date user lists for assignments.

### 3.6. Audit App (`audit`)
*   **Purpose**: Provides a comprehensive, immutable record of all system actions.
*   **Features**:
    *   **Decorators**: `@audit_action` and `@audit_model_changes` automatically log views and model updates.
    *   **Storage**: Records Actor, Action, Target Object, and detailed JSON changes (Old Value vs. New Value).

### 3.7. Reporting App (`reporting`)
*   **Purpose**: Analytics and Business Intelligence.
*   **Features**:
    *   Provides endpoints for KPI Dashboards, SLA Compliance, Team Performance, and Workflow bottlenecks.
    *   Aggregates data from `Task`, `TaskItem`, and `WorkflowTicket` models.

## 4. Data Flow & Lifecycle

### 4.1. Ticket Ingestion & Initialization
1.  **Trigger**: External service pushes ticket data to RabbitMQ queue `TICKET_TASKS_PRODUCTION`.
2.  **Ingestion**: `tickets.tasks.receive_ticket` consumes the message and creates/updates a `WorkflowTicket`.
3.  **Allocation**: If new, `tickets.tasks.create_task_for_ticket` is called:
    *   Matches Ticket Department/Category to a `Workflows` definition.
    *   Creates a `Task` linked to the active `WorkflowVersion`.
    *   Assigns a "Ticket Owner" (Ticket Coordinator) via round-robin.
    *   Identifies the first `Step` and assigns `TaskItem`(s) to users with the active Role for that step.

### 4.2. Task Execution
1.  **User Action**: A user (via Frontend) views "My Tasks".
2.  **Transition**: User completes work and triggers a transition (e.g., "Approve").
3.  **Processing**: `TaskTransitionView`:
    *   Validates the transition exists.
    *   Updates `Task.current_step`.
    *   Marks the previous `TaskItem` as "Resolved".
    *   Calculates the next step's Role.
    *   Creates new `TaskItem`(s) for users in the next role.
    *   Sends notifications (via `notification_service`).

### 4.3. Notifications
*   The system emits notifications for key events (Assignment, Escalation, SLA Warning, Completion) by sending tasks to the `INAPP_NOTIFICATION_QUEUE` managed by the Notification Service.

## 5. Security & Authentication

*   **JWT Auth**: Uses `JWTCookieAuthentication` to read `access_token` from HTTP-only cookies.
*   **Permissioning**:
    *   `SystemRolePermission`: Flexible permission class checking user roles against required system roles (e.g., `tts:Admin`).
    *   `MultiSystemPermission`: Validates access across different microservices contexts.

## 6. Integration Points

| Service | Interaction Type | Direction | Purpose |
| :--- | :--- | :--- | :--- |
| **Auth Service** | Celery (Consumer) | Inbound | Sync Roles and User-Role assignments to local DB. |
| **Auth Service** | HTTP (JWT) | Inbound | Authenticate incoming API requests. |
| **Notification Service** | Celery (Producer) | Outbound | Send emails and in-app alerts for task events. |
| **Ticket Service** | Celery (Consumer) | Inbound | Receive new tickets to start workflows. |
| **Ticket Service** | Celery (Producer) | Outbound | Update ticket status back to source (optional/legacy). |

## 7. Operational Workflows

*   **Seeding**: `seed_workflows2` management command initializes standard workflows (Asset Check-in/out, Budget Proposal) with a Triage -> Resolve -> Finalize structure.
*   **Weight Management**: Admin endpoints allow adjusting the "weight" (time allocation) of specific steps to dynamically adjust SLA targets.
