one to run scripts (environment-seed-migrate-activate)

seed 1. users for HDTS - TTS sync
- own venv
- requires rabbitmq

seed 2. tickets for HDTS - TTS
- requires rabbitmq

-- 

clean all dependencies for development

PM2 - Only run (requires - environment, seeded data)
-infra
-> messaging, notification, authentication, 
HDTS
TTS
AMS
BMS

xxx

1. virtual environment setup - gather every dependencies and organize them as single script executable (from various services)

2. PM2 does not overwrite the environment configuration between services, i.e. if an .env exists on the service, the .env overrides the original one

3. base node js setup for PM2 dependencies, dot.env, etc