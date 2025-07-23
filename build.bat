@echo off
REM Build script for ISW Offering Assistant on Windows
REM This script builds both backend and frontend for distribution

echo 🚀 Building ISW Offering Assistant...

REM Check if we're in the right directory
if not exist "README.md" (
    echo ❌ Please run this script from the project root directory
    exit /b 1
)

echo 📦 Step 1: Building Backend API...
cd server-api

REM Install backend dependencies
if not exist "node_modules" (
    echo Installing backend dependencies...
    npm install
    if errorlevel 1 (
        echo ❌ Backend npm install failed
        exit /b 1
    )
)

echo ✅ Backend build completed

REM Build frontend
echo 📱 Step 2: Building Frontend Desktop App...
cd ..\electron-app

REM Install frontend dependencies
if not exist "node_modules" (
    echo Installing frontend dependencies...
    npm install
    if errorlevel 1 (
        echo ❌ Frontend npm install failed
        exit /b 1
    )
)

REM Build Electron app
echo Building Electron application...
npm run build
if errorlevel 1 (
    echo ❌ Electron build failed
    exit /b 1
)

echo ✅ Frontend build completed

REM Summary
echo 📋 Build Summary:
echo ✅ Backend API ready for deployment
echo ✅ Desktop application built successfully

if exist "dist" (
    echo 📦 Distribution files:
    dir dist
)

echo 🎉 Build completed successfully!
echo Next steps:
echo 1. Deploy backend API to production server
echo 2. Setup MariaDB database with init script
echo 3. Configure production environment variables
echo 4. Distribute desktop application installer
echo.
echo 📖 See DEPLOYMENT.md for detailed deployment instructions

pause
