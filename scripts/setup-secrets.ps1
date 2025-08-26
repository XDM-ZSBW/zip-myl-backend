# Myl.Zip Secret Manager Setup Script (PowerShell)
# This script creates and manages secrets in Google Secret Manager

param(
    [string]$Action = "create",
    [string]$SecretName = "",
    [string]$SecretValue = "",
    [string]$ServiceAccount = "",
    [string]$ProjectId = "zip-myl-backend",
    [string]$SecretPrefix = "myl-zip"
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

# Check if gcloud is installed and authenticated
function Test-GCloud {
    if (-not (Get-Command gcloud -ErrorAction SilentlyContinue)) {
        Write-Error "gcloud CLI is not installed. Please install it first."
        exit 1
    }

    $activeAccount = gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>$null
    if (-not $activeAccount) {
        Write-Error "No active gcloud authentication found. Please run 'gcloud auth login'"
        exit 1
    }

    Write-Success "gcloud is authenticated as: $activeAccount"
}

# Enable Secret Manager API
function Enable-SecretManager {
    Write-Info "Enabling Secret Manager API..."
    
    gcloud services enable secretmanager.googleapis.com --project=$ProjectId
    
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to enable Secret Manager API"
        exit 1
    }
    
    Write-Success "Secret Manager API enabled"
}

# Generate secure random value
function New-SecureValue {
    param(
        [int]$Length,
        [string]$Format = "base64"
    )
    
    switch ($Format) {
        "base64" {
            $bytes = New-Object byte[] $Length
            [System.Security.Cryptography.RandomNumberGenerator]::GetBytes($bytes)
            return [System.Convert]::ToBase64String($bytes)
        }
        "hex" {
            $bytes = New-Object byte[] $Length
            [System.Security.Cryptography.RandomNumberGenerator]::GetBytes($bytes)
            return [System.Convert]::ToHexString($bytes)
        }
        "uuid" {
            return [System.Guid]::NewGuid().ToString()
        }
        default {
            $bytes = New-Object byte[] $Length
            [System.Security.Cryptography.RandomNumberGenerator]::GetBytes($bytes)
            return [System.Convert]::ToBase64String($bytes)
        }
    }
}

# Create a secret in Secret Manager
function New-Secret {
    param(
        [string]$Name,
        [string]$Value,
        [string]$Description
    )
    
    Write-Info "Creating secret: $Name"
    
    # Check if secret exists
    $secretExists = gcloud secrets describe $Name --project=$ProjectId 2>$null
    if ($LASTEXITCODE -eq 0) {
        # Update existing secret
        $Value | gcloud secrets versions add $Name --data-file=- --project=$ProjectId
        
        if ($LASTEXITCODE -ne 0) {
            Write-Error "Failed to update secret: $Name"
            return
        }
        
        Write-Success "Secret updated: $Name"
    } else {
        # Create new secret
        $Value | gcloud secrets create $Name --data-file=- --project=$ProjectId --labels="app=myl-zip,environment=production" --replication-policy="automatic"
        
        if ($LASTEXITCODE -ne 0) {
            Write-Error "Failed to create secret: $Name"
            return
        }
        
        Write-Success "Secret created: $Name"
    }
}

# List existing secrets
function Get-ExistingSecrets {
    Write-Info "Listing existing secrets in Secret Manager..."
    
    gcloud secrets list --project=$ProjectId --format="table(name,createTime,replication.automatic)"
}

# Check if existing secrets are available
function Test-ExistingSecrets {
    Write-Info "Checking existing secrets..."
    
    $existingSecrets = @(
        "DATABASE_URL",
        "INTERNAL_API_KEY", 
        "JWT_SECRET",
        "JWT_REFRESH_SECRET",
        "REDIS_PASSWORD"
    )
    
    $allSecretsExist = $true
    foreach ($secret in $existingSecrets) {
        $exists = gcloud secrets describe $secret --project=$ProjectId 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Secret exists: $secret"
        } else {
            Write-Warning "Secret missing: $secret"
            $allSecretsExist = $false
        }
    }
    
    if ($allSecretsExist) {
        Write-Success "All required secrets are available"
    } else {
        Write-Warning "Some secrets are missing. You may need to create them manually."
    }
    
    return $allSecretsExist
}

# List all secrets
function Get-Secrets {
    Write-Info "Listing all Myl.Zip secrets..."
    
    gcloud secrets list --project=$ProjectId --filter="labels.app=myl-zip" --format="table(name,createTime,labels.environment)"
}

# Get secret value
function Get-SecretValue {
    param([string]$Name)
    
    gcloud secrets versions access latest --secret=$Name --project=$ProjectId
}

# Grant access to existing secrets
function Grant-SecretAccess {
    param([string]$ServiceAccount)
    
    Write-Info "Granting secret access to service account: $ServiceAccount"
    
    $existingSecrets = @(
        "DATABASE_URL",
        "INTERNAL_API_KEY", 
        "JWT_SECRET",
        "JWT_REFRESH_SECRET",
        "REDIS_PASSWORD"
    )
    
    foreach ($secret in $existingSecrets) {
        gcloud secrets add-iam-policy-binding $secret --member="serviceAccount:$ServiceAccount" --role="roles/secretmanager.secretAccessor" --project=$ProjectId
        
        if ($LASTEXITCODE -ne 0) {
            Write-Warning "Failed to grant access to secret: $secret"
        } else {
            Write-Success "Access granted to secret: $secret"
        }
    }
    
    Write-Success "Secret access granted to service account"
}

# Update secret value
function Update-Secret {
    param(
        [string]$Name,
        [string]$Value
    )
    
    Write-Info "Updating secret: $Name"
    
    $Value | gcloud secrets versions add $Name --data-file=- --project=$ProjectId
    
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to update secret: $Name"
        return
    }
    
    Write-Success "Secret updated: $Name"
}

# Delete secret
function Remove-Secret {
    param([string]$Name)
    
    Write-Warning "Deleting secret: $Name"
    
    gcloud secrets delete $Name --project=$ProjectId --quiet
    
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to delete secret: $Name"
        return
    }
    
    Write-Success "Secret deleted: $Name"
}

# Main function
function Start-SecretManager {
    switch ($Action) {
        "check" {
            Test-GCloud
            Test-ExistingSecrets
        }
        "list" {
            Test-GCloud
            Get-ExistingSecrets
        }
        "get" {
            if (-not $SecretName) {
                Write-Error "Secret name required for get action"
                exit 1
            }
            Test-GCloud
            Get-SecretValue -Name $SecretName
        }
        "update" {
            if (-not $SecretName -or -not $SecretValue) {
                Write-Error "Secret name and value required for update action"
                exit 1
            }
            Test-GCloud
            Update-Secret -Name $SecretName -Value $SecretValue
        }
        "delete" {
            if (-not $SecretName) {
                Write-Error "Secret name required for delete action"
                exit 1
            }
            Test-GCloud
            Remove-Secret -Name $SecretName
        }
        "grant-access" {
            if (-not $ServiceAccount) {
                Write-Error "Service account required for grant-access action"
                exit 1
            }
            Test-GCloud
            Grant-SecretAccess -ServiceAccount $ServiceAccount
        }
        default {
            Write-Host "Usage: .\setup-secrets.ps1 -Action {check|list|get|update|delete|grant-access}"
            Write-Host ""
            Write-Host "Actions:"
            Write-Host "  check         - Check if existing secrets are available"
            Write-Host "  list          - List all existing secrets"
            Write-Host "  get           - Get secret value (requires -SecretName)"
            Write-Host "  update        - Update secret value (requires -SecretName and -SecretValue)"
            Write-Host "  delete        - Delete secret (requires -SecretName)"
            Write-Host "  grant-access  - Grant access to existing secrets (requires -ServiceAccount)"
            Write-Host ""
            Write-Host "Examples:"
            Write-Host "  .\setup-secrets.ps1 -Action check"
            Write-Host "  .\setup-secrets.ps1 -Action list"
            Write-Host "  .\setup-secrets.ps1 -Action get -SecretName 'JWT_SECRET'"
            Write-Host "  .\setup-secrets.ps1 -Action update -SecretName 'DATABASE_URL' -SecretValue 'postgresql://user:pass@host:port/db'"
            Write-Host "  .\setup-secrets.ps1 -Action grant-access -ServiceAccount 'zip-myl-backend@zip-myl-backend.iam.gserviceaccount.com'"
            exit 1
        }
    }
}

# Run main function
Start-SecretManager
