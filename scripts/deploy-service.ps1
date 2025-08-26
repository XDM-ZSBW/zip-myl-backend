# PowerShell deployment script for zip-myl-backend
# Project ID: zip-myl-backend
# Domain: api.myl.zip

$PROJECT_ID = "zip-myl-backend"
$REGION = "us-central1"
$SERVICE_NAME = "zip-myl-backend"
$IMAGE_NAME = "gcr.io/$PROJECT_ID/$SERVICE_NAME"
$DOMAIN = "api.myl.zip"

Write-Host "🚀 Deploying zip-myl-backend to Google Cloud Platform" -ForegroundColor Green
Write-Host "Project ID: $PROJECT_ID" -ForegroundColor Cyan
Write-Host "Domain: $DOMAIN" -ForegroundColor Cyan
Write-Host "Region: $REGION" -ForegroundColor Cyan

# Set the project
Write-Host "📋 Setting project to $PROJECT_ID..." -ForegroundColor Yellow
gcloud config set project $PROJECT_ID

# Enable required APIs
Write-Host "🔧 Enabling required APIs..." -ForegroundColor Yellow
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com
gcloud services enable domains.googleapis.com
gcloud services enable dns.googleapis.com

# Build and push the Docker image
Write-Host "🏗️ Building and pushing Docker image..." -ForegroundColor Yellow
gcloud builds submit --tag $IMAGE_NAME`:latest .

# Deploy to Cloud Run with all secrets
Write-Host "🚀 Deploying to Cloud Run..." -ForegroundColor Yellow
gcloud run deploy $SERVICE_NAME `
  --image $IMAGE_NAME`:latest `
  --region $REGION `
  --platform managed `
  --allow-unauthenticated `
  --port 3000 `
  --memory 512Mi `
  --cpu 1 `
  --min-instances 0 `
  --max-instances 10 `
  --concurrency 100 `
  --timeout 300 `
  --set-env-vars NODE_ENV=production `
  --set-secrets DATABASE_URL=DATABASE_URL:latest,REDIS_PASSWORD=REDIS_PASSWORD:latest,JWT_SECRET=JWT_SECRET:latest,JWT_REFRESH_SECRET=JWT_REFRESH_SECRET:latest,INTERNAL_API_KEY=INTERNAL_API_KEY:latest `
  --project $PROJECT_ID

# Get the service URL
$SERVICE_URL = gcloud run services describe $SERVICE_NAME --region=$REGION --format='value(status.url)'
Write-Host "✅ Service deployed at: $SERVICE_URL" -ForegroundColor Green

# Create domain mapping
Write-Host "🌐 Setting up domain mapping for $DOMAIN..." -ForegroundColor Yellow
gcloud run domain-mappings create `
  --service $SERVICE_NAME `
  --domain $DOMAIN `
  --region $REGION `
  --project $PROJECT_ID

# Get the DNS records needed
Write-Host "📋 DNS Configuration Required:" -ForegroundColor Yellow
Write-Host "Add these DNS records to your domain provider:" -ForegroundColor Yellow
gcloud run domain-mappings describe $DOMAIN --region=$REGION --format="table(status.resourceRecords[].name,status.resourceRecords[].rrdata,status.resourceRecords[].type)"

Write-Host ""
Write-Host "🎉 Deployment completed successfully!" -ForegroundColor Green
Write-Host "🌐 Service URL: $SERVICE_URL" -ForegroundColor Cyan
Write-Host "🌐 Custom Domain: https://$DOMAIN" -ForegroundColor Cyan
Write-Host "📊 Monitor at: https://console.cloud.google.com/run/detail/$REGION/$SERVICE_NAME/metrics?project=$PROJECT_ID" -ForegroundColor Cyan

Write-Host ""
Write-Host "🔧 Next Steps:" -ForegroundColor Yellow
Write-Host "1. Add the DNS records shown above to your domain provider" -ForegroundColor White
Write-Host "2. Wait for DNS propagation" -ForegroundColor White
Write-Host "3. Your API will be available at: https://$DOMAIN" -ForegroundColor White