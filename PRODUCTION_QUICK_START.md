# Myl.Zip Production Deployment Quick Start

## 🚀 Quick Deployment (5 Minutes)

### Prerequisites
- Google Cloud SDK installed and authenticated
- Docker installed and running
- Node.js 18+ installed
- PowerShell (Windows) or Bash (Linux/Mac)

### 1. Set Environment Variables

**Windows (PowerShell):**
```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS = "path/to/service-account.json"
$env:PRODUCTION_DATABASE_URL = "postgresql://user:pass@host:port/db"
$env:JWT_SECRET = "your-super-secure-jwt-secret-here"
$env:ENCRYPTION_MASTER_KEY = "your-encryption-master-key-here"
```

**Linux/Mac (Bash):**
```bash
export GOOGLE_APPLICATION_CREDENTIALS="path/to/service-account.json"
export PRODUCTION_DATABASE_URL="postgresql://user:pass@host:port/db"
export JWT_SECRET="your-super-secure-jwt-secret-here"
export ENCRYPTION_MASTER_KEY="your-encryption-master-key-here"
```

### 2. Run Deployment Script

**Windows:**
```powershell
.\scripts\deploy-production.ps1
```

**Linux/Mac:**
```bash
./scripts/deploy-production.sh
```

### 3. Verify Deployment

The script will automatically:
- ✅ Generate secure keys
- ✅ Build and push Docker image
- ✅ Deploy to Cloud Run
- ✅ Run health checks
- ✅ Verify API endpoints

## 🔐 Security Configuration

### Generate Secure Keys
```bash
# JWT Secret (64 bytes)
openssl rand -base64 64

# Encryption Master Key (32 bytes)
openssl rand -base64 32

# Service API Key (32 bytes)
openssl rand -hex 32
```

### Environment Variables
Copy `.env.production` and update with your values:
```bash
cp env.production .env.production
# Edit .env.production with your actual values
```

## 🛡️ Security Validation

Run security validation before deployment:
```bash
./scripts/security-validation.sh
```

This checks:
- Environment variables
- File permissions
- Hardcoded secrets
- SSL/TLS configuration
- Encryption settings
- Rate limiting
- Logging configuration

## 📊 Monitoring Setup

### Health Checks
- **Health Endpoint**: `GET /health`
- **Liveness Probe**: `GET /health/live`
- **Readiness Probe**: `GET /health/ready`

### Metrics
- **Prometheus Metrics**: `GET /metrics`
- **Application Metrics**: Port 9090

### Logging
- **Audit Logs**: Security events and API access
- **Application Logs**: JSON format with structured data
- **Error Logs**: Detailed error information

## 🔧 Configuration Options

### Key Management
- **Key Rotation**: Automatic every 30 days
- **Backup Keys**: Secure backup for recovery
- **Device Keys**: Per-device encryption keys

### Security Features
- **End-to-End Encryption**: AES-256-GCM
- **Device Trust**: Cross-device sharing
- **Rate Limiting**: 100 requests per 15 minutes
- **Security Headers**: Comprehensive protection

### Performance
- **Auto-scaling**: 1-10 instances
- **Memory**: 1GB per instance
- **CPU**: 1 vCPU per instance
- **Timeout**: 300 seconds

## 🚨 Troubleshooting

### Common Issues

**1. Docker Build Fails**
```bash
# Check Docker is running
docker --version

# Clean Docker cache
docker system prune -a
```

**2. GCloud Authentication**
```bash
# Authenticate with Google Cloud
gcloud auth login
gcloud auth application-default login
```

**3. Permission Denied**
```bash
# Make scripts executable
chmod +x scripts/*.sh
```

**4. Environment Variables**
```bash
# Check variables are set
echo $JWT_SECRET
echo $ENCRYPTION_MASTER_KEY
```

### Health Check Failures

**Check Service Status:**
```bash
# Get service URL
gcloud run services describe zip-myl-backend --region=us-central1 --format="value(status.url)"

# Test health endpoint
curl https://your-service-url/health
```

**Check Logs:**
```bash
# View recent logs
gcloud logs read "resource.type=cloud_run_revision" --limit=50
```

## 📋 Post-Deployment Checklist

- [ ] Service is accessible via HTTPS
- [ ] Health checks are passing
- [ ] API endpoints are responding
- [ ] Security headers are present
- [ ] Rate limiting is working
- [ ] Audit logging is active
- [ ] Monitoring is configured
- [ ] Backup schedule is set

## 🔗 Important URLs

After deployment, you'll have access to:
- **API Base**: `https://your-service-url`
- **Health Check**: `https://your-service-url/health`
- **API Docs**: `https://your-service-url/docs`
- **Encrypted API**: `https://your-service-url/api/v1/encrypted`
- **Metrics**: `https://your-service-url/metrics`

## 📞 Support

For issues or questions:
1. Check the logs: `gcloud logs read`
2. Run security validation: `./scripts/security-validation.sh`
3. Review the deployment checklist: `PRODUCTION_DEPLOYMENT_CHECKLIST.md`
4. Check the troubleshooting section above

---

**Ready to deploy?** Run the deployment script and follow the prompts!
