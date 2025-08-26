#!/bin/bash

# Deploy script for Myl.Zip Backend
set -e

echo "🚀 Starting deployment process..."

# Check if required environment variables are set
if [ -z "$GOOGLE_CLOUD_PROJECT_ID" ]; then
    echo "❌ Error: GOOGLE_CLOUD_PROJECT_ID environment variable is not set"
    exit 1
fi

if [ -z "$DATABASE_URL" ]; then
    echo "❌ Error: DATABASE_URL environment variable is not set"
    exit 1
fi

# Set default values
REGION=${GOOGLE_CLOUD_REGION:-us-central1}
SERVICE_NAME=${SERVICE_NAME:-zip-myl-backend}
IMAGE_TAG=${IMAGE_TAG:-latest}

echo "📋 Deployment Configuration:"
echo "  Project ID: $GOOGLE_CLOUD_PROJECT_ID"
echo "  Region: $REGION"
echo "  Service Name: $SERVICE_NAME"
echo "  Image Tag: $IMAGE_TAG"

# Authenticate with Google Cloud
echo "🔐 Authenticating with Google Cloud..."
gcloud auth activate-service-account --key-file="$GOOGLE_APPLICATION_CREDENTIALS"

# Configure Docker to use gcloud as a credential helper
echo "🐳 Configuring Docker authentication..."
gcloud auth configure-docker

# Build and push Docker image
echo "🏗️  Building Docker image..."
docker build -t gcr.io/$GOOGLE_CLOUD_PROJECT_ID/$SERVICE_NAME:$IMAGE_TAG .
docker build -t gcr.io/$GOOGLE_CLOUD_PROJECT_ID/$SERVICE_NAME:latest .

echo "📤 Pushing Docker image..."
docker push gcr.io/$GOOGLE_CLOUD_PROJECT_ID/$SERVICE_NAME:$IMAGE_TAG
docker push gcr.io/$GOOGLE_CLOUD_PROJECT_ID/$SERVICE_NAME:latest

# Deploy to Cloud Run
echo "🚀 Deploying to Cloud Run..."
gcloud run deploy $SERVICE_NAME \
  --image gcr.io/$GOOGLE_CLOUD_PROJECT_ID/$SERVICE_NAME:$IMAGE_TAG \
  --region $REGION \
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
  --set-secrets DATABASE_URL=DATABASE_URL:latest,REDIS_PASSWORD=REDIS_PASSWORD:latest,JWT_SECRET=JWT_SECRET:latest

# Run database migrations
echo "🗄️  Running database migrations..."
npx prisma migrate deploy

# Health check
echo "🏥 Performing health check..."
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region=$REGION --format='value(status.url)')
sleep 30

if curl -f "$SERVICE_URL/health"; then
    echo "✅ Health check passed!"
    echo "🌐 Service is available at: $SERVICE_URL"
else
    echo "❌ Health check failed!"
    exit 1
fi

echo "🎉 Deployment completed successfully!"
