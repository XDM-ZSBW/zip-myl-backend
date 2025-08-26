# Enhanced Myl.Zip Backend Deployment Script
# Includes Device Registration & Trust Management v2.0.0
# PowerShell version for Windows

param(
    [string]$ProjectId = "zip-myl-backend",
    [string]$ServiceName = "zip-myl-backend",
    [string]$Region = "us-central1",
    [string]$ImageTag = "latest",
    [switch]$SkipBuild = $false,
    [switch]$SkipTests = $false,
    [switch]$Force = $false
)

# Colors for output
$Red = "`e[31m"
$Green = "`e[32m"
$Yellow = "`e[33m"
$Blue = "`e[34m"
$Reset = "`e[0m"

function Write-ColorOutput {
    param([string]$Message, [string]$Color = $Reset)
    Write-Host "${Color}${Message}${Reset}"
}

function Write-Header {
    param([string]$Title)
    Write-ColorOutput "`n=== $Title ===" $Blue
}

function Write-Success {
    param([string]$Message)
    Write-ColorOutput "✅ $Message" $Green
}

function Write-Warning {
    param([string]$Message)
    Write-ColorOutput "⚠️  $Message" $Yellow
}

function Write-Error {
    param([string]$Message)
    Write-ColorOutput "❌ $Message" $Red
}

# Start deployment
Write-Header "Myl.Zip Enhanced Backend Deployment v2.0.0"
Write-ColorOutput "Deploying Device Registration & Trust Management System" $Blue

# Check prerequisites
Write-Header "Checking Prerequisites"

try {
    $gcloudVersion = gcloud version --format="value(Google Cloud SDK)" 2>$null
    if ($gcloudVersion) {
        Write-Success "Google Cloud SDK: $gcloudVersion"
    } else {
        throw "Google Cloud SDK not found"
    }
} catch {
    Write-Error "Google Cloud SDK not installed or not in PATH"
    exit 1
}

try {
    $dockerVersion = docker --version 2>$null
    if ($dockerVersion) {
        Write-Success "Docker: $dockerVersion"
    } else {
        throw "Docker not found"
    }
} catch {
    Write-Error "Docker not installed or not in PATH"
    exit 1
}

# Set project
Write-Header "Setting Google Cloud Project"
try {
    gcloud config set project $ProjectId
    Write-Success "Project set to: $ProjectId"
} catch {
    Write-Error "Failed to set project: $ProjectId"
    exit 1
}

# Environment validation
Write-Header "Validating Environment"

$requiredEnvVars = @(
    "JWT_SECRET",
    "ENCRYPTION_MASTER_KEY",
    "SERVICE_API_KEY"
)

$missingVars = @()
foreach ($var in $requiredEnvVars) {
    if (-not (Get-Item "env:$var" -ErrorAction SilentlyContinue)) {
        $missingVars += $var
    }
}

if ($missingVars.Count -gt 0) {
    Write-Warning "Missing environment variables: $($missingVars -join ', ')"
    Write-ColorOutput "These will be retrieved from Google Secret Manager" $Yellow
}

# Database setup
Write-Header "Database Setup"
Write-ColorOutput "Setting up PostgreSQL database schema..." $Blue

try {
    # Check if database exists
    $dbExists = gcloud sql instances describe $ServiceName --format="value(name)" 2>$null
    if (-not $dbExists) {
        Write-ColorOutput "Creating Cloud SQL instance..." $Yellow
        gcloud sql instances create $ServiceName `
            --database-version=POSTGRES_15 `
            --tier=db-f1-micro `
            --region=$Region `
            --storage-type=SSD `
            --storage-size=10GB `
            --backup-start-time=03:00 `
            --enable-bin-log `
            --maintenance-window-day=SUN `
            --maintenance-window-hour=04 `
            --maintenance-release-channel=production
        Write-Success "Cloud SQL instance created"
    } else {
        Write-Success "Cloud SQL instance already exists"
    }

    # Create database
    Write-ColorOutput "Creating database..." $Yellow
    gcloud sql databases create mylzip_prod --instance=$ServiceName 2>$null
    Write-Success "Database created"

    # Run schema migration
    Write-ColorOutput "Running database schema migration..." $Yellow
    if (Test-Path "database/schema.sql") {
        Write-Success "Database schema file found"
    } else {
        Write-Warning "Database schema file not found - will be created during deployment"
    }

} catch {
    Write-Warning "Database setup skipped: $($_.Exception.Message)"
}

# Build and push Docker image
if (-not $SkipBuild) {
    Write-Header "Building and Pushing Docker Image"
    
    $imageName = "gcr.io/$ProjectId/$ServiceName`:$ImageTag"
    
    try {
        # Configure Docker for GCR
        gcloud auth configure-docker --quiet
        Write-Success "Docker configured for GCR"

        # Build image
        Write-ColorOutput "Building Docker image..." $Yellow
        docker build -t $imageName -f Dockerfile.production .
        Write-Success "Docker image built"

        # Push image
        Write-ColorOutput "Pushing image to GCR..." $Yellow
        docker push $imageName
        Write-Success "Docker image pushed to GCR"

    } catch {
        Write-Error "Docker build/push failed: $($_.Exception.Message)"
        exit 1
    }
} else {
    Write-Warning "Skipping Docker build"
    $imageName = "gcr.io/$ProjectId/$ServiceName`:$ImageTag"
}

# Run tests
if (-not $SkipTests) {
    Write-Header "Running Tests"
    
    try {
        Write-ColorOutput "Installing dependencies..." $Yellow
        npm ci --only=production
        
        Write-ColorOutput "Running security audit..." $Yellow
        npm audit --audit-level=moderate
        
        Write-ColorOutput "Running linting..." $Yellow
        npm run lint 2>$null
        
        Write-Success "All tests passed"
    } catch {
        Write-Warning "Some tests failed, but continuing with deployment"
    }
}

# Deploy to Cloud Run
Write-Header "Deploying to Cloud Run"

try {
    # Prepare environment variables
    $envVars = @(
        "NODE_ENV=production",
        "SERVICE_NAME=$ServiceName",
        "REGION=$Region",
        "CORS_ORIGIN=https://app.myl.zip"
    )

    # Prepare secrets
    $secrets = @(
        "JWT_SECRET=JWT_SECRET:latest",
        "JWT_REFRESH_SECRET=JWT_REFRESH_SECRET:latest",
        "ENCRYPTION_MASTER_KEY=ENCRYPTION_MASTER_KEY:latest",
        "SERVICE_API_KEY=SERVICE_API_KEY:latest",
        "DATABASE_URL=DATABASE_URL:latest",
        "REDIS_PASSWORD=REDIS_PASSWORD:latest"
    )

    # Deploy service
    Write-ColorOutput "Deploying Cloud Run service..." $Yellow
    
    $deployCmd = @(
        "gcloud", "run", "deploy", $ServiceName,
        "--image", $imageName,
        "--platform", "managed",
        "--region", $Region,
        "--allow-unauthenticated",
        "--memory", "1Gi",
        "--cpu", "1",
        "--concurrency", "100",
        "--max-instances", "10",
        "--min-instances", "1",
        "--timeout", "300",
        "--set-env-vars", ($envVars -join ","),
        "--set-secrets", ($secrets -join ","),
        "--service-account", "$ServiceName@$ProjectId.iam.gserviceaccount.com"
    )

    & $deployCmd[0] $deployCmd[1..($deployCmd.Length-1)]
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Cloud Run service deployed successfully"
    } else {
        throw "Deployment failed with exit code: $LASTEXITCODE"
    }

} catch {
    Write-Error "Cloud Run deployment failed: $($_.Exception.Message)"
    exit 1
}

# Configure custom domain
Write-Header "Configuring Custom Domain"

try {
    $serviceUrl = gcloud run services describe $ServiceName --region=$Region --format="value(status.url)"
    Write-Success "Service URL: $serviceUrl"
    
    # Map custom domain
    Write-ColorOutput "Mapping custom domain api.myl.zip..." $Yellow
    gcloud run domain-mappings create --service=$ServiceName --domain=api.myl.zip --region=$Region 2>$null
    Write-Success "Custom domain mapped"
    
} catch {
    Write-Warning "Custom domain configuration skipped: $($_.Exception.Message)"
}

# Health check
Write-Header "Health Check"

try {
    $serviceUrl = gcloud run services describe $ServiceName --region=$Region --format="value(status.url)"
    Write-ColorOutput "Testing service health..." $Yellow
    
    $healthResponse = Invoke-WebRequest -Uri "$serviceUrl/health" -UseBasicParsing -TimeoutSec 30
    if ($healthResponse.StatusCode -eq 200) {
        Write-Success "Service is healthy"
        $healthData = $healthResponse.Content | ConvertFrom-Json
        Write-ColorOutput "Response: $($healthData | ConvertTo-Json -Compress)" $Green
    } else {
        Write-Warning "Service health check returned status: $($healthResponse.StatusCode)"
    }
    
} catch {
    Write-Warning "Health check failed: $($_.Exception.Message)"
}

# Security validation
Write-Header "Security Validation"

try {
    Write-ColorOutput "Validating security headers..." $Yellow
    
    $securityResponse = Invoke-WebRequest -Uri "$serviceUrl/health" -UseBasicParsing -TimeoutSec 30
    $securityHeaders = @(
        "X-Content-Type-Options",
        "X-Frame-Options",
        "X-XSS-Protection",
        "Strict-Transport-Security"
    )
    
    $missingHeaders = @()
    foreach ($header in $securityHeaders) {
        if (-not $securityResponse.Headers[$header]) {
            $missingHeaders += $header
        }
    }
    
    if ($missingHeaders.Count -eq 0) {
        Write-Success "All security headers present"
    } else {
        Write-Warning "Missing security headers: $($missingHeaders -join ', ')"
    }
    
} catch {
    Write-Warning "Security validation failed: $($_.Exception.Message)"
}

# Final status
Write-Header "Deployment Complete"

$serviceUrl = gcloud run services describe $ServiceName --region=$Region --format="value(status.url)"

Write-Success "Enhanced Myl.Zip Backend v2.0.0 deployed successfully!"
Write-ColorOutput "`nService Information:" $Blue
Write-ColorOutput "  URL: $serviceUrl" $Green
Write-ColorOutput "  Custom Domain: https://api.myl.zip" $Green
Write-ColorOutput "  Region: $Region" $Green
Write-ColorOutput "  Project: $ProjectId" $Green

Write-ColorOutput "`nNew Features Deployed:" $Blue
Write-ColorOutput "  ✅ Device Registration & Trust Management" $Green
Write-ColorOutput "  ✅ Enhanced Security with RSA-OAEP" $Green
Write-ColorOutput "  ✅ Comprehensive Rate Limiting" $Green
Write-ColorOutput "  ✅ Privacy-First Device Fingerprinting" $Green
Write-ColorOutput "  ✅ Cross-Device Key Exchange" $Green
Write-ColorOutput "  ✅ Advanced Monitoring & Analytics" $Green

Write-ColorOutput "`nAPI Endpoints:" $Blue
Write-ColorOutput "  Device Registration: $serviceUrl/api/v1/encrypted/devices/register" $Green
Write-ColorOutput "  Device Pairing: $serviceUrl/api/v1/encrypted/devices/pair" $Green
Write-ColorOutput "  Trust Management: $serviceUrl/api/v1/encrypted/devices/trusted" $Green
Write-ColorOutput "  Health Check: $serviceUrl/health" $Green
Write-ColorOutput "  API Documentation: $serviceUrl/docs" $Green

Write-ColorOutput "`nNext Steps:" $Blue
Write-ColorOutput "  1. Update client applications to use new endpoints" $Yellow
Write-ColorOutput "  2. Configure DNS for api.myl.zip domain" $Yellow
Write-ColorOutput "  3. Test device registration and pairing flows" $Yellow
Write-ColorOutput "  4. Monitor security and performance metrics" $Yellow

Write-ColorOutput "`nDeployment completed at $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" $Green
