#!/bin/bash

# Myl.Zip Production Deployment Script
# This script handles secure deployment with proper key management

set -euo pipefail

# Configuration
PROJECT_ID="zip-myl-backend"
SERVICE_NAME="zip-myl-backend"
REGION="us-central1"
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"
VERSION_TAG=$(date +%Y%m%d-%H%M%S)
ENVIRONMENT="production"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required tools are installed
check_dependencies() {
    log_info "Checking dependencies..."
    
    local missing_deps=()
    
    if ! command -v gcloud &> /dev/null; then
        missing_deps+=("gcloud")
    fi
    
    if ! command -v docker &> /dev/null; then
        missing_deps+=("docker")
    fi
    
    if ! command -v kubectl &> /dev/null; then
        missing_deps+=("kubectl")
    fi
    
    if ! command -v jq &> /dev/null; then
        missing_deps+=("jq")
    fi
    
    if [ ${#missing_deps[@]} -ne 0 ]; then
        log_error "Missing required dependencies: ${missing_deps[*]}"
        log_info "Please install the missing dependencies and try again."
        exit 1
    fi
    
    log_success "All dependencies are installed"
}

# Validate environment variables
validate_environment() {
    log_info "Validating environment configuration..."
    
    # Check if we're in the right directory
    if [ ! -f "package.json" ] || [ ! -f "Dockerfile" ]; then
        log_error "This script must be run from the project root directory"
        exit 1
    fi
    
    # Check for required environment variables
    local required_vars=(
        "GOOGLE_APPLICATION_CREDENTIALS"
        "PRODUCTION_DATABASE_URL"
        "JWT_SECRET"
        "ENCRYPTION_MASTER_KEY"
    )
    
    local missing_vars=()
    for var in "${required_vars[@]}"; do
        if [ -z "${!var:-}" ]; then
            missing_vars+=("$var")
        fi
    done
    
    if [ ${#missing_vars[@]} -ne 0 ]; then
        log_error "Missing required environment variables: ${missing_vars[*]}"
        log_info "Please set these environment variables before running the deployment:"
        for var in "${missing_vars[@]}"; do
            echo "  export $var=<value>"
        done
        exit 1
    fi
    
    log_success "Environment validation passed"
}

# Generate secure keys if not provided
generate_keys() {
    log_info "Generating secure keys..."
    
    # Generate JWT secret if not set
    if [ -z "${JWT_SECRET:-}" ]; then
        export JWT_SECRET=$(openssl rand -base64 64)
        log_warning "Generated new JWT_SECRET. Please save this securely!"
        echo "JWT_SECRET=$JWT_SECRET" >> .env.production
    fi
    
    # Generate encryption master key if not set
    if [ -z "${ENCRYPTION_MASTER_KEY:-}" ]; then
        export ENCRYPTION_MASTER_KEY=$(openssl rand -base64 32)
        log_warning "Generated new ENCRYPTION_MASTER_KEY. Please save this securely!"
        echo "ENCRYPTION_MASTER_KEY=$ENCRYPTION_MASTER_KEY" >> .env.production
    fi
    
    # Generate API key for service-to-service communication
    if [ -z "${SERVICE_API_KEY:-}" ]; then
        export SERVICE_API_KEY=$(openssl rand -hex 32)
        log_warning "Generated new SERVICE_API_KEY. Please save this securely!"
        echo "SERVICE_API_KEY=$SERVICE_API_KEY" >> .env.production
    fi
    
    log_success "Key generation completed"
}

# Create production environment file
create_production_env() {
    log_info "Creating production environment configuration..."
    
    cat > .env.production << EOF
# Myl.Zip Production Environment Configuration
# Generated on $(date)

# Application
NODE_ENV=production
PORT=8080
HOST=0.0.0.0

# Database
DATABASE_URL=${PRODUCTION_DATABASE_URL}
DB_POOL_MIN=2
DB_POOL_MAX=10

# Security
JWT_SECRET=${JWT_SECRET}
JWT_EXPIRES_IN=24h
ENCRYPTION_MASTER_KEY=${ENCRYPTION_MASTER_KEY}
SERVICE_API_KEY=${SERVICE_API_KEY}

# CORS
CORS_ORIGIN=https://myl.zip,https://app.myl.zip,https://admin.myl.zip

# Logging
LOG_LEVEL=info
LOG_FORMAT=json

# Monitoring
ENABLE_METRICS=true
METRICS_PORT=9090

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Encryption
ENCRYPTION_ALGORITHM=aes-256-gcm
KEY_DERIVATION_ITERATIONS=100000

# Device Trust
DEVICE_TRUST_EXPIRY_DAYS=365
PAIRING_CODE_EXPIRY_MINUTES=10

# Backup
BACKUP_ENABLED=true
BACKUP_SCHEDULE="0 2 * * *"
BACKUP_RETENTION_DAYS=30

# Health Checks
HEALTH_CHECK_TIMEOUT=5000
LIVENESS_PROBE_PATH=/health/live
READINESS_PROBE_PATH=/health/ready

# Performance
MAX_REQUEST_SIZE=10mb
REQUEST_TIMEOUT=30000
KEEP_ALIVE_TIMEOUT=5000

# Security Headers
SECURITY_HEADERS=true
HSTS_MAX_AGE=31536000
CSP_ENABLED=true

# Feature Flags
ENABLE_DEVICE_TRUST=true
ENABLE_CROSS_DEVICE_SHARING=true
ENABLE_ENCRYPTION=true
ENABLE_AUDIT_LOGGING=true
EOF

    log_success "Production environment file created"
}

# Build and push Docker image
build_and_push_image() {
    log_info "Building and pushing Docker image..."
    
    # Build the image
    log_info "Building Docker image: ${IMAGE_NAME}:${VERSION_TAG}"
    docker build -t "${IMAGE_NAME}:${VERSION_TAG}" -t "${IMAGE_NAME}:latest" .
    
    # Push to Google Container Registry
    log_info "Pushing image to GCR..."
    docker push "${IMAGE_NAME}:${VERSION_TAG}"
    docker push "${IMAGE_NAME}:latest"
    
    log_success "Docker image built and pushed successfully"
}

# Deploy to Cloud Run
deploy_to_cloud_run() {
    log_info "Deploying to Cloud Run..."
    
    # Deploy the service
    gcloud run deploy "${SERVICE_NAME}" \
        --image="${IMAGE_NAME}:${VERSION_TAG}" \
        --platform=managed \
        --region="${REGION}" \
        --allow-unauthenticated \
        --port=8080 \
        --memory=1Gi \
        --cpu=1 \
        --min-instances=1 \
        --max-instances=10 \
        --concurrency=100 \
        --timeout=300 \
        --set-env-vars="NODE_ENV=production" \
        --set-env-vars="PORT=8080" \
        --set-env-vars="HOST=0.0.0.0" \
        --set-env-vars="DATABASE_URL=${PRODUCTION_DATABASE_URL}" \
        --set-env-vars="JWT_SECRET=${JWT_SECRET}" \
        --set-env-vars="ENCRYPTION_MASTER_KEY=${ENCRYPTION_MASTER_KEY}" \
        --set-env-vars="SERVICE_API_KEY=${SERVICE_API_KEY}" \
        --set-env-vars="CORS_ORIGIN=https://myl.zip,https://app.myl.zip,https://admin.myl.zip" \
        --set-env-vars="LOG_LEVEL=info" \
        --set-env-vars="LOG_FORMAT=json" \
        --set-env-vars="ENABLE_METRICS=true" \
        --set-env-vars="RATE_LIMIT_WINDOW_MS=900000" \
        --set-env-vars="RATE_LIMIT_MAX_REQUESTS=100" \
        --set-env-vars="ENCRYPTION_ALGORITHM=aes-256-gcm" \
        --set-env-vars="KEY_DERIVATION_ITERATIONS=100000" \
        --set-env-vars="DEVICE_TRUST_EXPIRY_DAYS=365" \
        --set-env-vars="PAIRING_CODE_EXPIRY_MINUTES=10" \
        --set-env-vars="BACKUP_ENABLED=true" \
        --set-env-vars="HEALTH_CHECK_TIMEOUT=5000" \
        --set-env-vars="MAX_REQUEST_SIZE=10mb" \
        --set-env-vars="REQUEST_TIMEOUT=30000" \
        --set-env-vars="SECURITY_HEADERS=true" \
        --set-env-vars="HSTS_MAX_AGE=31536000" \
        --set-env-vars="CSP_ENABLED=true" \
        --set-env-vars="ENABLE_DEVICE_TRUST=true" \
        --set-env-vars="ENABLE_CROSS_DEVICE_SHARING=true" \
        --set-env-vars="ENABLE_ENCRYPTION=true" \
        --set-env-vars="ENABLE_AUDIT_LOGGING=true" \
        --service-account="${SERVICE_NAME}@${PROJECT_ID}.iam.gserviceaccount.com" \
        --project="${PROJECT_ID}"
    
    log_success "Deployment to Cloud Run completed"
}

# Run database migrations
run_migrations() {
    log_info "Running database migrations..."
    
    # Get the service URL
    local service_url=$(gcloud run services describe "${SERVICE_NAME}" --region="${REGION}" --format="value(status.url)")
    
    # Run migrations via the service
    curl -X POST "${service_url}/api/v1/admin/migrate" \
        -H "Authorization: Bearer ${SERVICE_API_KEY}" \
        -H "Content-Type: application/json" \
        --max-time 300
    
    log_success "Database migrations completed"
}

# Verify deployment
verify_deployment() {
    log_info "Verifying deployment..."
    
    # Get the service URL
    local service_url=$(gcloud run services describe "${SERVICE_NAME}" --region="${REGION}" --format="value(status.url)")
    
    # Test health endpoint
    log_info "Testing health endpoint..."
    local health_response=$(curl -s -o /dev/null -w "%{http_code}" "${service_url}/health")
    
    if [ "$health_response" = "200" ]; then
        log_success "Health check passed"
    else
        log_error "Health check failed with status: $health_response"
        exit 1
    fi
    
    # Test encrypted API endpoint
    log_info "Testing encrypted API endpoint..."
    local api_response=$(curl -s -o /dev/null -w "%{http_code}" "${service_url}/api/v1/encrypted/devices/register" -X POST -H "Content-Type: application/json" -d '{"test": "data"}')
    
    if [ "$api_response" = "400" ] || [ "$api_response" = "403" ]; then
        log_success "Encrypted API endpoint is responding correctly"
    else
        log_warning "Encrypted API endpoint returned unexpected status: $api_response"
    fi
    
    # Test CORS headers
    log_info "Testing CORS configuration..."
    local cors_response=$(curl -s -I -H "Origin: https://myl.zip" "${service_url}/health" | grep -i "access-control-allow-origin" || echo "No CORS header found")
    
    if [[ "$cors_response" == *"myl.zip"* ]]; then
        log_success "CORS configuration is correct"
    else
        log_warning "CORS configuration may need adjustment"
    fi
    
    log_success "Deployment verification completed"
}

# Setup monitoring and alerting
setup_monitoring() {
    log_info "Setting up monitoring and alerting..."
    
    # Create uptime check
    gcloud monitoring uptime-checks create http \
        --hostname="myl.zip" \
        --path="/health" \
        --check-interval=60s \
        --timeout=10s \
        --display-name="Myl.Zip Health Check" \
        --project="${PROJECT_ID}" || log_warning "Uptime check creation failed (may already exist)"
    
    # Create alerting policy for high error rate
    cat > alerting-policy.json << EOF
{
  "displayName": "Myl.Zip High Error Rate",
  "conditions": [
    {
      "displayName": "Error rate > 5%",
      "conditionThreshold": {
        "filter": "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"${SERVICE_NAME}\"",
        "comparison": "COMPARISON_GREATER_THAN",
        "thresholdValue": 0.05,
        "duration": "300s",
        "aggregations": [
          {
            "alignmentPeriod": "60s",
            "perSeriesAligner": "ALIGN_RATE",
            "crossSeriesReducer": "REDUCE_MEAN",
            "groupByFields": ["resource.labels.service_name"]
          }
        ]
      }
    }
  ],
  "notificationChannels": [],
  "alertStrategy": {
    "autoClose": "1800s"
  }
}
EOF

    gcloud alpha monitoring policies create --policy-from-file=alerting-policy.json --project="${PROJECT_ID}" || log_warning "Alerting policy creation failed"
    
    log_success "Monitoring and alerting setup completed"
}

# Create backup script
create_backup_script() {
    log_info "Creating backup script..."
    
    cat > scripts/backup-production.sh << 'EOF'
#!/bin/bash

# Myl.Zip Production Backup Script
set -euo pipefail

PROJECT_ID="zip-myl-backend"
BACKUP_BUCKET="gs://${PROJECT_ID}-backups"
DATE=$(date +%Y%m%d-%H%M%S)

# Create backup directory
mkdir -p backups/${DATE}

# Backup database (if using Cloud SQL)
gcloud sql export sql zip-myl-db gs://${PROJECT_ID}-backups/db-backup-${DATE}.sql \
    --project=${PROJECT_ID} || echo "Database backup failed or not configured"

# Backup configuration
cp .env.production backups/${DATE}/env.production
cp -r src/ backups/${DATE}/

# Create backup archive
tar -czf backups/${DATE}.tar.gz -C backups ${DATE}
rm -rf backups/${DATE}

# Upload to Cloud Storage
gsutil cp backups/${DATE}.tar.gz ${BACKUP_BUCKET}/

# Clean up old backups (keep last 30 days)
find backups/ -name "*.tar.gz" -mtime +30 -delete

echo "Backup completed: ${DATE}.tar.gz"
EOF

    chmod +x scripts/backup-production.sh
    
    log_success "Backup script created"
}

# Main deployment function
main() {
    log_info "Starting Myl.Zip production deployment..."
    log_info "Version: ${VERSION_TAG}"
    log_info "Environment: ${ENVIRONMENT}"
    
    # Run deployment steps
    check_dependencies
    validate_environment
    generate_keys
    create_production_env
    build_and_push_image
    deploy_to_cloud_run
    run_migrations
    verify_deployment
    setup_monitoring
    create_backup_script
    
    # Get final service URL
    local service_url=$(gcloud run services describe "${SERVICE_NAME}" --region="${REGION}" --format="value(status.url)")
    
    log_success "Production deployment completed successfully!"
    log_info "Service URL: ${service_url}"
    log_info "Version: ${VERSION_TAG}"
    log_info "Environment: ${ENVIRONMENT}"
    
    # Display important information
    echo ""
    log_info "Important Information:"
    echo "  - Service URL: ${service_url}"
    echo "  - Health Check: ${service_url}/health"
    echo "  - API Documentation: ${service_url}/docs"
    echo "  - Encrypted API: ${service_url}/api/v1/encrypted"
    echo ""
    log_warning "Security Notes:"
    echo "  - Save the generated keys securely"
    echo "  - Update DNS records to point to the service URL"
    echo "  - Configure SSL certificates for custom domains"
    echo "  - Review and test all security configurations"
    echo ""
    log_info "Next Steps:"
    echo "  1. Update DNS records"
    echo "  2. Configure SSL certificates"
    echo "  3. Test all endpoints"
    echo "  4. Set up monitoring alerts"
    echo "  5. Configure backup schedules"
}

# Run main function
main "$@"
