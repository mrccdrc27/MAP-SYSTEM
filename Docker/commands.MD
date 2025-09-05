
---

### **1. Build All Services**
To build all services defined in the docker-compose.yml file:
```bash
docker-compose build
```

---

### **2. Build a Specific Service**
To build only one service (e.g., ticket_service):
```bash
docker-compose build ticket_service
```

---

### **3. Start All Services**
To start all services in detached mode (background):
```bash
docker-compose up -d
```

---

### **4. Start a Specific Service**
To start only one service (e.g., user_service):
```bash
docker-compose up -d user_service
```

---

### **5. Stop All Services**
To stop all running services:
```bash
docker-compose down
```

---

### **6. Stop a Specific Service**
To stop only one service (e.g., workflow_api):
```bash
docker-compose stop workflow_api
```

---

### **7. View Logs for All Services**
To view logs for all services:
```bash
docker-compose logs
```

---

### **8. View Logs for a Specific Service**
To view logs for a specific service (e.g., frontend):
```bash
docker-compose logs frontend
```

---

### **9. Restart All Services**
To restart all services:
```bash
docker-compose restart
```

---

### **10. Restart a Specific Service**
To restart only one service (e.g., `rabbitmq`):
```bash
docker-compose restart rabbitmq
```

---

### **11. Run a Command in a Service**
To run a one-off command in a specific service (e.g., running `bash` in ticket_service):
```bash
docker-compose run ticket_service bash
```

---

### **12. Check Running Services**
To see the status of all running services:
```bash
docker-compose ps
```

---

### **13. Remove All Containers, Networks, and Volumes**
To clean up everything created by `docker-compose`:
```bash
docker-compose down -v
```

---

### **14. Scale a Service**
To scale a service (e.g., run 3 instances of frontend):
```bash
docker-compose up -d --scale frontend=3
```

---

### **15. Build and Recreate Containers**
To rebuild and recreate containers for all services:
```bash
docker-compose up -d --build
```

---

Let me know if you need further clarification on any of these commands!