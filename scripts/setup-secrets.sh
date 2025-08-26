#!/bin/bash

# Myl.Zip Secret Manager Setup Script
# This script creates and manages secrets in Google Secret Manager

set -euo pipefail

# Configuration
PROJECT_ID="zip-myl-backend"
SECRET_PREFIX="myl-zip"

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

# Check if gcloud is installed and authenticated
check_gcloud() {
    if ! command -v gcloud &> /dev/null; then
        log_error "gcloud CLI is not installed. Please install it first."
        exit 1
    fi

    if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
        log_error "No active gcloud authentication found. Please run 'gcloud auth login'"
        exit 1
    fi

    log_success "gcloud is authenticated"
}

# Enable Secret Manager API
enable_secret_manager() {
    log_info "Enabling Secret Manager API..."
    
    gcloud services enable secretmanager.googleapis.com --project="${PROJECT_ID}"
    
    log_success "Secret Manager API enabled"
}

# Create a secret in Secret Manager
create_secret() {
    local secret_name="$1"
    local secret_value="$2"
    local description="$3"
    
    log_info "Creating secret: ${secret_name}"
    
    # Create the secret if it doesn't exist
    if ! gcloud secrets describe "${secret_name}" --project="${PROJECT_ID}" &> /dev/null; then
        echo -n "${secret_value}" | gcloud secrets create "${secret_name}" \
            --data-file=- \
            --project="${PROJECT_ID}" \
            --labels="app=myl-zip,environment=production" \
            --replication-policy="automatic"
        
        log_success "Secret created: ${secret_name}"
    else
        # Update existing secret
        echo -n "${secret_value}" | gcloud secrets versions add "${secret_name}" \
            --data-file=- \
            --project="${PROJECT_ID}"
        
        log_success "Secret updated: ${secret_name}"
    fi
}

# Generate secure random value
generate_secure_value() {
    local length="$1"
    local format="$2"
    
    case "$format" in
        "base64")
            openssl rand -base64 "$length"
            ;;
        "hex")
            openssl rand -hex "$length"
            ;;
        "uuid")
            uuidgen
            ;;
        *)
            openssl rand -base64 "$length"
            ;;
    esac
}

# Create all required secrets
create_all_secrets() {
    log_info "Creating all required secrets..."
    
    # JWT Secret (64 bytes base64)
    local jwt_secret=$(generate_secure_value 64 "base64")
    create_secret "${SECRET_PREFIX}-jwt-secret" "$jwt_secret" "JWT signing secret for authentication tokens"
    
    # Encryption Master Key (32 bytes base64)
    local encryption_key=$(generate_secure_value 32 "base64")
    create_secret "${SECRET_PREFIX}-encryption-master-key" "$encryption_key" "Master encryption key for end-to-end encryption"
    
    # Service API Key (32 bytes hex)
    local service_api_key=$(generate_secure_value 32 "hex")
    create_secret "${SECRET_PREFIX}-service-api-key" "$service_api_key" "API key for service-to-service communication"
    
    # Database URL (placeholder - should be set manually)
    local db_url="postgresql://username:password@host:port/database"
    create_secret "${SECRET_PREFIX}-database-url" "$db_url" "Production database connection string"
    
    # Google Cloud credentials (placeholder - should be set manually)
    local gcp_credentials="path/to/service-account.json"
    create_secret "${SECRET_PREFIX}-gcp-credentials" "$gcp_credentials" "Google Cloud service account credentials"
    
    log_success "All secrets created successfully"
}

# List all secrets
list_secrets() {
    log_info "Listing all Myl.Zip secrets..."
    
    gcloud secrets list --project="${PROJECT_ID}" --filter="labels.app=myl-zip" --format="table(name,createTime,labels.environment)"
}

# Get secret value
get_secret_value() {
    local secret_name="$1"
    
    gcloud secrets versions access latest --secret="${secret_name}" --project="${PROJECT_ID}"
}

# Grant access to secrets
grant_secret_access() {
    local service_account="$1"
    
    log_info "Granting secret access to service account: ${service_account}"
    
    local secrets=(
        "${SECRET_PREFIX}-jwt-secret"
        "${SECRET_PREFIX}-encryption-master-key"
        "${SECRET_PREFIX}-service-api-key"
        "${SECRET_PREFIX}-database-url"
        "${SECRET_PREFIX}-gcp-credentials"
    )
    
    for secret in "${secrets[@]}"; do
        gcloud secrets add-iam-policy-binding "${secret}" \
            --member="serviceAccount:${service_account}" \
            --role="roles/secretmanager.secretAccessor" \
            --project="${PROJECT_ID}"
    done
    
    log_success "Secret access granted to service account"
}

# Update secret value
update_secret() {
    local secret_name="$1"
    local new_value="$2"
    
    log_info "Updating secret: ${secret_name}"
    
    echo -n "${new_value}" | gcloud secrets versions add "${secret_name}" \
        --data-file=- \
        --project="${PROJECT_ID}"
    
    log_success "Secret updated: ${secret_name}"
}

# Delete secret
delete_secret() {
    local secret_name="$1"
    
    log_warning "Deleting secret: ${secret_name}"
    
    gcloud secrets delete "${secret_name}" --project="${PROJECT_ID}" --quiet
    
    log_success "Secret deleted: ${secret_name}"
}

# Main function
main() {
    local action="${1:-create}"
    
    case "$action" in
        "create")
            check_gcloud
            enable_secret_manager
            create_all_secrets
            ;;
        "list")
            check_gcloud
            list_secrets
            ;;
        "get")
            if [ -z "${2:-}" ]; then
                log_error "Secret name required for get action"
                exit 1
            fi
            check_gcloud
            get_secret_value "$2"
            ;;
        "update")
            if [ -z "${2:-}" ] || [ -z "${3:-}" ]; then
                log_error "Secret name and value required for update action"
                exit 1
            fi
            check_gcloud
            update_secret "$2" "$3"
            ;;
        "delete")
            if [ -z "${2:-}" ]; then
                log_error "Secret name required for delete action"
                exit 1
            fi
            check_gcloud
            delete_secret "$2"
            ;;
        "grant-access")
            if [ -z "${2:-}" ]; then
                log_error "Service account required for grant-access action"
                exit 1
            fi
            check_gcloud
            grant_secret_access "$2"
            ;;
        *)
            echo "Usage: $0 {create|list|get|update|delete|grant-access}"
            echo ""
            echo "Actions:"
            echo "  create        - Create all required secrets"
            echo "  list          - List all Myl.Zip secrets"
            echo "  get <name>    - Get secret value"
            echo "  update <name> <value> - Update secret value"
            echo "  delete <name> - Delete secret"
            echo "  grant-access <service-account> - Grant access to secrets"
            echo ""
            echo "Examples:"
            echo "  $0 create"
            echo "  $0 list"
            echo "  $0 get myl-zip-jwt-secret"
            echo "  $0 update myl-zip-database-url 'postgresql://user:pass@host:port/db'"
            echo "  $0 grant-access myl-zip-backend@zip-myl-backend.iam.gserviceaccount.com"
            exit 1
            ;;
    esac
}

# Run main function
main "$@"
