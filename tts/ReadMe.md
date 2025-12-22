## **Ticket Tracking System**

### **Overview**
The Ticket Tracking System is a comprehensive platform designed to manage and streamline ticketing workflows for organizations. It integrates multiple services, including user authentication, ticket management, workflow automation, and frontend interfaces for both administrators and agents. The system is built using a microservices architecture, leveraging technologies like Django, React, RabbitMQ, PostgreSQL, and Celery for asynchronous task processing.

---

### **Key Features**
1. **Ticket Management**:
   - Create, update, and track tickets.
   - Categorize tickets by priority, status, and department.
   - Attach files and manage ticket metadata.

2. **Workflow Automation**:
   - Automate task allocation based on ticket attributes.
   - Track ticket progress through various workflow stages.

3. **User Roles**:
   - Admins: Manage tickets, assign tasks, and oversee workflows.
   - Agents: Handle assigned tickets and provide resolutions.

4. **Frontend Interface**:
   - React-based UI for both admin and agent dashboards.
   - Real-time updates and notifications.

5. **Backend Services**:
   - Django-based microservices for ticket, workflow, and user management.
   - RabbitMQ for message queuing and Celery for task processing.

6. **Database**:
   - PostgreSQL for storing ticket, workflow, and user data.

---

### **System Architecture**
The system is divided into the following services:
- **User Service**: Handles user authentication and role management.
- **Ticket Service**: Manages ticket creation, updates, and metadata.
- **Workflow API**: Automates workflows and tracks ticket progress.
- **Frontend**: Provides a user-friendly interface for admins and agents.
- **RabbitMQ**: Facilitates communication between services.
- **PostgreSQL**: Centralized database for all services.

---

### **Technologies Used**
- **Backend**: Django, Django REST Framework
- **Frontend**: React, Vite
- **Message Queue**: RabbitMQ
- **Database**: PostgreSQL
- **Task Queue**: Celery
- **Containerization**: Docker, Docker Compose

---

### **Setup Instructions**
1. **Clone the Repository**:
   ```bash
   git clone <repository-url>
   cd Ticket-Tracking-System
   ```

2. **Run the Docker Starter Script**:
   ```bash
   bash ./Scripts/docker.sh
   ```

3. **Access the Services**:
   - Frontend: [http://localhost:1000](http://localhost:1000)
   - Admin Panel: [http://localhost:8001/admin](http://localhost:8001/admin)
   - RabbitMQ Management: [http://localhost:15672](http://localhost:15672)

4. **Run Migrations**:
   ```bash
   docker exec -it <service_name> python manage.py migrate
   ```

5. **Seed Data (Optional)**:
   ```bash
   docker exec -it <service_name> python manage.py seed_tickets
   ```

---

### **Template for Documentation**

#### **1. Introduction**
Provide a brief overview of the system, its purpose, and its key features.

#### **2. System Requirements**
List the prerequisites for running the system, such as Docker, Python, and Node.js.

#### **3. Installation**
Step-by-step guide to set up the system locally or on a server.

#### **4. Usage**
Explain how to use the system, including accessing the frontend, managing tickets, and using the admin panel.

#### **5. Architecture**
Describe the system's architecture, including its services, technologies, and data flow.

#### **6. Troubleshooting**
Provide solutions for common issues, such as container errors or database connection problems.

#### **7. Contribution**
Outline how developers can contribute to the project, including coding standards and pull request guidelines.