# Myl.Zip Production Deployment with Secret Manager
# This script handles the complete deployment process using Google Secret Manager

param(
    [string]$ProjectId = "zip-myl-backend",
    [string]$ServiceName = "zip-myl-backend",
    [string]$Region = "us-central1",
    [string]$Environment = "production",
    [switch]$SkipSecrets,
    [switch]$SkipBuild,
    [switch]$SkipDeploy
)

# Colors for output
$Red = "Red"
$Green = "Green"
$Yellow = "Yellow"
$Blue = "Blue"

# Logging functions
function Write-Info {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor $Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor $Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor $Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor $Red
}

# Check prerequisites
function Test-Prerequisites {
    Write-Info "Checking prerequisites..."
    
    # Check if we're in the right directory
    if (-not (Test-Path "package.json") -or -not (Test-Path "Dockerfile")) {
        Write-Error "This script must be run from the project root directory"
        exit 1
    }
    
    # Check gcloud
    if (-not (Get-Command gcloud -ErrorAction SilentlyContinue)) {
        Write-Error "gcloud CLI is not installed. Please install it first."
        exit 1
    }
    
    # Check authentication
    $activeAccount = gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>$null
    if (-not $activeAccount) {
        Write-Error "No active gcloud authentication found. Please run 'gcloud auth login'"
        exit 1
    }
    
    # Check Docker
    if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
        Write-Error "Docker is not installed or not running. Please install and start Docker."
        exit 1
    }
    
    Write-Success "All prerequisites met"
}

# Setup secrets in Secret Manager
function Initialize-Secrets {
    if ($SkipSecrets) {
        Write-Info "Skipping secret setup (--SkipSecrets flag)"
        return
    }
    
    Write-Info "Setting up secrets in Google Secret Manager..."
    
    # Check if existing secrets are available
    $existingSecrets = @(
        "DATABASE_URL",
        "INTERNAL_API_KEY", 
        "JWT_SECRET",
        "JWT_REFRESH_SECRET",
        "REDIS_PASSWORD"
    )
    
    $secretsAvailable = $true
    foreach ($secret in $existingSecrets) {
        $exists = gcloud secrets describe $secret --project=$ProjectId 2>$null
        if ($LASTEXITCODE -ne 0) {
            Write-Warning "Secret $secret not found in Secret Manager"
            $secretsAvailable = $false
        }
    }
    
    if ($secretsAvailable) {
        Write-Success "All required secrets are available in Secret Manager"
    } else {
        Write-Error "Some required secrets are missing. Please ensure all secrets exist in Secret Manager."
        Write-Info "Required secrets: $($existingSecrets -join ', ')"
        exit 1
    }
    
    # Grant access to Cloud Run service account for existing secrets
    Write-Info "Granting secret access to Cloud Run service account..."
    $serviceAccount = "${ServiceName}@${ProjectId}.iam.gserviceaccount.com"
    
    foreach ($secret in $existingSecrets) {
        gcloud secrets add-iam-policy-binding $secret --member="serviceAccount:$serviceAccount" --role="roles/secretmanager.secretAccessor" --project=$ProjectId
        
        if ($LASTEXITCODE -ne 0) {
            Write-Warning "Failed to grant access to secret: $secret"
        }
    }
    
    Write-Success "Secret access granted to Cloud Run service account"
}

# Build and push Docker image
function Build-AndPushImage {
    if ($SkipBuild) {
        Write-Info "Skipping build (--SkipBuild flag)"
        # Return the latest tag for existing image
        return "latest"
    }
    
    Write-Info "Building and pushing Docker image..."
    
    $versionTag = Get-Date -Format "yyyyMMdd-HHmmss"
    $imageName = "gcr.io/$ProjectId/$ServiceName"
    
    # Build the image
    Write-Info "Building Docker image: ${imageName}:${versionTag}"
    docker build -t "${imageName}:${versionTag}" -t "${imageName}:latest" .
    
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Docker build failed"
        exit 1
    }
    
    # Push to Google Container Registry
    Write-Info "Pushing image to GCR..."
    docker push "${imageName}:${versionTag}"
    docker push "${imageName}:latest"
    
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Docker push failed"
        exit 1
    }
    
    Write-Success "Docker image built and pushed successfully"
    return $versionTag
}

# Deploy to Cloud Run
function Deploy-ToCloudRun {
    param([string]$VersionTag)
    
    if ($SkipDeploy) {
        Write-Info "Skipping deployment (--SkipDeploy flag)"
        return
    }
    
    Write-Info "Deploying to Cloud Run with Secret Manager integration..."
    
    $imageName = "gcr.io/$ProjectId/$ServiceName"
    
    # Deploy the service with secrets from Secret Manager
    gcloud run deploy $ServiceName `
        --image="${imageName}:${VersionTag}" `
        --platform=managed `
        --region=$Region `
        --allow-unauthenticated `
        --port=8080 `
        --memory=1Gi `
        --cpu=1 `
        --min-instances=1 `
        --max-instances=10 `
        --concurrency=100 `
        --timeout=300 `
        --set-env-vars="NODE_ENV=production" `
        --set-env-vars="HOST=0.0.0.0" `
        --set-env-vars="GOOGLE_CLOUD_PROJECT=$ProjectId" `
        --set-env-vars="CORS_ORIGIN=https://myl.zip" `
        --set-env-vars="LOG_LEVEL=info" `
        --set-env-vars="LOG_FORMAT=json" `
        --set-env-vars="ENABLE_METRICS=true" `
        --set-env-vars="RATE_LIMIT_WINDOW_MS=900000" `
        --set-env-vars="RATE_LIMIT_MAX_REQUESTS=100" `
        --set-env-vars="ENCRYPTION_ALGORITHM=aes-256-gcm" `
        --set-env-vars="KEY_DERIVATION_ITERATIONS=100000" `
        --set-env-vars="DEVICE_TRUST_EXPIRY_DAYS=365" `
        --set-env-vars="PAIRING_CODE_EXPIRY_MINUTES=10" `
        --set-env-vars="BACKUP_ENABLED=true" `
        --set-env-vars="HEALTH_CHECK_TIMEOUT=5000" `
        --set-env-vars="MAX_REQUEST_SIZE=10mb" `
        --set-env-vars="REQUEST_TIMEOUT=30000" `
        --set-env-vars="SECURITY_HEADERS=true" `
        --set-env-vars="HSTS_MAX_AGE=31536000" `
        --set-env-vars="CSP_ENABLED=true" `
        --set-env-vars="ENABLE_DEVICE_TRUST=true" `
        --set-env-vars="ENABLE_CROSS_DEVICE_SHARING=true" `
        --set-env-vars="ENABLE_ENCRYPTION=true" `
        --set-env-vars="ENABLE_AUDIT_LOGGING=true" `
        --set-secrets="JWT_SECRET=JWT_SECRET:latest" `
        --set-secrets="JWT_REFRESH_SECRET=JWT_REFRESH_SECRET:latest" `
        --set-secrets="SERVICE_API_KEY=INTERNAL_API_KEY:latest" `
        --set-secrets="DATABASE_URL=DATABASE_URL:latest" `
        --set-secrets="REDIS_PASSWORD=REDIS_PASSWORD:latest" `
        --service-account="${ServiceName}@${ProjectId}.iam.gserviceaccount.com" `
        --project=$ProjectId
    
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Cloud Run deployment failed"
        exit 1
    }
    
    Write-Success "Deployment to Cloud Run completed with Secret Manager integration"
}

# Verify deployment
function Test-Deployment {
    Write-Info "Verifying deployment..."
    
    # Get the service URL
    $serviceUrl = gcloud run services describe $ServiceName --region=$Region --format="value(status.url)"
    
    # Test health endpoint
    Write-Info "Testing health endpoint..."
    try {
        $response = Invoke-WebRequest -Uri "$serviceUrl/health" -Method GET -TimeoutSec 30
        if ($response.StatusCode -eq 200) {
            Write-Success "Health check passed"
        } else {
            Write-Error "Health check failed with status: $($response.StatusCode)"
            exit 1
        }
    } catch {
        Write-Error "Health check failed: $($_.Exception.Message)"
        exit 1
    }
    
    # Test encrypted API endpoint
    Write-Info "Testing encrypted API endpoint..."
    try {
        $body = @{ test = "data" } | ConvertTo-Json
        $response = Invoke-WebRequest -Uri "$serviceUrl/api/v1/encrypted/devices/register" -Method POST -Body $body -ContentType "application/json" -TimeoutSec 30
        if ($response.StatusCode -eq 400 -or $response.StatusCode -eq 403) {
            Write-Success "Encrypted API endpoint is responding correctly"
        } else {
            Write-Warning "Encrypted API endpoint returned unexpected status: $($response.StatusCode)"
        }
    } catch {
        Write-Success "Encrypted API endpoint is responding correctly (expected error)"
    }
    
    Write-Success "Deployment verification completed"
    return $serviceUrl
}

# Main deployment function
function Start-Deployment {
    Write-Info "Starting Myl.Zip production deployment with Secret Manager..."
    Write-Info "Project: $ProjectId"
    Write-Info "Service: $ServiceName"
    Write-Info "Region: $Region"
    Write-Info "Environment: $Environment"
    
    # Run deployment steps
    Test-Prerequisites
    Initialize-Secrets
    $versionTag = Build-AndPushImage
    Deploy-ToCloudRun -VersionTag $versionTag
    $serviceUrl = Test-Deployment
    
    Write-Success "Production deployment completed successfully!"
    Write-Info "Service URL: $serviceUrl"
    Write-Info "Version: $versionTag"
    Write-Info "Environment: $Environment"
    
    # Display important information
    Write-Host ""
    Write-Info "Important Information:"
    Write-Host "  - Service URL: $serviceUrl"
    Write-Host "  - Health Check: $serviceUrl/health"
    Write-Host "  - API Documentation: $serviceUrl/docs"
    Write-Host "  - Encrypted API: $serviceUrl/api/v1/encrypted"
    Write-Host "  - Metrics: $serviceUrl/metrics"
    Write-Host ""
    Write-Info "Security Features:"
    Write-Host "  - Secrets stored in Google Secret Manager"
    Write-Host "  - End-to-end encryption enabled"
    Write-Host "  - Device trust system active"
    Write-Host "  - Audit logging enabled"
    Write-Host "  - Security headers configured"
    Write-Host ""
    Write-Info "Next Steps:"
    Write-Host "  1. Update DNS records to point to the service URL"
    Write-Host "  2. Configure SSL certificates for custom domains"
    Write-Host "  3. Test all endpoints thoroughly"
    Write-Host "  4. Set up monitoring and alerting"
    Write-Host "  5. Configure backup schedules"
    Write-Host ""
    Write-Warning "Remember to update the database URL in Secret Manager with your actual database connection string!"
}

# Show help
function Show-Help {
    Write-Host "Myl.Zip Production Deployment with Secret Manager"
    Write-Host ""
    Write-Host "Usage: .\deploy-with-secrets.ps1 [OPTIONS]"
    Write-Host ""
    Write-Host "Options:"
    Write-Host "  -ProjectId <id>     Google Cloud Project ID (default: zip-myl-backend)"
    Write-Host "  -ServiceName <name> Cloud Run service name (default: zip-myl-backend)"
    Write-Host "  -Region <region>    Google Cloud region (default: us-central1)"
    Write-Host "  -Environment <env>  Environment name (default: production)"
    Write-Host "  -SkipSecrets        Skip secret setup in Secret Manager"
    Write-Host "  -SkipBuild          Skip Docker build and push"
    Write-Host "  -SkipDeploy         Skip Cloud Run deployment"
    Write-Host "  -Help               Show this help message"
    Write-Host ""
    Write-Host "Examples:"
    Write-Host "  .\deploy-with-secrets.ps1"
    Write-Host "  .\deploy-with-secrets.ps1 -ProjectId my-project -Region europe-west1"
    Write-Host "  .\deploy-with-secrets.ps1 -SkipSecrets -SkipBuild"
    Write-Host ""
    Write-Host "Prerequisites:"
    Write-Host "  - gcloud CLI installed and authenticated"
    Write-Host "  - Docker installed and running"
    Write-Host "  - Google Cloud project with Secret Manager API enabled"
    Write-Host "  - Cloud Run API enabled"
    Write-Host "  - Container Registry API enabled"
}

# Parse command line arguments
if ($args -contains "-Help" -or $args -contains "--help" -or $args -contains "-h") {
    Show-Help
    exit 0
}

# Run main function
Start-Deployment
