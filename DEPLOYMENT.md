# Deployment Guide for zip-myl-backend

This guide covers deploying the zip-myl-backend project to Google Cloud Platform.

## Project Information

- **Project ID**: `zip-myl-backend`
- **Project Number**: `658472087761`
- **GitHub Repository**: [https://github.com/XDM-ZSBW/zip-myl-backend](https://github.com/XDM-ZSBW/zip-myl-backend)
- **Google Cloud Console**: [https://console.cloud.google.com/home/dashboard?project=zip-myl-backend](https://console.cloud.google.com/home/dashboard?project=zip-myl-backend)

## Prerequisites

1. **Google Cloud CLI** installed and authenticated
2. **Docker** installed
3. **Node.js 18+** installed
4. Access to the `zip-myl-backend` Google Cloud project

## Quick Setup

### 1. Initial Google Cloud Setup

Run the setup script to configure your Google Cloud project:

```bash
chmod +x scripts/setup-gcp.sh
./scripts/setup-gcp.sh
```

This script will:
- Enable required APIs
- Create Cloud SQL PostgreSQL instance
- Create Redis instance
- Create secrets in Secret Manager
- Set up service account for GitHub Actions
- Configure IAM permissions

### 2. Configure Secrets

Update the secrets with your actual values:

```bash
# Update database URL (replace with your actual Cloud SQL connection string)
echo "postgresql://username:password@/zip_myl_backend?host=/cloudsql/zip-myl-backend:us-central1:zip-myl-backend-db" | gcloud secrets versions add DATABASE_URL --data-file=-

# Update Redis password (replace with your actual Redis password)
echo "your-actual-redis-password" | gcloud secrets versions add REDIS_PASSWORD --data-file=-
```

### 3. Deploy to Cloud Run

Deploy your application:

```bash
chmod +x scripts/deploy-gcp.sh
./scripts/deploy-gcp.sh
```

## Manual Deployment

### 1. Build and Push Docker Image

```bash
# Build the image
docker build -t gcr.io/zip-myl-backend/zip-myl-backend:latest .

# Push to Google Container Registry
docker push gcr.io/zip-myl-backend/zip-myl-backend:latest
```

### 2. Deploy to Cloud Run

```bash
gcloud run deploy zip-myl-backend \
  --image gcr.io/zip-myl-backend/zip-myl-backend:latest \
  --region us-central1 \
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
  --set-secrets DATABASE_URL=DATABASE_URL:latest,REDIS_PASSWORD=REDIS_PASSWORD:latest,JWT_SECRET=JWT_SECRET:latest \
  --project zip-myl-backend
```

## GitHub Actions CI/CD

### 1. Set up GitHub Secrets

Add the following secrets to your GitHub repository:

- `GCP_SA_KEY`: Contents of the `github-actions-key.json` file
- `DATABASE_URL`: Your actual database connection string
- `REDIS_PASSWORD`: Your actual Redis password

### 2. Enable GitHub Actions

The repository includes two workflow files:

- `.github/workflows/ci.yml`: Runs tests and deploys on push to main
- `.github/workflows/deploy.yml`: Manual deployment workflow

### 3. Trigger Deployment

Push to the `main` branch to trigger automatic deployment:

```bash
git add .
git commit -m "Deploy to production"
git push origin main
```

## Environment Configuration

### Production Environment Variables

The following environment variables are configured for production:

```bash
NODE_ENV=production
PORT=3000
GOOGLE_CLOUD_PROJECT_ID=zip-myl-backend
GOOGLE_CLOUD_REGION=us-central1
```

### Secrets (Managed by Secret Manager)

- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_PASSWORD`: Redis authentication password
- `JWT_SECRET`: JWT signing secret
- `JWT_REFRESH_SECRET`: JWT refresh token secret
- `INTERNAL_API_KEY`: Internal API key for service-to-service communication

## Database Setup

### 1. Run Migrations

After deployment, run database migrations:

```bash
# Connect to your Cloud SQL instance
gcloud sql connect zip-myl-backend-db --user=postgres

# Or run migrations through Cloud Run
gcloud run jobs create migrate-db \
  --image gcr.io/zip-myl-backend/zip-myl-backend:latest \
  --region us-central1 \
  --command npx \
  --args prisma,migrate,deploy \
  --set-secrets DATABASE_URL=DATABASE_URL:latest \
  --project zip-myl-backend
```

### 2. Seed Database (Optional)

```bash
gcloud run jobs create seed-db \
  --image gcr.io/zip-myl-backend/zip-myl-backend:latest \
  --region us-central1 \
  --command npm \
  --args run,db:seed \
  --set-secrets DATABASE_URL=DATABASE_URL:latest \
  --project zip-myl-backend
```

## Monitoring and Logging

### 1. View Logs

```bash
# View Cloud Run logs
gcloud logs read "resource.type=cloud_run_revision AND resource.labels.service_name=zip-myl-backend" --limit 50

# Or view in the console
# https://console.cloud.google.com/run/detail/us-central1/zip-myl-backend/logs?project=zip-myl-backend
```

### 2. Monitor Performance

- **Cloud Run Metrics**: [https://console.cloud.google.com/run/detail/us-central1/zip-myl-backend/metrics?project=zip-myl-backend](https://console.cloud.google.com/run/detail/us-central1/zip-myl-backend/metrics?project=zip-myl-backend)
- **Cloud SQL Metrics**: [https://console.cloud.google.com/sql/instances/zip-myl-backend-db/overview?project=zip-myl-backend](https://console.cloud.google.com/sql/instances/zip-myl-backend-db/overview?project=zip-myl-backend)
- **Redis Metrics**: [https://console.cloud.google.com/memorystore/redis/instances/zip-myl-backend-redis/overview?project=zip-myl-backend](https://console.cloud.google.com/memorystore/redis/instances/zip-myl-backend-redis/overview?project=zip-myl-backend)

## Troubleshooting

### Common Issues

1. **Authentication Errors**
   ```bash
   gcloud auth login
   gcloud config set project zip-myl-backend
   ```

2. **Permission Errors**
   ```bash
   # Ensure you have the necessary roles
   gcloud projects get-iam-policy zip-myl-backend
   ```

3. **Database Connection Issues**
   ```bash
   # Check Cloud SQL instance status
   gcloud sql instances describe zip-myl-backend-db
   
   # Test connection
   gcloud sql connect zip-myl-backend-db --user=postgres
   ```

4. **Redis Connection Issues**
   ```bash
   # Check Redis instance status
   gcloud redis instances describe zip-myl-backend-redis --region=us-central1
   ```

### Health Checks

The application includes health check endpoints:

- **Liveness**: `GET /health/live`
- **Readiness**: `GET /health/ready`
- **General Health**: `GET /health`

### Rollback

To rollback to a previous version:

```bash
# List previous revisions
gcloud run revisions list --service=zip-myl-backend --region=us-central1

# Rollback to a specific revision
gcloud run services update-traffic zip-myl-backend \
  --to-revisions=REVISION_NAME=100 \
  --region=us-central1
```

## Security Considerations

1. **Secrets Management**: All sensitive data is stored in Google Secret Manager
2. **Network Security**: Cloud Run services are deployed with proper network policies
3. **Authentication**: JWT-based authentication with secure token management
4. **Rate Limiting**: Redis-based rate limiting to prevent abuse
5. **Audit Logging**: Comprehensive audit logging for security events

## Cost Optimization

1. **Cloud Run**: Configured with min-instances=0 to scale to zero when not in use
2. **Cloud SQL**: Using db-f1-micro instance for development
3. **Redis**: Using basic tier with 1GB memory
4. **Monitoring**: Set up billing alerts to monitor costs

## Support

For issues and questions:

1. Check the application logs in Google Cloud Console
2. Review the health check endpoints
3. Verify environment variables and secrets
4. Check IAM permissions and service account configuration

## Useful Links

- [Google Cloud Console](https://console.cloud.google.com/home/dashboard?project=zip-myl-backend)
- [Cloud Run Service](https://console.cloud.google.com/run/detail/us-central1/zip-myl-backend/overview?project=zip-myl-backend)
- [Cloud SQL Instance](https://console.cloud.google.com/sql/instances/zip-myl-backend-db/overview?project=zip-myl-backend)
- [Redis Instance](https://console.cloud.google.com/memorystore/redis/instances/zip-myl-backend-redis/overview?project=zip-myl-backend)
- [Secret Manager](https://console.cloud.google.com/security/secret-manager?project=zip-myl-backend)
- [GitHub Repository](https://github.com/XDM-ZSBW/zip-myl-backend)
