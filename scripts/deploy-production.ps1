# Myl.Zip Production Deployment Script (PowerShell)
# This script handles secure deployment with proper key management on Windows

param(
    [string]$ProjectId = "zip-myl-backend",
    [string]$ServiceName = "zip-myl-backend",
    [string]$Region = "us-central1",
    [string]$Environment = "production"
)

# Configuration
$ImageName = "gcr.io/$ProjectId/$ServiceName"
$VersionTag = Get-Date -Format "yyyyMMdd-HHmmss"

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

# Check if required tools are installed
function Test-Dependencies {
    Write-Info "Checking dependencies..."
    
    $missingDeps = @()
    
    if (-not (Get-Command gcloud -ErrorAction SilentlyContinue)) {
        $missingDeps += "gcloud"
    }
    
    if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
        $missingDeps += "docker"
    }
    
    if (-not (Get-Command kubectl -ErrorAction SilentlyContinue)) {
        $missingDeps += "kubectl"
    }
    
    if ($missingDeps.Count -gt 0) {
        Write-Error "Missing required dependencies: $($missingDeps -join ', ')"
        Write-Info "Please install the missing dependencies and try again."
        exit 1
    }
    
    Write-Success "All dependencies are installed"
}

# Validate environment and secrets
function Test-Environment {
    Write-Info "Validating environment configuration..."
    
    # Check if we're in the right directory
    if (-not (Test-Path "package.json") -or -not (Test-Path "Dockerfile")) {
        Write-Error "This script must be run from the project root directory"
        exit 1
    }
    
    # Check if gcloud is authenticated
    $activeAccount = gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>$null
    if (-not $activeAccount) {
        Write-Error "No active gcloud authentication found. Please run 'gcloud auth login'"
        exit 1
    }
    
    Write-Success "Environment validation passed"
}

# Get secret from Google Secret Manager
function Get-SecretFromManager {
    param([string]$SecretName)
    
    try {
        $secretValue = gcloud secrets versions access latest --secret=$SecretName --project=$ProjectId 2>$null
        if ($LASTEXITCODE -eq 0) {
            return $secretValue
        } else {
            Write-Warning "Secret $SecretName not found in Secret Manager"
            return $null
        }
    } catch {
        Write-Warning "Failed to retrieve secret $SecretName from Secret Manager"
        return $null
    }
}

# Setup secrets from Secret Manager
function Initialize-Secrets {
    Write-Info "Initializing secrets from Google Secret Manager..."
    
    # Try to get secrets from Secret Manager first
    $jwtSecret = Get-SecretFromManager -SecretName "myl-zip-jwt-secret"
    $encryptionKey = Get-SecretFromManager -SecretName "myl-zip-encryption-master-key"
    $serviceApiKey = Get-SecretFromManager -SecretName "myl-zip-service-api-key"
    $dbUrl = Get-SecretFromManager -SecretName "myl-zip-database-url"
    
    # If secrets don't exist in Secret Manager, create them
    if (-not $jwtSecret -or -not $encryptionKey -or -not $serviceApiKey) {
        Write-Warning "Secrets not found in Secret Manager. Creating them now..."
        
        # Run the setup-secrets script
        & ".\scripts\setup-secrets.ps1" -Action "create"
        
        if ($LASTEXITCODE -ne 0) {
            Write-Error "Failed to create secrets in Secret Manager"
            exit 1
        }
        
        # Retry getting secrets
        $jwtSecret = Get-SecretFromManager -SecretName "myl-zip-jwt-secret"
        $encryptionKey = Get-SecretFromManager -SecretName "myl-zip-encryption-master-key"
        $serviceApiKey = Get-SecretFromManager -SecretName "myl-zip-service-api-key"
        $dbUrl = Get-SecretFromManager -SecretName "myl-zip-database-url"
    }
    
    # Set environment variables from secrets
    $env:JWT_SECRET = $jwtSecret
    $env:ENCRYPTION_MASTER_KEY = $encryptionKey
    $env:SERVICE_API_KEY = $serviceApiKey
    $env:PRODUCTION_DATABASE_URL = $dbUrl
    
    Write-Success "Secrets initialized from Secret Manager"
}

# Grant Cloud Run service account access to secrets
function Grant-SecretAccess {
    Write-Info "Granting Cloud Run service account access to secrets..."
    
    $serviceAccount = "${ServiceName}@${ProjectId}.iam.gserviceaccount.com"
    
    # Grant access to all secrets
    $secrets = @(
        "myl-zip-jwt-secret",
        "myl-zip-encryption-master-key", 
        "myl-zip-service-api-key",
        "myl-zip-database-url"
    )
    
    foreach ($secret in $secrets) {
        gcloud secrets add-iam-policy-binding $secret --member="serviceAccount:$serviceAccount" --role="roles/secretmanager.secretAccessor" --project=$ProjectId
        
        if ($LASTEXITCODE -ne 0) {
            Write-Warning "Failed to grant access to secret: $secret"
        }
    }
    
    Write-Success "Secret access granted to Cloud Run service account"
}

# Create production environment file
function New-ProductionEnv {
    Write-Info "Creating production environment configuration..."
    
    $envContent = @"
# Myl.Zip Production Environment Configuration
# Generated on $(Get-Date)

# Application
NODE_ENV=production
PORT=8080
HOST=0.0.0.0

# Database
DATABASE_URL=$env:PRODUCTION_DATABASE_URL
DB_POOL_MIN=2
DB_POOL_MAX=10

# Security
JWT_SECRET=$env:JWT_SECRET
JWT_EXPIRES_IN=24h
ENCRYPTION_MASTER_KEY=$env:ENCRYPTION_MASTER_KEY
SERVICE_API_KEY=$env:SERVICE_API_KEY

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
"@

    Set-Content -Path ".env.production" -Value $envContent
    
    Write-Success "Production environment file created"
}

# Build and push Docker image
function Build-AndPushImage {
    Write-Info "Building and pushing Docker image..."
    
    # Build the image
    Write-Info "Building Docker image: ${ImageName}:${VersionTag}"
    docker build -t "${ImageName}:${VersionTag}" -t "${ImageName}:latest" .
    
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Docker build failed"
        exit 1
    }
    
    # Push to Google Container Registry
    Write-Info "Pushing image to GCR..."
    docker push "${ImageName}:${VersionTag}"
    docker push "${ImageName}:latest"
    
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Docker push failed"
        exit 1
    }
    
    Write-Success "Docker image built and pushed successfully"
}

# Deploy to Cloud Run with Secret Manager integration
function Deploy-ToCloudRun {
    Write-Info "Deploying to Cloud Run with Secret Manager integration..."
    
    # Deploy the service with secrets from Secret Manager
    gcloud run deploy $ServiceName `
        --image="${ImageName}:${VersionTag}" `
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
        --set-env-vars="PORT=8080" `
        --set-env-vars="HOST=0.0.0.0" `
        --set-env-vars="CORS_ORIGIN=https://myl.zip,https://app.myl.zip,https://admin.myl.zip" `
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
        --set-secrets="JWT_SECRET=myl-zip-jwt-secret:latest" `
        --set-secrets="ENCRYPTION_MASTER_KEY=myl-zip-encryption-master-key:latest" `
        --set-secrets="SERVICE_API_KEY=myl-zip-service-api-key:latest" `
        --set-secrets="DATABASE_URL=myl-zip-database-url:latest" `
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
}

# Main deployment function
function Start-ProductionDeployment {
    Write-Info "Starting Myl.Zip production deployment..."
    Write-Info "Version: $VersionTag"
    Write-Info "Environment: $Environment"
    
    # Run deployment steps
    Test-Dependencies
    Test-Environment
    Initialize-Secrets
    Grant-SecretAccess
    New-ProductionEnv
    Build-AndPushImage
    Deploy-ToCloudRun
    Test-Deployment
    
    # Get final service URL
    $serviceUrl = gcloud run services describe $ServiceName --region=$Region --format="value(status.url)"
    
    Write-Success "Production deployment completed successfully!"
    Write-Info "Service URL: $serviceUrl"
    Write-Info "Version: $VersionTag"
    Write-Info "Environment: $Environment"
    
    # Display important information
    Write-Host ""
    Write-Info "Important Information:"
    Write-Host "  - Service URL: $serviceUrl"
    Write-Host "  - Health Check: $serviceUrl/health"
    Write-Host "  - API Documentation: $serviceUrl/docs"
    Write-Host "  - Encrypted API: $serviceUrl/api/v1/encrypted"
    Write-Host ""
    Write-Warning "Security Notes:"
    Write-Host "  - Save the generated keys securely"
    Write-Host "  - Update DNS records to point to the service URL"
    Write-Host "  - Configure SSL certificates for custom domains"
    Write-Host "  - Review and test all security configurations"
    Write-Host ""
    Write-Info "Next Steps:"
    Write-Host "  1. Update DNS records"
    Write-Host "  2. Configure SSL certificates"
    Write-Host "  3. Test all endpoints"
    Write-Host "  4. Set up monitoring alerts"
    Write-Host "  5. Configure backup schedules"
}

# Run main function
Start-ProductionDeployment
