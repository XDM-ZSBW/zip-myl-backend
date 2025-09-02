#!/bin/bash

# Development server startup script for MyL.Zip Backend
echo "🚀 Starting MyL.Zip Backend Development Server..."

# Set environment variables
export NODE_ENV=development
export PORT=3333
export HOST=0.0.0.0

# Kill any existing processes on port 3333
echo "🔧 Checking for existing processes on port 3333..."
lsof -ti:3333 | xargs kill -9 2>/dev/null || true

# Wait a moment for processes to be killed
sleep 2

# Start the server
echo "🌍 Starting server on port 3333..."
node src/app.js
