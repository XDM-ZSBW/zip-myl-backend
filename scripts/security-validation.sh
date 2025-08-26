#!/bin/bash

# Myl.Zip Security Validation Script
# This script validates security configurations and performs security checks

set -euo pipefail

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

# Security validation results
SECURITY_ISSUES=0
SECURITY_WARNINGS=0

# Check environment variables
validate_environment_variables() {
    log_info "Validating environment variables..."
    
    local required_vars=(
        "JWT_SECRET"
        "ENCRYPTION_MASTER_KEY"
        "SERVICE_API_KEY"
        "DATABASE_URL"
    )
    
    local missing_vars=()
    for var in "${required_vars[@]}"; do
        if [ -z "${!var:-}" ]; then
            missing_vars+=("$var")
        fi
    done
    
    if [ ${#missing_vars[@]} -ne 0 ]; then
        log_error "Missing required environment variables: ${missing_vars[*]}"
        ((SECURITY_ISSUES++))
    else
        log_success "All required environment variables are set"
    fi
    
    # Check for weak secrets
    if [ -n "${JWT_SECRET:-}" ] && [ ${#JWT_SECRET} -lt 32 ]; then
        log_warning "JWT_SECRET is too short (minimum 32 characters recommended)"
        ((SECURITY_WARNINGS++))
    fi
    
    if [ -n "${ENCRYPTION_MASTER_KEY:-}" ] && [ ${#ENCRYPTION_MASTER_KEY} -lt 32 ]; then
        log_warning "ENCRYPTION_MASTER_KEY is too short (minimum 32 characters recommended)"
        ((SECURITY_WARNINGS++))
    fi
}

# Check file permissions
validate_file_permissions() {
    log_info "Validating file permissions..."
    
    local sensitive_files=(
        ".env.production"
        "src/services/keyManagementService.js"
        "src/services/encryptionService.js"
        "src/services/trustService.js"
    )
    
    for file in "${sensitive_files[@]}"; do
        if [ -f "$file" ]; then
            local perms=$(stat -c "%a" "$file" 2>/dev/null || stat -f "%A" "$file" 2>/dev/null)
            if [ "$perms" != "600" ] && [ "$perms" != "640" ]; then
                log_warning "File $file has insecure permissions: $perms (recommended: 600 or 640)"
                ((SECURITY_WARNINGS++))
            else
                log_success "File $file has secure permissions: $perms"
            fi
        fi
    done
}

# Check for hardcoded secrets
check_hardcoded_secrets() {
    log_info "Checking for hardcoded secrets..."
    
    local secret_patterns=(
        "password.*=.*['\"][^'\"]{8,}['\"]"
        "secret.*=.*['\"][^'\"]{8,}['\"]"
        "key.*=.*['\"][^'\"]{8,}['\"]"
        "token.*=.*['\"][^'\"]{8,}['\"]"
    )
    
    local files_to_check=(
        "src/**/*.js"
        "src/**/*.ts"
        "*.js"
        "*.json"
    )
    
    local found_secrets=false
    
    for pattern in "${secret_patterns[@]}"; do
        for file_pattern in "${files_to_check[@]}"; do
            if find . -name "$file_pattern" -type f -exec grep -l -E "$pattern" {} \; 2>/dev/null | grep -v node_modules | grep -v .git; then
                log_warning "Potential hardcoded secret found matching pattern: $pattern"
                found_secrets=true
            fi
        done
    done
    
    if [ "$found_secrets" = false ]; then
        log_success "No hardcoded secrets found"
    else
        ((SECURITY_WARNINGS++))
    fi
}

# Check SSL/TLS configuration
validate_ssl_configuration() {
    log_info "Validating SSL/TLS configuration..."
    
    # Check if HTTPS is enforced
    if [ -n "${CORS_ORIGIN:-}" ]; then
        if [[ "$CORS_ORIGIN" == *"http://"* ]]; then
            log_warning "CORS_ORIGIN contains HTTP URLs (should use HTTPS in production)"
            ((SECURITY_WARNINGS++))
        else
            log_success "CORS_ORIGIN uses HTTPS URLs"
        fi
    fi
    
    # Check security headers
    if [ "${SECURITY_HEADERS:-}" != "true" ]; then
        log_warning "SECURITY_HEADERS is not enabled"
        ((SECURITY_WARNINGS++))
    else
        log_success "Security headers are enabled"
    fi
    
    if [ "${HSTS_MAX_AGE:-}" -lt 31536000 ]; then
        log_warning "HSTS_MAX_AGE is too short (recommended: 31536000 or higher)"
        ((SECURITY_WARNINGS++))
    else
        log_success "HSTS configuration is secure"
    fi
}

# Check encryption configuration
validate_encryption_configuration() {
    log_info "Validating encryption configuration..."
    
    # Check encryption algorithm
    if [ "${ENCRYPTION_ALGORITHM:-}" != "aes-256-gcm" ]; then
        log_warning "ENCRYPTION_ALGORITHM is not set to aes-256-gcm"
        ((SECURITY_WARNINGS++))
    else
        log_success "Encryption algorithm is secure (aes-256-gcm)"
    fi
    
    # Check key derivation iterations
    if [ "${KEY_DERIVATION_ITERATIONS:-}" -lt 100000 ]; then
        log_warning "KEY_DERIVATION_ITERATIONS is too low (recommended: 100000 or higher)"
        ((SECURITY_WARNINGS++))
    else
        log_success "Key derivation iterations are secure"
    fi
    
    # Check if encryption is enabled
    if [ "${ENABLE_ENCRYPTION:-}" != "true" ]; then
        log_error "ENABLE_ENCRYPTION is not enabled"
        ((SECURITY_ISSUES++))
    else
        log_success "Encryption is enabled"
    fi
}

# Check rate limiting configuration
validate_rate_limiting() {
    log_info "Validating rate limiting configuration..."
    
    if [ "${ENABLE_RATE_LIMITING:-}" != "true" ]; then
        log_warning "ENABLE_RATE_LIMITING is not enabled"
        ((SECURITY_WARNINGS++))
    else
        log_success "Rate limiting is enabled"
    fi
    
    if [ "${RATE_LIMIT_MAX_REQUESTS:-}" -gt 1000 ]; then
        log_warning "RATE_LIMIT_MAX_REQUESTS is very high (${RATE_LIMIT_MAX_REQUESTS})"
        ((SECURITY_WARNINGS++))
    else
        log_success "Rate limiting configuration is reasonable"
    fi
}

# Check logging configuration
validate_logging_configuration() {
    log_info "Validating logging configuration..."
    
    if [ "${ENABLE_AUDIT_LOGGING:-}" != "true" ]; then
        log_warning "ENABLE_AUDIT_LOGGING is not enabled"
        ((SECURITY_WARNINGS++))
    else
        log_success "Audit logging is enabled"
    fi
    
    if [ "${LOG_LEVEL:-}" = "debug" ]; then
        log_warning "LOG_LEVEL is set to debug (should be info or higher in production)"
        ((SECURITY_WARNINGS++))
    else
        log_success "Log level is appropriate for production"
    fi
}

# Check database configuration
validate_database_configuration() {
    log_info "Validating database configuration..."
    
    if [ -n "${DATABASE_URL:-}" ]; then
        if [[ "$DATABASE_URL" == *"ssl=true"* ]] || [[ "$DATABASE_URL" == *"sslmode=require"* ]]; then
            log_success "Database SSL is enabled"
        else
            log_warning "Database SSL is not explicitly enabled"
            ((SECURITY_WARNINGS++))
        fi
    fi
    
    if [ "${DB_SSL:-}" != "true" ]; then
        log_warning "DB_SSL is not enabled"
        ((SECURITY_WARNINGS++))
    else
        log_success "Database SSL is configured"
    fi
}

# Check for security vulnerabilities in dependencies
check_dependency_vulnerabilities() {
    log_info "Checking for dependency vulnerabilities..."
    
    if [ -f "package.json" ]; then
        if command -v npm &> /dev/null; then
            if npm audit --audit-level=moderate 2>/dev/null; then
                log_success "No high or moderate vulnerabilities found in dependencies"
            else
                log_warning "Vulnerabilities found in dependencies. Run 'npm audit fix' to resolve."
                ((SECURITY_WARNINGS++))
            fi
        else
            log_warning "npm not available for dependency vulnerability check"
        fi
    else
        log_warning "package.json not found"
    fi
}

# Check Docker security
validate_docker_security() {
    log_info "Validating Docker security..."
    
    if [ -f "Dockerfile" ]; then
        # Check if running as root
        if grep -q "USER root" Dockerfile; then
            log_warning "Dockerfile runs as root user"
            ((SECURITY_WARNINGS++))
        else
            log_success "Dockerfile does not run as root"
        fi
        
        # Check for security updates
        if grep -q "apt-get update" Dockerfile; then
            log_success "Dockerfile includes package updates"
        else
            log_warning "Dockerfile may not include security updates"
            ((SECURITY_WARNINGS++))
        fi
    else
        log_warning "Dockerfile not found"
    fi
}

# Generate security report
generate_security_report() {
    log_info "Generating security report..."
    
    local report_file="security-report-$(date +%Y%m%d-%H%M%S).txt"
    
    cat > "$report_file" << EOF
Myl.Zip Security Validation Report
Generated: $(date)
Environment: ${NODE_ENV:-unknown}

Security Issues: $SECURITY_ISSUES
Security Warnings: $SECURITY_WARNINGS

Environment Variables:
- JWT_SECRET: ${JWT_SECRET:+SET} ${JWT_SECRET:-NOT SET}
- ENCRYPTION_MASTER_KEY: ${ENCRYPTION_MASTER_KEY:+SET} ${ENCRYPTION_MASTER_KEY:-NOT SET}
- SERVICE_API_KEY: ${SERVICE_API_KEY:+SET} ${SERVICE_API_KEY:-NOT SET}
- DATABASE_URL: ${DATABASE_URL:+SET} ${DATABASE_URL:-NOT SET}

Security Configuration:
- Encryption Algorithm: ${ENCRYPTION_ALGORITHM:-not set}
- Key Derivation Iterations: ${KEY_DERIVATION_ITERATIONS:-not set}
- Security Headers: ${SECURITY_HEADERS:-not set}
- Rate Limiting: ${ENABLE_RATE_LIMITING:-not set}
- Audit Logging: ${ENABLE_AUDIT_LOGGING:-not set}
- Database SSL: ${DB_SSL:-not set}

Recommendations:
EOF

    if [ $SECURITY_ISSUES -gt 0 ]; then
        echo "- CRITICAL: Fix security issues before deployment" >> "$report_file"
    fi
    
    if [ $SECURITY_WARNINGS -gt 0 ]; then
        echo "- Review and address security warnings" >> "$report_file"
    fi
    
    echo "- Regularly update dependencies" >> "$report_file"
    echo "- Monitor security logs" >> "$report_file"
    echo "- Implement automated security scanning" >> "$report_file"
    echo "- Regular security audits" >> "$report_file"
    
    log_success "Security report generated: $report_file"
}

# Main validation function
main() {
    log_info "Starting Myl.Zip security validation..."
    
    # Load environment variables if .env.production exists
    if [ -f ".env.production" ]; then
        log_info "Loading environment variables from .env.production"
        set -a
        source .env.production
        set +a
    fi
    
    # Run all validation checks
    validate_environment_variables
    validate_file_permissions
    check_hardcoded_secrets
    validate_ssl_configuration
    validate_encryption_configuration
    validate_rate_limiting
    validate_logging_configuration
    validate_database_configuration
    check_dependency_vulnerabilities
    validate_docker_security
    
    # Generate report
    generate_security_report
    
    # Summary
    echo ""
    log_info "Security Validation Summary:"
    echo "  Security Issues: $SECURITY_ISSUES"
    echo "  Security Warnings: $SECURITY_WARNINGS"
    
    if [ $SECURITY_ISSUES -gt 0 ]; then
        log_error "CRITICAL: Security issues found. Do not deploy until resolved."
        exit 1
    elif [ $SECURITY_WARNINGS -gt 0 ]; then
        log_warning "Security warnings found. Review before deployment."
        exit 0
    else
        log_success "Security validation passed. Safe to deploy."
        exit 0
    fi
}

# Run main function
main "$@"
