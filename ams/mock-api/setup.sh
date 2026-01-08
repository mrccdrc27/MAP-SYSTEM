#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

MOCK_API_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$MOCK_API_DIR"

echo -e "${BLUE}╔════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   AMS Mock API Server Setup & Runner      ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════╝${NC}"
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Installing dependencies...${NC}"
    npm install
    echo -e "${GREEN}✓ Dependencies installed${NC}"
    echo ""
fi

# Check Node.js version
NODE_VERSION=$(node -v)
echo -e "${GREEN}✓ Node.js version: ${NODE_VERSION}${NC}"
echo ""

# Display options
echo -e "${BLUE}Available commands:${NC}"
echo "  npm start   - Run in production mode"
echo "  npm run dev - Run in development mode (with auto-reload)"
echo ""

# Ask user which mode to run
read -p "Start server? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${GREEN}Starting server...${NC}"
    echo ""
    npm start
else
    echo -e "${YELLOW}Setup complete! Run 'npm start' to begin.${NC}"
fi
