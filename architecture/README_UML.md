UML Diagrams - Ticket Tracking System

This folder contains PlantUML diagrams for Use Case, Sequence, and Class diagrams for key flows and models.

Files included:
- `use_cases.puml` - System-level use cases: login, create/update tickets, run workflow, receive notifications, manage users.
- `sequence_ticket_creation.puml` - Sequence diagram for ticket creation -> workflow enqueue -> background processing.
- `sequence_notification.puml` - Sequence diagram for workflow-triggered notification delivery via Celery.
- `class_diagram_models.puml` - Class diagram with simplified domain models: User, Role, Ticket, Attachment, Workflow, Step.

How to render:
1. Install PlantUML and Graphviz or use the online PlantUML server (https://www.plantuml.com/plantuml).
2. From the project root run (requires PlantUML installed):

```bash
plantuml architecture/use_cases.puml
plantuml architecture/sequence_ticket_creation.puml
plantuml architecture/sequence_notification.puml
plantuml architecture/class_diagram_models.puml
```

Explanations & assumptions:
- Use Case diagrams show primary actors (User, System scheduler) and main interactions.
- Sequence diagrams use a simplified flow based on repo code and docker-compose:
  - Ticket creation: Frontend -> Ticket Service -> Postgres and then a Celery task is enqueued to RabbitMQ. A Celery worker consumes the task and calls the Workflow API which updates the DB.
  - Notification: Workflow enqueues a notification task; Celery worker fetches user details from User Service and logs or delivers the notification according to user preferences.
- Class diagram shows simplified fields and relationships. The real model classes in the repo may contain additional fields and methods; this diagram focuses on core relationships and data shapes.

Next steps I can do for you:
- Render PNG/SVG images for all PlantUML files and add them to `architecture/`.
- Generate more detailed class diagrams for each Django app by parsing the models automatically.
- Produce sequence diagrams for other flows (ticket assignment, escalation, login flow).

If you'd like I can render the diagrams now and commit the images into the repo — tell me which formats you prefer (PNG/SVG).