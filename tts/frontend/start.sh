#!/bin/sh

# Start json-server in background
cd public
json-server --watch db.json --port 5000 &

# Go back to root folder and serve the React build
cd ../
serve -s dist -l 1000