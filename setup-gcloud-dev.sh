#!/bin/bash
# Google Cloud Development Setup Script
# This script sets up local development with Google Cloud services for better parity

echo "🚀 Setting up Google Cloud Development Environment..."

# Check if gcloud is authenticated
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    echo "❌ Please authenticate with Google Cloud first:"
    echo "   gcloud auth login"
    exit 1
fi

# Set up Google Cloud project
echo "📋 Setting up Google Cloud project..."
gcloud config set project zip-myl-backend
gcloud config set run/region us-central1

# Enable required APIs
echo "🔧 Enabling Google Cloud APIs..."
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable secretmanager.googleapis.com
gcloud services enable storage.googleapis.com
gcloud services enable sqladmin.googleapis.com

# Set up Cloud SQL Proxy for local database access
echo "🗄️ Setting up Cloud SQL Proxy..."
if ! command -v cloud-sql-proxy &> /dev/null; then
    echo "Installing Cloud SQL Proxy..."
    gcloud components install cloud-sql-proxy
fi

# Set up local development environment
echo "⚙️ Setting up local development environment..."

# Create development environment file
cat > .env.development << EOF
# Google Cloud Development Environment
NODE_ENV=development
PORT=8080
HOST=0.0.0.0

# Google Cloud services
GOOGLE_CLOUD_PROJECT=zip-myl-backend
GOOGLE_CLOUD_REGION=us-central1
USE_GOOGLE_CLOUD_SERVICES=true

# Database (will use Cloud SQL Proxy)
DATABASE_URL=postgresql://localhost:5432/myl_zip
DB_POOL_MIN=2
DB_POOL_MAX=10

# Redis (local for development)
REDIS_URL=redis://localhost:6379

# Development flags
ENABLE_METRICS=true
ENABLE_WEBSOCKET=true
ENABLE_RATE_LIMITING=false
SECURITY_HEADERS=true
LOG_LEVEL=debug
LOG_FORMAT=dev
ENABLE_HOT_RELOAD=true
ENABLE_DEBUG_MODE=true
EOF

echo "✅ Google Cloud development environment configured!"
echo ""
echo "🔧 Next steps:"
echo "1. Start Cloud SQL Proxy: cloud-sql-proxy --instances=zip-myl-backend:us-central1:zip-myl-backend"
echo "2. Start local Redis: redis-server"
echo "3. Run development server: npm run dev:gcloud"
echo ""
echo "🌐 Your local development will now use Google Cloud services!"
