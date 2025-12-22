#!/bin/bash
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" <<-EOSQL
    CREATE DATABASE usermanagement;
    CREATE DATABASE workflowmanagement;
    CREATE DATABASE ticketmanagement;
    CREATE DATABASE authservice;
    CREATE DATABASE notificationservice;
    CREATE DATABASE messagingservice;
    CREATE DATABASE helpdesk;
EOSQL
