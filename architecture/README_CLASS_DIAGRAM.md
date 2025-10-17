Class diagram for Ticket-Tracking-System (backend)

This folder contains a PlantUML class diagram representing the Django models and their relationships for the backend services (user_service, ticket_service, workflow_api).

Files
- `class_diagram_backend.puml` - PlantUML source for the class diagram.

Render options

1) VS Code (recommended)
- Install the "PlantUML" extension by jebbs or "PlantUML Preview".
- Open `class_diagram_backend.puml` and use the preview to render.

2) Command line with PlantUML jar
- Install Java (JRE 8+).
- Download PlantUML jar from https://plantuml.com/download
- Run:

  java -jar plantuml.jar class_diagram_backend.puml

This will produce a PNG (and SVG if configured) in the same directory.

Notes & caveats
- The diagram is a high-level map: some Django signals and Celery tasks are represented as notes rather than model associations.
- Two separate `Roles` models exist (in `user_service.role` and `workflow_api.role`). They appear similar but are in different apps; examine which one is authoritative for your usage.
