#!/bin/bash

# Setup environment configuration for CLI
# Run this once to auto-detect and configure your environment

echo -e "\n🔧 Setting up CLI environment...\n"

# Navigate to cli directory
cd "$(dirname "$0")"

# Run setup script
node setup-env.js

echo -e "\nSetup complete!\n"
