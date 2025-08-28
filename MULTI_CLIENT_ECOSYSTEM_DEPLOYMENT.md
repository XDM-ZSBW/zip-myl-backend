# 🚀 Myl.Zip Multi-Client Ecosystem - Deployment Guide

This guide provides comprehensive instructions for deploying and scaling the Myl.Zip backend infrastructure to support the multi-client ecosystem.

## 📋 Table of Contents

1. [Infrastructure Overview](#infrastructure-overview)
2. [Prerequisites](#prerequisites)
3. [Environment Setup](#environment-setup)
4. [Database Migration](#database-migration)
5. [Service Deployment](#service-deployment)
6. [Load Balancing & Scaling](#load-balancing--scaling)
7. [Monitoring & Observability](#monitoring--observability)
8. [Security Configuration](#security-configuration)
9. [Testing & Validation](#testing--validation)
10. [Production Rollout](#production-rollout)
11. [Maintenance & Updates](#maintenance--updates)

## 🏗️ Infrastructure Overview

The multi-client ecosystem requires the following infrastructure components:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Load Balancer │    │   API Gateway   │    │  WebSocket Hub  │
│   (NGINX/ALB)  │────│   (Express.js)  │────│   (WebSocket)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Redis Cache   │    │  PostgreSQL DB  │    │  File Storage   │
│   (Rate Limiting)│   │   (Primary)     │    │   (S3/GCS)      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Monitoring    │    │   Logging       │    │   Backup        │
│   (Prometheus)  │    │   (Winston)     │    │   (Automated)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## ✅ Prerequisites

### Required Software
- **Node.js**: v18.0.0 or higher
- **PostgreSQL**: v13.0 or higher
- **Redis**: v6.0 or higher
- **Docker**: v20.10 or higher
- **Kubernetes**: v1.24 or higher (optional)
- **NGINX**: v1.20 or higher

### Required Services
- **Google Cloud Platform** or **AWS** account
- **Domain name** with SSL certificate
- **CI/CD pipeline** (GitHub Actions, GitLab CI, etc.)

### Required Environment Variables
```bash
# Core Configuration
NODE_ENV=production
PORT=8080
ENABLE_WEBSOCKET=true

# Database
DATABASE_URL=postgresql://user:password@host:port/database
DATABASE_POOL_MIN=5
DATABASE_POOL_MAX=20

# Redis
REDIS_URL=redis://host:port
REDIS_PASSWORD=your_redis_password

# Security
JWT_SECRET=your_jwt_secret
DEVICE_FINGERPRINT_SALT=your_device_salt
ENCRYPTION_KEY=your_encryption_key

# Google Cloud (if using)
GOOGLE_CLOUD_PROJECT=your_project_id
GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account.json

# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000

# Monitoring
PROMETHEUS_ENABLED=true
LOG_LEVEL=info
```

## 🔧 Environment Setup

### 1. Clone and Setup Repository
```bash
# Clone the repository
git clone https://github.com/XDM-ZSBW/zip-myl-backend.git
cd zip-myl-backend

# Install dependencies
npm install

# Copy environment files
cp env.example .env.production
cp env.example .env.staging
```

### 2. Configure Environment Files
```bash
# Production environment
cat > .env.production << EOF
NODE_ENV=production
PORT=8080
ENABLE_WEBSOCKET=true

# Database
DATABASE_URL=postgresql://mylzip_user:mylzip_password@prod-db-host:5432/mylzip_prod
DATABASE_POOL_MIN=10
DATABASE_POOL_MAX=50

# Redis
REDIS_URL=redis://prod-redis-host:6379
REDIS_PASSWORD=prod_redis_password

# Security
JWT_SECRET=prod_jwt_secret_$(openssl rand -hex 32)
DEVICE_FINGERPRINT_SALT=prod_device_salt_$(openssl rand -hex 32)
ENCRYPTION_KEY=prod_encryption_key_$(openssl rand -hex 32)

# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=5000

# Monitoring
PROMETHEUS_ENABLED=true
LOG_LEVEL=info
EOF
```

### 3. Database Setup
```bash
# Create production database
sudo -u postgres createdb mylzip_prod

# Create production user
sudo -u postgres psql -c "CREATE USER mylzip_user WITH PASSWORD 'mylzip_password';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE mylzip_prod TO mylzip_user;"

# Run migrations
npm run db:deploy
```

### 4. Redis Setup
```bash
# Install Redis
sudo apt update
sudo apt install redis-server

# Configure Redis
sudo nano /etc/redis/redis.conf

# Add/modify these settings:
requirepass prod_redis_password
maxmemory 2gb
maxmemory-policy allkeys-lru
save 900 1
save 300 10
save 60 10000

# Restart Redis
sudo systemctl restart redis-server
sudo systemctl enable redis-server
```

## 🗄️ Database Migration

### 1. Run Schema Migrations
```bash
# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push

# Run any custom migrations
npm run db:migrate
```

### 2. Seed Initial Data
```bash
# Run seed script
npm run db:seed

# Verify data
npm run db:verify
```

### 3. Database Optimization
```sql
-- Create indexes for better performance
CREATE INDEX CONCURRENTLY idx_thoughts_user_id ON thoughts(user_id);
CREATE INDEX CONCURRENTLY idx_thoughts_created_at ON thoughts(created_at);
CREATE INDEX CONCURRENTLY idx_sessions_device_id ON sessions(device_id);
CREATE INDEX CONCURRENTLY idx_devices_fingerprint ON devices(fingerprint);

-- Analyze tables for query optimization
ANALYZE thoughts;
ANALYZE sessions;
ANALYZE devices;
ANALYZE workspaces;
```

## 🚀 Service Deployment

### 1. Docker Deployment

#### Create Production Dockerfile
```dockerfile
# Dockerfile.production
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine AS runtime

WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY src ./src
COPY prisma ./prisma
COPY public ./public

RUN npm run db:generate

EXPOSE 8080

CMD ["npm", "start"]
```

#### Build and Deploy
```bash
# Build production image
docker build -f Dockerfile.production -t mylzip-backend:latest .

# Run container
docker run -d \
  --name mylzip-backend \
  --restart unless-stopped \
  -p 8080:8080 \
  --env-file .env.production \
  mylzip-backend:latest

# Verify deployment
docker logs mylzip-backend
docker ps
```

### 2. Kubernetes Deployment

#### Create Deployment YAML
```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mylzip-backend
  labels:
    app: mylzip-backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: mylzip-backend
  template:
    metadata:
      labels:
        app: mylzip-backend
    spec:
      containers:
      - name: mylzip-backend
        image: mylzip-backend:latest
        ports:
        - containerPort: 8080
        env:
        - name: NODE_ENV
          value: "production"
        - name: PORT
          value: "8080"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: mylzip-secrets
              key: database-url
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: mylzip-secrets
              key: redis-url
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
```

#### Create Service YAML
```yaml
# k8s/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: mylzip-backend-service
spec:
  selector:
    app: mylzip-backend
  ports:
  - protocol: TCP
    port: 80
    targetPort: 8080
  type: LoadBalancer
```

#### Deploy to Kubernetes
```bash
# Apply configurations
kubectl apply -f k8s/

# Verify deployment
kubectl get pods
kubectl get services
kubectl logs deployment/mylzip-backend
```

### 3. PM2 Deployment

#### Create PM2 Ecosystem File
```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'mylzip-backend',
    script: 'src/app.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'development'
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 8080,
      ENABLE_WEBSOCKET: true
    },
    env_staging: {
      NODE_ENV: 'staging',
      PORT: 8080,
      ENABLE_WEBSOCKET: true
    }
  }]
};
```

#### Deploy with PM2
```bash
# Install PM2 globally
npm install -g pm2

# Start application
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save

# Setup PM2 startup script
pm2 startup

# Monitor application
pm2 monit
pm2 logs mylzip-backend
```

## ⚖️ Load Balancing & Scaling

### 1. NGINX Load Balancer

#### Install NGINX
```bash
sudo apt update
sudo apt install nginx

# Remove default site
sudo rm /etc/nginx/sites-enabled/default
```

#### Configure Load Balancer
```nginx
# /etc/nginx/sites-available/mylzip-backend
upstream mylzip_backend {
    least_conn;
    server 127.0.0.1:8080 weight=1 max_fails=3 fail_timeout=30s;
    server 127.0.0.1:8081 weight=1 max_fails=3 fail_timeout=30s;
    server 127.0.0.1:8082 weight=1 max_fails=3 fail_timeout=30s;
    keepalive 32;
}

upstream mylzip_websocket {
    ip_hash;
    server 127.0.0.1:8080;
    server 127.0.0.1:8081;
    server 127.0.0.1:8082;
}

server {
    listen 80;
    server_name api.myl.zip;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.myl.zip;
    
    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/api.myl.zip/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.myl.zip/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    
    # Security Headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # Rate Limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=websocket:10m rate=100r/s;
    
    # API Routes
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://mylzip_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
    
    # WebSocket Routes
    location /ws {
        limit_req zone=websocket burst=50 nodelay;
        proxy_pass http://mylzip_websocket;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }
    
    # Health Check
    location /health {
        access_log off;
        proxy_pass http://mylzip_backend;
    }
    
    # Metrics
    location /metrics {
        allow 127.0.0.1;
        deny all;
        proxy_pass http://mylzip_backend;
    }
}
```

#### Enable Site and Test
```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/mylzip-backend /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload NGINX
sudo systemctl reload nginx

# Check status
sudo systemctl status nginx
```

### 2. Auto Scaling Configuration

#### Horizontal Pod Autoscaler (Kubernetes)
```yaml
# k8s/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: mylzip-backend-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: mylzip-backend
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

#### PM2 Cluster Mode
```bash
# Scale to 4 instances
pm2 scale mylzip-backend 4

# Monitor scaling
pm2 monit
pm2 list
```

## 📊 Monitoring & Observability

### 1. Prometheus Configuration

#### Install Prometheus
```bash
# Download Prometheus
wget https://github.com/prometheus/prometheus/releases/download/v2.45.0/prometheus-2.45.0.linux-amd64.tar.gz
tar xvf prometheus-2.45.0.linux-amd64.tar.gz
cd prometheus-2.45.0

# Create configuration
cat > prometheus.yml << EOF
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  # - "first_rules.yml"
  # - "second_rules.yml"

scrape_configs:
  - job_name: 'mylzip-backend'
    static_configs:
      - targets: ['localhost:8080']
    metrics_path: '/metrics'
    scrape_interval: 5s

  - job_name: 'node-exporter'
    static_configs:
      - targets: ['localhost:9100']

  - job_name: 'redis-exporter'
    static_configs:
      - targets: ['localhost:9121']

  - job_name: 'postgres-exporter'
    static_configs:
      - targets: ['localhost:9187']
EOF

# Start Prometheus
./prometheus --config.file=prometheus.yml
```

### 2. Grafana Dashboard

#### Install Grafana
```bash
# Add Grafana repository
wget -q -O - https://packages.grafana.com/gpg.key | sudo apt-key add -
echo "deb https://packages.grafana.com/oss/deb stable main" | sudo tee -a /etc/apt/sources.list.d/grafana.list

# Install Grafana
sudo apt update
sudo apt install grafana

# Start Grafana
sudo systemctl start grafana-server
sudo systemctl enable grafana-server
```

#### Create Dashboard
```json
{
  "dashboard": {
    "id": null,
    "title": "Myl.Zip Backend Metrics",
    "tags": ["mylzip", "backend"],
    "style": "dark",
    "timezone": "browser",
    "panels": [
      {
        "id": 1,
        "title": "Request Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])",
            "legendFormat": "{{method}} {{route}}"
          }
        ]
      },
      {
        "id": 2,
        "title": "Response Time",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "95th percentile"
          }
        ]
      },
      {
        "id": 3,
        "title": "Active Connections",
        "type": "stat",
        "targets": [
          {
            "expr": "websocket_connections_total",
            "legendFormat": "WebSocket Connections"
          }
        ]
      }
    ]
  }
}
```

### 3. Log Aggregation

#### Configure Winston for Production
```javascript
// src/utils/logger.js
const winston = require('winston');
const { format } = winston;

const productionFormat = format.combine(
  format.timestamp(),
  format.errors({ stack: true }),
  format.json()
);

const productionLogger = winston.createLogger({
  level: 'info',
  format: productionFormat,
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: format.combine(
        format.colorize(),
        format.simple()
      )
    })
  ]
});

// Add log rotation
require('winston-daily-rotate-file');

const rotateFileTransport = new winston.transports.DailyRotateFile({
  filename: 'logs/application-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '14d'
});

productionLogger.add(rotateFileTransport);
```

## 🔒 Security Configuration

### 1. SSL Certificate Setup

#### Let's Encrypt Certificate
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d api.myl.zip

# Test renewal
sudo certbot renew --dry-run

# Setup auto-renewal
sudo crontab -e

# Add this line:
0 12 * * * /usr/bin/certbot renew --quiet
```

### 2. Firewall Configuration

#### UFW Firewall
```bash
# Enable UFW
sudo ufw enable

# Allow SSH
sudo ufw allow ssh

# Allow HTTP/HTTPS
sudo ufw allow 80
sudo ufw allow 443

# Allow application port (if not behind load balancer)
sudo ufw allow 8080

# Check status
sudo ufw status
```

### 3. Security Headers

#### Helmet Configuration
```javascript
// src/app.js
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "wss:", "https:"],
      frameSrc: ["'none"],
      objectSrc: ["'none"],
      upgradeInsecureRequests: []
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
```

## 🧪 Testing & Validation

### 1. Load Testing

#### Install Artillery
```bash
npm install -g artillery

# Create load test configuration
cat > load-test.yml << EOF
config:
  target: 'https://api.myl.zip'
  phases:
    - duration: 60
      arrivalRate: 10
    - duration: 120
      arrivalRate: 50
    - duration: 60
      arrivalRate: 100
  defaults:
    headers:
      x-client-platform: 'web'
      x-client-version: '2.0.0'

scenarios:
  - name: "API v2 endpoints"
    weight: 70
    flow:
      - get:
          url: "/api/v2"
      - get:
          url: "/api/v2/capabilities"
      - post:
          url: "/api/v2/auth/device/register"
          json:
            deviceId: "test-device-{{ $randomString() }}"
            deviceType: "web"
            deviceVersion: "2.0.0"

  - name: "WebSocket connections"
    weight: 30
    engine: "ws"
    flow:
      - connect:
          url: "wss://api.myl.zip/ws?deviceId=test-{{ $randomString() }}"
      - think: 30
      - close: {}
EOF

# Run load test
artillery run load-test.yml
```

### 2. Health Check Validation

#### Create Health Check Script
```bash
#!/bin/bash
# health-check.sh

BASE_URL="https://api.myl.zip"
HEALTH_ENDPOINTS=(
  "/health"
  "/api/v2"
  "/metrics"
)

echo "🔍 Starting health check for $BASE_URL"
echo "========================================"

for endpoint in "${HEALTH_ENDPOINTS[@]}"; do
  echo -n "Checking $endpoint... "
  
  response=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL$endpoint")
  
  if [ "$response" = "200" ]; then
    echo "✅ OK ($response)"
  else
    echo "❌ FAILED ($response)"
    exit 1
  fi
done

echo "========================================"
echo "🎉 All health checks passed!"
```

#### Run Health Checks
```bash
# Make script executable
chmod +x health-check.sh

# Run health check
./health-check.sh

# Setup cron job for continuous monitoring
crontab -e

# Add this line to run every 5 minutes:
*/5 * * * * /path/to/health-check.sh >> /var/log/health-check.log 2>&1
```

### 3. Integration Testing

#### Run Test Suite
```bash
# Install test dependencies
npm install --save-dev jest supertest

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run specific test suites
npm test -- --testPathPattern=auth
npm test -- --testPathPattern=sync
npm test -- --testPathPattern=websocket
```

## 🚀 Production Rollout

### 1. Blue-Green Deployment

#### Create Deployment Script
```bash
#!/bin/bash
# deploy-blue-green.sh

set -e

ENVIRONMENT=$1
VERSION=$2

if [ -z "$ENVIRONMENT" ] || [ -z "$VERSION" ]; then
  echo "Usage: $0 <environment> <version>"
  echo "Example: $0 production v2.0.0"
  exit 1
fi

echo "🚀 Starting blue-green deployment for $ENVIRONMENT v$VERSION"

# Build new image
echo "📦 Building Docker image..."
docker build -f Dockerfile.production -t mylzip-backend:$VERSION .

# Tag for environment
docker tag mylzip-backend:$VERSION mylzip-backend:$ENVIRONMENT-latest

# Deploy to staging first
if [ "$ENVIRONMENT" = "production" ]; then
  echo "🧪 Deploying to staging first..."
  docker tag mylzip-backend:$VERSION mylzip-backend:staging
  docker stop mylzip-backend-staging || true
  docker rm mylzip-backend-staging || true
  docker run -d \
    --name mylzip-backend-staging \
    --restart unless-stopped \
    -p 8081:8080 \
    --env-file .env.staging \
    mylzip-backend:staging
  
  echo "⏳ Waiting for staging to be ready..."
  sleep 30
  
  # Run health checks on staging
  if ! curl -f http://localhost:8081/health > /dev/null 2>&1; then
    echo "❌ Staging health check failed"
    docker stop mylzip-backend-staging
    docker rm mylzip-backend-staging
    exit 1
  fi
  
  echo "✅ Staging deployment successful"
fi

# Deploy to production
echo "🚀 Deploying to $ENVIRONMENT..."

# Stop current production instance
docker stop mylzip-backend-production || true
docker rm mylzip-backend-production || true

# Start new production instance
docker run -d \
  --name mylzip-backend-production \
  --restart unless-stopped \
  -p 8080:8080 \
  --env-file .env.production \
  mylzip-backend:$VERSION

# Wait for new instance to be ready
echo "⏳ Waiting for new instance to be ready..."
sleep 30

# Run health checks
if ! curl -f http://localhost:8080/health > /dev/null 2>&1; then
  echo "❌ Production health check failed, rolling back..."
  docker stop mylzip-backend-production
  docker rm mylzip-backend-production
  
  # Restart old instance
  docker run -d \
    --name mylzip-backend-production \
    --restart unless-stopped \
    -p 8080:8080 \
    --env-file .env.production \
    mylzip-backend:production-previous
  
  echo "🔄 Rollback completed"
  exit 1
fi

echo "✅ Production deployment successful!"

# Update NGINX configuration if needed
sudo systemctl reload nginx

echo "🎉 Deployment completed successfully!"
```

#### Execute Deployment
```bash
# Make script executable
chmod +x deploy-blue-green.sh

# Deploy to production
./deploy-blue-green.sh production v2.0.0

# Monitor deployment
docker ps
docker logs mylzip-backend-production
```

### 2. Canary Deployment

#### Create Canary Configuration
```yaml
# k8s/canary.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: mylzip-backend-canary
  annotations:
    nginx.ingress.kubernetes.io/canary: "true"
    nginx.ingress.kubernetes.io/canary-weight: "10"
spec:
  rules:
  - host: api.myl.zip
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: mylzip-backend-canary
            port:
              number: 80
```

#### Deploy Canary
```bash
# Apply canary configuration
kubectl apply -f k8s/canary.yaml

# Monitor canary performance
kubectl get pods -l app=mylzip-backend-canary
kubectl logs -l app=mylzip-backend-canary

# Gradually increase traffic
kubectl patch ingress mylzip-backend-canary -p '{"metadata":{"annotations":{"nginx.ingress.kubernetes.io/canary-weight":"25"}}}'
kubectl patch ingress mylzip-backend-canary -p '{"metadata":{"annotations":{"nginx.ingress.kubernetes.io/canary-weight":"50"}}}'
kubectl patch ingress mylzip-backend-canary -p '{"metadata":{"annotations":{"nginx.ingress.kubernetes.io/canary-weight":"100"}}}'
```

## 🛠️ Maintenance & Updates

### 1. Database Maintenance

#### Create Maintenance Script
```bash
#!/bin/bash
# db-maintenance.sh

echo "🗄️ Starting database maintenance..."

# Connect to database
psql $DATABASE_URL << EOF
-- Vacuum and analyze tables
VACUUM ANALYZE thoughts;
VACUUM ANALYZE sessions;
VACUUM ANALYZE devices;
VACUUM ANALYZE workspaces;

-- Update statistics
ANALYZE;

-- Check for long-running queries
SELECT pid, now() - pg_stat_activity.query_start AS duration, query 
FROM pg_stat_activity 
WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes';

-- Check table sizes
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
EOF

echo "✅ Database maintenance completed"
```

#### Schedule Maintenance
```bash
# Add to crontab
crontab -e

# Run maintenance every Sunday at 2 AM
0 2 * * 0 /path/to/db-maintenance.sh >> /var/log/db-maintenance.log 2>&1
```

### 2. Log Rotation

#### Configure Logrotate
```bash
# /etc/logrotate.d/mylzip-backend
/path/to/zip-myl-backend/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 www-data www-data
    postrotate
        systemctl reload mylzip-backend
    endscript
}
```

### 3. Backup Strategy

#### Create Backup Script
```bash
#!/bin/bash
# backup.sh

BACKUP_DIR="/backups/mylzip"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="mylzip_backup_$DATE.sql"

echo "💾 Starting backup..."

# Create backup directory
mkdir -p $BACKUP_DIR

# Database backup
pg_dump $DATABASE_URL > "$BACKUP_DIR/$BACKUP_FILE"

# Compress backup
gzip "$BACKUP_DIR/$BACKUP_FILE"

# Remove old backups (keep last 7 days)
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete

# Upload to cloud storage (if using)
if [ -n "$GCS_BUCKET" ]; then
  gsutil cp "$BACKUP_DIR/$BACKUP_FILE.gz" "gs://$GCS_BUCKET/backups/"
fi

echo "✅ Backup completed: $BACKUP_FILE.gz"
```

#### Schedule Backups
```bash
# Add to crontab
crontab -e

# Run backup daily at 3 AM
0 3 * * * /path/to/backup.sh >> /var/log/backup.log 2>&1
```

## 📈 Performance Optimization

### 1. Database Optimization

#### Connection Pooling
```javascript
// src/services/databaseService.js
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: parseInt(process.env.DATABASE_POOL_MAX) || 20,
  min: parseInt(process.env.DATABASE_POOL_MIN) || 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  acquireTimeoutMillis: 2000,
  reapIntervalMillis: 1000,
  createTimeoutMillis: 3000,
  destroyTimeoutMillis: 5000,
  maxUses: 7500,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Monitor pool performance
pool.on('connect', (client) => {
  console.log('New client connected to database');
});

pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});
```

### 2. Caching Strategy

#### Redis Caching
```javascript
// src/services/cacheService.js
const Redis = require('ioredis');

class CacheService {
  constructor() {
    this.redis = new Redis(process.env.REDIS_URL);
    this.defaultTTL = 3600; // 1 hour
  }

  async get(key) {
    try {
      const value = await this.redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  async set(key, value, ttl = this.defaultTTL) {
    try {
      await this.redis.setex(key, ttl, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }

  async invalidate(pattern) {
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
      return keys.length;
    } catch (error) {
      console.error('Cache invalidation error:', error);
      return 0;
    }
  }
}
```

### 3. Rate Limiting Optimization

#### Adaptive Rate Limiting
```javascript
// src/middleware/adaptiveRateLimiter.js
class AdaptiveRateLimiter {
  constructor() {
    this.clientScores = new Map();
    this.baseLimits = {
      web: 1000,
      desktop: 500,
      mobile: 200,
      development: 2000,
      enterprise: 5000
    };
  }

  getAdaptiveLimit(req) {
    const platform = req.clientPlatform || 'web';
    const baseLimit = this.baseLimits[platform];
    const deviceId = req.device?.id || req.headers['x-device-id'];
    
    if (!deviceId) return baseLimit;
    
    const score = this.clientScores.get(deviceId) || 100;
    const multiplier = Math.max(0.5, Math.min(2.0, score / 100));
    
    return Math.floor(baseLimit * multiplier);
  }

  updateScore(deviceId, success) {
    const currentScore = this.clientScores.get(deviceId) || 100;
    const newScore = success ? 
      Math.min(200, currentScore + 1) : 
      Math.max(50, currentScore - 5);
    
    this.clientScores.set(deviceId, newScore);
  }
}
```

## 🎯 Success Metrics & Monitoring

### 1. Key Performance Indicators (KPIs)

#### Response Time Metrics
```javascript
// src/middleware/performanceMonitor.js
const performanceMonitor = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const status = res.statusCode;
    const method = req.method;
    const route = req.route?.path || req.path;
    
    // Record metrics
    recordResponseTime(route, method, duration);
    recordStatusCode(route, method, status);
    
    // Alert on slow responses
    if (duration > 1000) {
      alertSlowResponse(route, method, duration);
    }
  });
  
  next();
};
```

#### Business Metrics
```javascript
// src/services/metricsService.js
class MetricsService {
  async recordSyncMetrics(deviceId, platform, syncType, duration, success) {
    const metrics = {
      deviceId,
      platform,
      syncType,
      duration,
      success,
      timestamp: new Date()
    };
    
    await this.saveMetrics('sync', metrics);
    await this.updateAggregates('sync', metrics);
  }

  async getPlatformUsage() {
    const query = `
      SELECT 
        platform,
        COUNT(DISTINCT device_id) as active_devices,
        AVG(duration) as avg_sync_time,
        COUNT(*) as total_syncs
      FROM sync_metrics 
      WHERE timestamp > NOW() - INTERVAL '24 hours'
      GROUP BY platform
    `;
    
    return await this.query(query);
  }
}
```

### 2. Alerting Configuration

#### Prometheus Alert Rules
```yaml
# prometheus/alerts.yml
groups:
  - name: mylzip-backend
    rules:
      - alert: HighResponseTime
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High response time detected"
          description: "95th percentile response time is {{ $value }}s"

      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.1
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value }}"

      - alert: DatabaseConnectionsHigh
        expr: pg_stat_activity_count > 80
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High database connection count"
          description: "Database has {{ $value }} active connections"
```

## 🎉 Conclusion

This deployment guide provides a comprehensive roadmap for scaling the Myl.Zip backend infrastructure to support the multi-client ecosystem. Key success factors include:

1. **Proper Planning**: Understand your infrastructure requirements and plan accordingly
2. **Security First**: Implement proper security measures from the start
3. **Monitoring**: Set up comprehensive monitoring and alerting
4. **Testing**: Thoroughly test all components before production deployment
5. **Documentation**: Maintain up-to-date documentation for all systems
6. **Automation**: Automate deployment, testing, and maintenance processes
7. **Scalability**: Design for growth from the beginning

For additional support and updates, refer to:
- [API Documentation](https://api.myl.zip/docs)
- [GitHub Repository](https://github.com/XDM-ZSBW/zip-myl-backend)
- [Community Support](https://github.com/XDM-ZSBW/zip-myl-backend/discussions)

Happy deploying! 🚀
