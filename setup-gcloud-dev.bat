@echo off
REM Google Cloud Development Setup Script for Windows
REM This script sets up local development with Google Cloud services for better parity

echo 🚀 Setting up Google Cloud Development Environment...

REM Check if gcloud is authenticated
gcloud auth list --filter=status:ACTIVE --format="value(account)" > temp_auth.txt
if %errorlevel% neq 0 (
    echo ❌ Please authenticate with Google Cloud first:
    echo    gcloud auth login
    del temp_auth.txt
    pause
    exit /b 1
)
del temp_auth.txt

REM Set up Google Cloud project
echo 📋 Setting up Google Cloud project...
gcloud config set project zip-myl-backend
gcloud config set run/region us-central1

REM Enable required APIs
echo 🔧 Enabling Google Cloud APIs...
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable secretmanager.googleapis.com
gcloud services enable storage.googleapis.com
gcloud services enable sqladmin.googleapis.com

REM Set up Cloud SQL Proxy for local database access
echo 🗄️ Setting up Cloud SQL Proxy...
gcloud components install cloud-sql-proxy

REM Set up local development environment
echo ⚙️ Setting up local development environment...

REM Create development environment file
(
echo # Google Cloud Development Environment
echo NODE_ENV=development
echo PORT=8080
echo HOST=0.0.0.0
echo.
echo # Google Cloud services
echo GOOGLE_CLOUD_PROJECT=zip-myl-backend
echo GOOGLE_CLOUD_REGION=us-central1
echo USE_GOOGLE_CLOUD_SERVICES=true
echo.
echo # Database ^(will use Cloud SQL Proxy^)
echo DATABASE_URL=postgresql://localhost:5432/myl_zip
echo DB_POOL_MIN=2
echo DB_POOL_MAX=10
echo.
echo # Redis ^(local for development^)
echo REDIS_URL=redis://localhost:6379
echo.
echo # Development flags
echo ENABLE_METRICS=true
echo ENABLE_WEBSOCKET=true
echo ENABLE_RATE_LIMITING=false
echo SECURITY_HEADERS=true
echo LOG_LEVEL=debug
echo LOG_FORMAT=dev
echo ENABLE_HOT_RELOAD=true
echo ENABLE_DEBUG_MODE=true
) > .env.development

echo ✅ Google Cloud development environment configured!
echo.
echo 🔧 Next steps:
echo 1. Start Cloud SQL Proxy: gcloud:proxy
echo 2. Start local Redis: redis-server
echo 3. Run development server: npm run dev:gcloud
echo.
echo 🌐 Your local development will now use Google Cloud services!
pause
