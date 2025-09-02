@echo off
REM Development server startup script for MyL.Zip Backend
echo 🚀 Starting MyL.Zip Backend Development Server...

REM Set environment variables
set NODE_ENV=development
set PORT=3333
set HOST=0.0.0.0

REM Kill any existing processes on port 3333
echo 🔧 Checking for existing processes on port 3333...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3333') do taskkill /F /PID %%a 2>nul

REM Wait a moment for processes to be killed
timeout /t 2 /nobreak >nul

REM Start the server
echo 🌍 Starting server on port 3333...
node src/app.js
