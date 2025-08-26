#!/bin/bash

# Complete deployment script for zip-myl-backend with domain mapping
# Project ID: zip-myl-backend
# Domain: api.myl.zip

set -e

# Configuration
PROJECT_ID="zip-myl-backend"
PROJECT_NUMBER="658472087761"
REGION="us-central1"
SERVICE_NAME="zip-myl-backend"
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"
DOMAIN="api.myl.zip"

echo "🚀 Deploying zip-myl-backend with domain mapping"
echo "Project ID: ${PROJECT_ID}"
echo "Domain: ${DOMAIN}"
echo "Region: ${REGION}"

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "❌ gcloud CLI is not installed. Please install it first."
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
gcloud services enable domains.googleapis.com
gcloud services enable dns.googleapis.com

# Build and push the Docker image
echo "🏗️ Building and pushing Docker image..."
gcloud builds submit --tag ${IMAGE_NAME}:latest .

# Deploy to Cloud Run with all secrets
echo "🚀 Deploying to Cloud Run..."
gcloud run deploy ${SERVICE_NAME} \
  --image ${IMAGE_NAME}:latest \
  --region ${REGION} \
  --platform managed \
  --allow-unauthenticated \
  --port 3000 \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 10 \
  --concurrency 100 \
  --timeout 300 \
  --set-env-vars NODE_ENV=production \
  --set-secrets DATABASE_URL=DATABASE_URL:latest,REDIS_PASSWORD=REDIS_PASSWORD:latest,JWT_SECRET=JWT_SECRET:latest,JWT_REFRESH_SECRET=JWT_REFRESH_SECRET:latest,INTERNAL_API_KEY=INTERNAL_API_KEY:latest \
  --project ${PROJECT_ID}

# Get the service URL
SERVICE_URL=$(gcloud run services describe ${SERVICE_NAME} --region=${REGION} --format='value(status.url)')
echo "✅ Service deployed at: ${SERVICE_URL}"

# Create domain mapping
echo "🌐 Setting up domain mapping for ${DOMAIN}..."
gcloud run domain-mappings create \
  --service ${SERVICE_NAME} \
  --domain ${DOMAIN} \
  --region ${REGION} \
  --project ${PROJECT_ID}

# Get the DNS records needed
echo "📋 DNS Configuration Required:"
echo "Add these DNS records to your domain provider:"
gcloud run domain-mappings describe ${DOMAIN} --region=${REGION} --format="value(status.resourceRecords[].name,status.resourceRecords[].rrdata,status.resourceRecords[].type)"

echo ""
echo "🎉 Deployment completed successfully!"
echo "🌐 Service URL: ${SERVICE_URL}"
echo "🌐 Custom Domain: https://${DOMAIN}"
echo "📊 Monitor at: https://console.cloud.google.com/run/detail/${REGION}/${SERVICE_NAME}/metrics?project=${PROJECT_ID}"

# Health check
echo "🔍 Performing health check..."
sleep 10
if curl -f "${SERVICE_URL}/health" > /dev/null 2>&1; then
    echo "✅ Health check passed!"
else
    echo "⚠️ Health check failed. Please check the service logs."
fi

echo "🎉 Complete deployment script finished!"
