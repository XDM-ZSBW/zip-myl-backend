# Myl.Zip Backend Service

A production-ready Node.js backend service for the Myl.Zip ecosystem, providing thought tracking, authentication, and cloud deployment capabilities.

## 🚀 Features

- **Thought Management**: Create, read, update, and delete thoughts with metadata
- **Authentication**: JWT-based authentication with optional user management
- **Caching**: Redis-based caching for improved performance
- **Database**: PostgreSQL with Prisma ORM for robust data management
- **Security**: Rate limiting, CORS, input validation, and security headers
- **Monitoring**: Health checks, metrics, and structured logging
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
| `CORS_ORIGIN` | Allowed CORS origins | `http://localhost:3000` |

### Feature Flags

- `ENABLE_AUTH`: Enable/disable authentication (default: `false`)
- `ENABLE_CACHING`: Enable/disable Redis caching (default: `true`)
- `ENABLE_METRICS`: Enable/disable metrics collection (default: `true`)

## 📚 API Documentation

### Base URL
```
http://localhost:3000
```

### Endpoints

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

#### Create Thought
```bash
curl -X POST http://localhost:3000/api/thoughts \
  -H "Content-Type: application/json" \
  -d '{
    "content": "This is a test thought",
    "metadata": {"source": "api", "tags": ["test"]},
    "url": "https://example.com"
  }'
```

#### Get Thoughts
```bash
curl "http://localhost:3000/api/thoughts?page=1&limit=10"
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
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
  zip-myl-backend
```

### Docker Compose
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## ☁️ Google Cloud Run Deployment

### Prerequisites
1. Google Cloud Project with billing enabled
2. Cloud Run API enabled
3. Container Registry API enabled
4. Service account with appropriate permissions

### Deploy
```bash
# Set environment variables
export GOOGLE_CLOUD_PROJECT_ID="your-project-id"
export DATABASE_URL="your-database-url"
export JWT_SECRET="your-jwt-secret"

# Deploy using the script
./scripts/deploy.sh
```

### Manual Deployment
```bash
# Build and push image
gcloud builds submit --tag gcr.io/$PROJECT_ID/zip-myl-backend

# Deploy to Cloud Run
gcloud run deploy zip-myl-backend \
  --image gcr.io/$PROJECT_ID/zip-myl-backend \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated
```

## 🔄 CI/CD

The project includes GitHub Actions workflows for:
- **CI Pipeline**: Automated testing, linting, and building
- **CD Pipeline**: Automated deployment to Google Cloud Run

### Required Secrets
- `GCP_PROJECT_ID`: Google Cloud Project ID
- `GCP_SA_KEY`: Service Account JSON key
- `DATABASE_URL`: Production database URL
- `REDIS_PASSWORD`: Redis password
- `JWT_SECRET`: JWT signing secret

## 📊 Monitoring

### Health Checks
- **Liveness**: `GET /health/live`
- **Readiness**: `GET /health/ready`
- **Health**: `GET /health`

### Metrics
- **Prometheus**: `GET /metrics`
- **Application**: Custom metrics for requests, errors, and performance

### Logging
- **Structured Logging**: JSON format in production
- **Log Levels**: debug, info, warn, error
- **Request Logging**: Morgan middleware with Winston

## 🛡️ Security

- **Rate Limiting**: Configurable per-IP rate limits
- **CORS**: Configurable cross-origin resource sharing
- **Input Validation**: Joi schema validation
- **Security Headers**: Helmet.js security middleware
- **Authentication**: JWT-based authentication (optional)
- **SQL Injection**: Prisma ORM protection
- **XSS Protection**: Input sanitization

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Client App    │    │   Load Balancer │    │   Cloud Run     │
│                 │◄──►│                 │◄──►│                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                       │
                       ┌─────────────────┐            │
                       │     Redis       │◄───────────┤
                       │    (Cache)      │            │
                       └─────────────────┘            │
                                                       │
                       ┌─────────────────┐            │
                       │   PostgreSQL    │◄───────────┘
                       │   (Database)    │
                       └─────────────────┘
```

## 📁 Project Structure

```
zip-myl-backend/
├── src/
│   ├── controllers/     # Request handlers
│   ├── middleware/      # Express middleware
│   ├── models/         # Data models
│   ├── routes/         # API routes
│   ├── services/       # Business logic
│   ├── utils/          # Utilities
│   └── app.js          # Application entry point
├── tests/              # Test files
├── scripts/            # Deployment scripts
├── .github/workflows/  # CI/CD workflows
├── prisma/             # Database schema
├── .obsidian/          # Obsidian vault configuration
└── docs/               # Documentation
```

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
