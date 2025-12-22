#!/bin/bash
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE DATABASE ams_authentication;
    CREATE DATABASE ams_assets;
    CREATE DATABASE ams_contexts;
EOSQL