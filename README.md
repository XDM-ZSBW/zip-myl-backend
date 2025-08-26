# Myl.Zip Backend Service

A production-ready Node.js backend service for the Myl.Zip ecosystem, providing comprehensive ID and access management, thought tracking, and cloud deployment capabilities.

## 🚀 Features

### 🔐 Authentication & Access Management
- **Anonymous Device-Based Authentication**: UUID-based device identification with JWT tokens
- **Zero-Knowledge Architecture**: Client-side encryption with server-side data protection
- **Role-Based Access Control**: Anonymous, admin, and service roles with granular permissions
- **API Key Management**: Comprehensive API key system for different client types
- **Session Management**: JWT-based sessions with refresh token mechanism
- **Rate Limiting**: Redis-based distributed rate limiting per device and API key

### 📝 Core Features
- **Thought Management**: Create, read, update, and delete thoughts with metadata
- **Caching**: Redis-based caching for improved performance
- **Database**: PostgreSQL with Prisma ORM for robust data management
- **Security**: Comprehensive security middleware with input validation
- **Monitoring**: Health checks, metrics, audit logging, and structured logging
- **Deployment**: Docker containerization with Google Cloud Run support
- **Testing**: Comprehensive unit and integration tests

## 📋 Prerequisites

- Node.js 18+ 
- PostgreSQL 15+
- Redis 7+
- Docker (for containerization)
- Google Cloud SDK (for deployment)

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/XDM-ZSBW/zip-myl-backend.git
   cd zip-myl-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

4. **Set up the database**
   ```bash
   # Generate Prisma client
   npm run db:generate
   
   # Run database migrations
   npm run db:migrate
   
   # Seed the database (optional)
   npm run db:seed
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` |
| `PORT` | Server port | `3000` |
| `DATABASE_URL` | PostgreSQL connection string | Required |
| `REDIS_HOST` | Redis host | `localhost` |
| `REDIS_PORT` | Redis port | `6379` |
| `JWT_SECRET` | JWT signing secret | Required |
| `JWT_REFRESH_SECRET` | JWT refresh token secret | Required |
| `INTERNAL_API_KEY` | Internal API key | Required |
| `CORS_ORIGIN` | Allowed CORS origins | `http://localhost:3000` |

### Feature Flags

- `ENABLE_AUTH`: Enable/disable authentication (default: `true`)
- `ENABLE_DEVICE_AUTH`: Enable device-based authentication (default: `true`)
- `ENABLE_API_KEY_AUTH`: Enable API key authentication (default: `true`)
- `ENABLE_CACHING`: Enable/disable Redis caching (default: `true`)
- `ENABLE_METRICS`: Enable/disable metrics collection (default: `true`)

## 📚 API Documentation

### Base URL
```
http://localhost:3000
```

### Authentication Endpoints

#### Device Registration
```bash
POST /api/v1/auth/device/register
```

#### Token Management
```bash
POST /api/v1/auth/login          # Login with refresh token
POST /api/v1/auth/refresh        # Refresh access token
POST /api/v1/auth/logout         # Logout device
POST /api/v1/auth/validate       # Validate token
```

#### Device Management
```bash
GET /api/v1/auth/device/info     # Get device information
PUT /api/v1/auth/device/update   # Update device
DELETE /api/v1/auth/device/revoke # Revoke device access
```

### Admin Endpoints (Require API Key)

#### API Key Management
```bash
POST /api/v1/admin/keys/create   # Create API key
GET /api/v1/admin/keys/list      # List API keys
PUT /api/v1/admin/keys/:id/update # Update API key
DELETE /api/v1/admin/keys/:id/revoke # Revoke API key
```

#### System Management
```bash
GET /api/v1/admin/stats/system   # System statistics
GET /api/v1/admin/audit/logs     # Audit logs
```

### Core API Endpoints

#### Health Check
- `GET /health` - Comprehensive health check
- `GET /health/ready` - Kubernetes readiness probe
- `GET /health/live` - Kubernetes liveness probe

#### Thoughts API
- `GET /api/thoughts` - Get all thoughts (with pagination)
- `POST /api/thoughts` - Create a new thought
- `GET /api/thoughts/:id` - Get a specific thought
- `PUT /api/thoughts/:id` - Update a thought
- `DELETE /api/thoughts/:id` - Delete a thought
- `GET /api/thoughts/search?q=query` - Search thoughts

#### Metrics
- `GET /metrics` - Prometheus metrics endpoint

### Request/Response Examples

#### Register Device
```bash
curl -X POST http://localhost:3000/api/v1/auth/device/register \
  -H "Content-Type: application/json"
```

#### Create Thought (with authentication)
```bash
curl -X POST http://localhost:3000/api/thoughts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <access-token>" \
  -d '{
    "content": "This is a test thought",
    "metadata": {"source": "api", "tags": ["test"]},
    "url": "https://example.com"
  }'
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run authentication tests
npm test tests/unit/auth.test.js
npm test tests/integration/auth.test.js
```

## 🐳 Docker

### Build and Run
```bash
# Build the Docker image
docker build -t zip-myl-backend .

# Run the container
docker run -p 3000:3000 \
  -e DATABASE_URL="postgresql://user:pass@host:5432/db" \
  -e REDIS_HOST="redis-host" \
  -e JWT_SECRET="your-secret" \
  -e JWT_REFRESH_SECRET="your-refresh-secret" \
  -e INTERNAL_API_KEY="your-api-key" \
  zip-myl-backend
```

## ☁️ Google Cloud Run Deployment

### Project Configuration
- **Project ID**: `zip-myl-backend`
- **Project Number**: `658472087761`
- **Region**: `us-central1`

### Quick Setup
```bash
# Run the setup script
chmod +x scripts/setup-gcp.sh
./scripts/setup-gcp.sh

# Deploy the application
chmod +x scripts/deploy-gcp.sh
./scripts/deploy-gcp.sh
```

### Manual Deployment
```bash
# Build and push image
gcloud builds submit --tag gcr.io/zip-myl-backend/zip-myl-backend

# Deploy to Cloud Run
gcloud run deploy zip-myl-backend \
  --image gcr.io/zip-myl-backend/zip-myl-backend \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --project zip-myl-backend
```

## 🔄 CI/CD

The project includes GitHub Actions workflows for:
- **CI Pipeline**: Automated testing, linting, and building
- **CD Pipeline**: Automated deployment to Google Cloud Run

### Required Secrets
- `GCP_SA_KEY`: Service Account JSON key
- `DATABASE_URL`: Production database URL
- `REDIS_PASSWORD`: Redis password
- `JWT_SECRET`: JWT signing secret
- `JWT_REFRESH_SECRET`: JWT refresh token secret
- `INTERNAL_API_KEY`: Internal API key

## 📊 Monitoring

### Health Checks
- **Liveness**: `GET /health/live`
- **Readiness**: `GET /health/ready`
- **Health**: `GET /health`

### Metrics
- **Prometheus**: `GET /metrics`
- **Application**: Custom metrics for requests, errors, and performance
- **Authentication**: Device registration, login attempts, token usage
- **Security**: Rate limit violations, failed authentications

### Logging
- **Structured Logging**: JSON format in production
- **Log Levels**: debug, info, warn, error
- **Request Logging**: Morgan middleware with Winston
- **Audit Logging**: Comprehensive security event logging

## 🛡️ Security

### Authentication & Authorization
- **Anonymous Device Authentication**: UUID-based with device fingerprinting
- **JWT Tokens**: Short-lived access tokens (15min) with refresh tokens (7 days)
- **API Key Management**: Role-based permissions with rate limiting
- **Zero-Knowledge Architecture**: Client-side encryption with server-side protection

### Security Features
- **Rate Limiting**: Redis-based distributed rate limiting
- **Input Validation**: Joi schema validation with XSS protection
- **Security Headers**: Helmet.js security middleware
- **SQL Injection Protection**: Prisma ORM with parameterized queries
- **CSRF Protection**: Token-based CSRF protection
- **Audit Logging**: Comprehensive security event tracking

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Client App    │    │   Admin Panel   │    │  Service APIs   │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          │ Device Auth          │ API Key Auth         │ API Key Auth
          │                      │                      │
          └──────────────────────┼──────────────────────┘
                                 │
                    ┌─────────────▼─────────────┐
                    │     Express.js App        │
                    │  ┌─────────────────────┐  │
                    │  │  Authentication     │  │
                    │  │  Middleware         │  │
                    │  └─────────────────────┘  │
                    │  ┌─────────────────────┐  │
                    │  │  Rate Limiting      │  │
                    │  │  Middleware         │  │
                    │  └─────────────────────┘  │
                    │  ┌─────────────────────┐  │
                    │  │  Validation         │  │
                    │  │  Middleware         │  │
                    │  └─────────────────────┘  │
                    └─────────────┬─────────────┘
                                  │
                    ┌─────────────▼─────────────┐
                    │     Database Layer        │
                    │  ┌─────────────────────┐  │
                    │  │  PostgreSQL         │  │
                    │  │  (Prisma ORM)       │  │
                    │  └─────────────────────┘  │
                    │  ┌─────────────────────┐  │
                    │  │  Redis Cache        │  │
                    │  │  (Rate Limiting)    │  │
                    │  └─────────────────────┘  │
                    └───────────────────────────┘
```

## 📁 Project Structure

```
zip-myl-backend/
├── src/
│   ├── auth/            # Authentication services
│   │   ├── deviceAuth.js      # Device authentication
│   │   ├── jwtService.js      # JWT token management
│   │   └── sessionManager.js  # Session management
│   ├── controllers/     # Request handlers
│   │   ├── authController.js  # Authentication endpoints
│   │   └── adminController.js # Admin endpoints
│   ├── middleware/      # Express middleware
│   │   ├── auth.js           # Authentication middleware
│   │   ├── rateLimiter.js    # Rate limiting
│   │   ├── apiKeyValidator.js # API key validation
│   │   └── validation.js     # Input validation
│   ├── routes/         # API routes
│   │   ├── auth.js          # Authentication routes
│   │   └── admin.js         # Admin routes
│   ├── services/       # Business logic
│   ├── utils/          # Utilities
│   │   └── security.js      # Security utilities
│   └── app.js          # Application entry point
├── tests/              # Test files
│   ├── unit/           # Unit tests
│   └── integration/    # Integration tests
├── scripts/            # Deployment scripts
│   ├── setup-gcp.sh   # Google Cloud setup
│   └── deploy-gcp.sh  # Google Cloud deployment
├── .github/workflows/  # CI/CD workflows
├── prisma/             # Database schema
├── .obsidian/          # Obsidian vault configuration
└── docs/               # Documentation
    ├── AUTHENTICATION.md    # Authentication documentation
    └── DEPLOYMENT.md        # Deployment guide
```

## 📖 Documentation

- **[Authentication System](AUTHENTICATION.md)**: Comprehensive authentication documentation
- **[Deployment Guide](DEPLOYMENT.md)**: Google Cloud deployment instructions
- **[Implementation Summary](IMPLEMENTATION_SUMMARY.md)**: Technical implementation details

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: [GitHub Wiki](https://github.com/XDM-ZSBW/zip-myl-backend/wiki)
- **Issues**: [GitHub Issues](https://github.com/XDM-ZSBW/zip-myl-backend/issues)
- **Discussions**: [GitHub Discussions](https://github.com/XDM-ZSBW/zip-myl-backend/discussions)

## 🔗 Related Projects

- [Myl.Zip Chromium Extension](https://github.com/XDM-ZSBW/zip-myl-chromium)
- [Myl.Zip Frontend](https://github.com/XDM-ZSBW/zip-myl-frontend)

---

**Built with ❤️ by the Myl.Zip team**
