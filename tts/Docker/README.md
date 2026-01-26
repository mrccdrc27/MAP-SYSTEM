# TTS Docker Services

This directory contains the Docker Compose configuration for the Ticket Tracking System (TTS).

## Services Overview

- **Kong**: API Gateway (ports 8080, 8001)
- **RabbitMQ**: Message Queue (ports 5672, 15672)
- **PostgreSQL**: Database (port 5433)
- **Auth Service**: Authentication (port 8003)
- **Workflow API**: Main API (port 1001)
- **Helpdesk Service**: Helpdesk functionality (port 5001)
- **Messaging Service**: Messaging (port 1002)
- **Notification Service**: Notifications (port 1003)
- **Mailpit**: Email testing (ports 8025, 1025)

## Quick Start

```bash
# Start all services
docker-compose up -d

# Check status
docker-compose ps
```

## Update Procedures

### For Code Changes (Recommended)
```bash
./quick-update.sh
```
This rebuilds changed images and restarts services.

### For Major Changes or Issues
```bash
./update-services.sh
```
This does a complete cleanup, rebuild, and restart.

### Manual Commands

**Start services:**
```bash
docker-compose up -d
```

**Rebuild and start:**
```bash
docker-compose up --build -d
```

**Stop services:**
```bash
docker-compose down
```

**View logs:**
```bash
docker-compose logs -f [service-name]
```

**Clean up:**
```bash
docker-compose down --remove-orphans
docker image prune -f
```

## Troubleshooting

### ContainerConfig Error
If you encounter `KeyError: 'ContainerConfig'`:
1. Run `./update-services.sh` for a complete rebuild
2. Or manually: `docker-compose down`, `docker image prune -f`, `docker-compose build --no-cache`, `docker-compose up -d`

### Port Conflicts
If ports are in use, check what's using them:
```bash
sudo lsof -i :PORT_NUMBER
```

### Service Dependencies
Services start in dependency order. If a service fails, check its dependencies are healthy first.

## Environment Variables

Some services use `.env` files in their respective directories. Make sure these are properly configured before starting services.