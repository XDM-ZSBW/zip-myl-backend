#!/bin/bash

# Setup script for zip-myl-backend Google Cloud Platform project
# Project ID: zip-myl-backend
# Project Number: 658472087761

set -e

# Configuration
PROJECT_ID="zip-myl-backend"
PROJECT_NUMBER="658472087761"
REGION="us-central1"
SERVICE_NAME="zip-myl-backend"

echo "🔧 Setting up Google Cloud Platform for zip-myl-backend"
echo "Project ID: ${PROJECT_ID}"
echo "Project Number: ${PROJECT_NUMBER}"
echo "Region: ${REGION}"

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "❌ gcloud CLI is not installed. Please install it first."
    echo "Visit: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Set the project
echo "📋 Setting project to ${PROJECT_ID}..."
gcloud config set project ${PROJECT_ID}

# Enable required APIs
echo "🔧 Enabling required APIs..."
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com
gcloud services enable sqladmin.googleapis.com
gcloud services enable redis.googleapis.com
gcloud services enable secretmanager.googleapis.com

# Create Cloud SQL instance (PostgreSQL)
echo "🗄️ Creating Cloud SQL PostgreSQL instance..."
gcloud sql instances create zip-myl-backend-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=${REGION} \
  --storage-type=SSD \
  --storage-size=10GB \
  --storage-auto-increase \
  --backup \
  --enable-ip-alias \
  --authorized-networks=0.0.0.0/0 \
  --root-password=temp-password-123 \
  --quiet || echo "⚠️ Database instance may already exist"

# Create database
echo "📊 Creating database..."
gcloud sql databases create zip_myl_backend \
  --instance=zip-myl-backend-db \
  --quiet || echo "⚠️ Database may already exist"

# Create Redis instance
echo "🔴 Creating Redis instance..."
gcloud redis instances create zip-myl-backend-redis \
  --size=1 \
  --region=${REGION} \
  --redis-version=redis_7_0 \
  --tier=basic \
  --quiet || echo "⚠️ Redis instance may already exist"

# Create secrets in Secret Manager
echo "🔐 Creating secrets in Secret Manager..."

# Generate JWT secrets
JWT_SECRET=$(openssl rand -base64 32)
JWT_REFRESH_SECRET=$(openssl rand -base64 32)
INTERNAL_API_KEY=$(openssl rand -base64 32)

# Create secrets
echo "${JWT_SECRET}" | gcloud secrets create JWT_SECRET --data-file=- --quiet || echo "⚠️ JWT_SECRET may already exist"
echo "${JWT_REFRESH_SECRET}" | gcloud secrets create JWT_REFRESH_SECRET --data-file=- --quiet || echo "⚠️ JWT_REFRESH_SECRET may already exist"
echo "${INTERNAL_API_KEY}" | gcloud secrets create INTERNAL_API_KEY --data-file=- --quiet || echo "⚠️ INTERNAL_API_KEY may already exist"

# Create placeholder secrets for database and Redis
echo "postgresql://username:password@localhost:5432/zip_myl_backend" | gcloud secrets create DATABASE_URL --data-file=- --quiet || echo "⚠️ DATABASE_URL may already exist"
echo "redis-password" | gcloud secrets create REDIS_PASSWORD --data-file=- --quiet || echo "⚠️ REDIS_PASSWORD may already exist"

# Grant Cloud Run access to secrets
echo "🔑 Granting Cloud Run access to secrets..."
gcloud secrets add-iam-policy-binding JWT_SECRET \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor" \
  --quiet || echo "⚠️ JWT_SECRET IAM binding may already exist"

gcloud secrets add-iam-policy-binding JWT_REFRESH_SECRET \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor" \
  --quiet || echo "⚠️ JWT_REFRESH_SECRET IAM binding may already exist"

gcloud secrets add-iam-policy-binding INTERNAL_API_KEY \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor" \
  --quiet || echo "⚠️ INTERNAL_API_KEY IAM binding may already exist"

gcloud secrets add-iam-policy-binding DATABASE_URL \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor" \
  --quiet || echo "⚠️ DATABASE_URL IAM binding may already exist"

gcloud secrets add-iam-policy-binding REDIS_PASSWORD \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor" \
  --quiet || echo "⚠️ REDIS_PASSWORD IAM binding may already exist"

# Create service account for GitHub Actions
echo "👤 Creating service account for GitHub Actions..."
gcloud iam service-accounts create github-actions \
  --display-name="GitHub Actions Service Account" \
  --description="Service account for GitHub Actions CI/CD" \
  --quiet || echo "⚠️ Service account may already exist"

# Grant necessary roles to the service account
echo "🔑 Granting roles to service account..."
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:github-actions@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/cloudbuild.builds.builder" \
  --quiet

gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:github-actions@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/run.admin" \
  --quiet

gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:github-actions@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/storage.admin" \
  --quiet

gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:github-actions@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser" \
  --quiet

# Create and download service account key
echo "🔑 Creating service account key..."
gcloud iam service-accounts keys create github-actions-key.json \
  --iam-account=github-actions@${PROJECT_ID}.iam.gserviceaccount.com \
  --quiet || echo "⚠️ Service account key may already exist"

echo "✅ Google Cloud Platform setup completed!"
echo ""
echo "📋 Next steps:"
echo "1. Add the following secrets to your GitHub repository:"
echo "   - GCP_SA_KEY: Contents of github-actions-key.json"
echo "   - DATABASE_URL: Your actual database connection string"
echo "   - REDIS_PASSWORD: Your actual Redis password"
echo ""
echo "2. Update the DATABASE_URL secret with your actual Cloud SQL connection string:"
echo "   gcloud secrets versions add DATABASE_URL --data-file=-"
echo ""
echo "3. Update the REDIS_PASSWORD secret with your actual Redis password:"
echo "   gcloud secrets versions add REDIS_PASSWORD --data-file=-"
echo ""
echo "4. Deploy your application:"
echo "   ./scripts/deploy-gcp.sh"
echo ""
echo "🔗 Useful links:"
echo "   - Cloud Console: https://console.cloud.google.com/home/dashboard?project=${PROJECT_ID}"
echo "   - Cloud Run: https://console.cloud.google.com/run?project=${PROJECT_ID}"
echo "   - Cloud SQL: https://console.cloud.google.com/sql?project=${PROJECT_ID}"
echo "   - Redis: https://console.cloud.google.com/memorystore/redis?project=${PROJECT_ID}"
echo "   - Secret Manager: https://console.cloud.google.com/security/secret-manager?project=${PROJECT_ID}"
