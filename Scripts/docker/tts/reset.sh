#!/bin/bash
set -e

if [ -d "tts/Docker" ]; then
    cd tts/Docker
else
    echo "Error: tts/Docker directory not found from $(pwd)"
    exit 1
fi

echo "WARNING: This will stop containers and REMOVE all volumes (data)."
echo "Press Ctrl+C to cancel or wait 5 seconds..."
sleep 5

echo "Resetting TTS Docker environment..."
docker-compose down -v
echo "Environment reset (volumes removed)."
