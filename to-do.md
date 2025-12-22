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