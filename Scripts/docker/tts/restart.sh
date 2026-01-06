#!/bin/bash
set -e

if [ -d "tts/Docker" ]; then
    cd tts/Docker
else
    echo "Error: tts/Docker directory not found from $(pwd)"
    exit 1
fi

echo "Restarting TTS Docker environment..."
docker-compose restart
echo "Restarted."
