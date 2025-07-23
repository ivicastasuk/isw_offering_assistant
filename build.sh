#!/bin/bash

# Build script for ISW Offering Assistant
# This script builds both backend and frontend for distribution

echo "🚀 Building ISW Offering Assistant..."

# Check if we're in the right directory
if [ ! -f "README.md" ]; then
    echo "❌ Please run this script from the project root directory"
    exit 1
fi

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}📦 Step 1: Building Backend API...${NC}"
cd server-api

# Install backend dependencies
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing backend dependencies...${NC}"
    npm install
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Backend npm install failed${NC}"
        exit 1
    fi
fi

# Run backend tests if they exist
if [ -f "package.json" ] && grep -q "test" package.json; then
    echo -e "${YELLOW}Running backend tests...${NC}"
    npm test
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Backend tests failed${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}✅ Backend build completed${NC}"

# Build frontend
echo -e "${BLUE}📱 Step 2: Building Frontend Desktop App...${NC}"
cd ../electron-app

# Install frontend dependencies
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing frontend dependencies...${NC}"
    npm install
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Frontend npm install failed${NC}"
        exit 1
    fi
fi

# Build Electron app
echo -e "${YELLOW}Building Electron application...${NC}"
npm run build
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Electron build failed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Frontend build completed${NC}"

# Summary
echo -e "${BLUE}📋 Build Summary:${NC}"
echo -e "${GREEN}✅ Backend API ready for deployment${NC}"
echo -e "${GREEN}✅ Desktop application built successfully${NC}"

if [ -d "dist" ]; then
    echo -e "${YELLOW}📦 Distribution files:${NC}"
    ls -la dist/
fi

echo -e "${BLUE}🎉 Build completed successfully!${NC}"
echo -e "${YELLOW}Next steps:${NC}"
echo -e "1. Deploy backend API to production server"
echo -e "2. Setup MariaDB database with init script"
echo -e "3. Configure production environment variables"
echo -e "4. Distribute desktop application installer"
echo -e ""
echo -e "📖 See DEPLOYMENT.md for detailed deployment instructions"
