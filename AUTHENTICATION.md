# Authentication System Documentation

## Overview

The zip-myl-backend implements a comprehensive ID and access management system with anonymous device-based authentication, zero-knowledge architecture, and role-based access control.

## Architecture

### Anonymous Device-Based Authentication
- **UUID-based device identification**: Each device gets a unique UUID
- **JWT tokens with refresh mechanism**: Short-lived access tokens (15 minutes) with longer-lived refresh tokens (7 days)
- **Device fingerprinting**: Based on User-Agent, Accept headers, IP address, and connection details
- **No personal data collection**: Completely anonymous authentication

### Zero-Knowledge Architecture
- **Client-side encryption keys**: All user data encryption happens on the client
- **Server cannot decrypt user data**: Server only stores encrypted data
- **No user tracking**: No personal information is stored or tracked
- **End-to-end encryption**: All sensitive data is encrypted before transmission

### Access Control Implementation
- **Rate limiting per device**: Configurable rate limits based on device type and role
- **API key management**: For different client types (web, mobile, desktop, service)
- **Role-based access control**: Anonymous, admin, and service roles
- **Request validation and sanitization**: Comprehensive input validation and XSS protection
- **CORS configuration**: Secure cross-origin resource sharing

## Database Schema

### Devices Table
```sql
CREATE TABLE devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fingerprint VARCHAR(255) UNIQUE NOT NULL,
  ip_address VARCHAR(45) NOT NULL,
  user_agent TEXT,
  is_active BOOLEAN DEFAULT true,
  last_seen TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Sessions Table
```sql
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
  access_token VARCHAR(255) UNIQUE NOT NULL,
  refresh_token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  refresh_expires_at TIMESTAMP NOT NULL,
  is_active BOOLEAN DEFAULT true,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### API Keys Table
```sql
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  key_hash VARCHAR(255) UNIQUE NOT NULL,
  permissions TEXT[] NOT NULL,
  rate_limit INTEGER,
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMP,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Clients Table
```sql
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  client_type VARCHAR(50) NOT NULL, -- 'web', 'mobile', 'desktop', 'service'
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Audit Logs Table
```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID REFERENCES api_keys(id) ON DELETE SET NULL,
  device_id UUID REFERENCES devices(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  resource VARCHAR(255),
  ip_address VARCHAR(45) NOT NULL,
  user_agent TEXT,
  success BOOLEAN NOT NULL,
  error_code VARCHAR(50),
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## API Endpoints

### Authentication Endpoints

#### Device Registration
```http
POST /api/v1/auth/device/register
```
Registers a new anonymous device and returns access/refresh tokens.

**Response:**
```json
{
  "success": true,
  "message": "Device registered successfully",
  "data": {
    "deviceId": "uuid",
    "accessToken": "jwt-token",
    "refreshToken": "jwt-refresh-token",
    "expiresIn": 900,
    "refreshExpiresIn": 604800
  }
}
```

#### Login (Token Refresh)
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "refreshToken": "jwt-refresh-token"
}
```

#### Refresh Access Token
```http
POST /api/v1/auth/refresh
Content-Type: application/json

{
  "refreshToken": "jwt-refresh-token"
}
```

#### Logout
```http
POST /api/v1/auth/logout
Authorization: Bearer <access-token>
```

#### Validate Token
```http
POST /api/v1/auth/validate
Authorization: Bearer <access-token>
```

### Device Management Endpoints

#### Get Device Information
```http
GET /api/v1/auth/device/info
Authorization: Bearer <access-token>
```

#### Update Device Information
```http
PUT /api/v1/auth/device/update
Authorization: Bearer <access-token>
Content-Type: application/json

{
  "userAgent": "updated-user-agent"
}
```

#### Revoke Device Access
```http
DELETE /api/v1/auth/device/revoke
Authorization: Bearer <access-token>
```

### Admin Endpoints (Require API Key)

#### Create API Key
```http
POST /api/v1/admin/keys/create
X-API-Key: <admin-api-key>
Content-Type: application/json

{
  "clientId": "client-uuid",
  "permissions": ["read", "write"],
  "rateLimit": 1000,
  "expiresAt": "2024-12-31T23:59:59Z"
}
```

#### List API Keys
```http
GET /api/v1/admin/keys/list?page=1&limit=20
X-API-Key: <admin-api-key>
```

#### Update API Key
```http
PUT /api/v1/admin/keys/:id/update
X-API-Key: <admin-api-key>
Content-Type: application/json

{
  "permissions": ["read", "write", "admin"],
  "isActive": true
}
```

#### Revoke API Key
```http
DELETE /api/v1/admin/keys/:id/revoke
X-API-Key: <admin-api-key>
```

## Security Features

### Encryption
- **AES-256**: For data encryption
- **RSA-2048**: For key exchange
- **SHA-256**: For hashing and integrity

### Validation
- **Input sanitization**: XSS prevention
- **SQL injection prevention**: Parameterized queries
- **Request size limits**: Configurable maximum request sizes
- **CSRF protection**: Token-based CSRF protection

### Monitoring
- **Audit logging**: All authentication events logged
- **Failed attempt tracking**: Suspicious activity detection
- **Rate limit violations**: Automatic rate limit enforcement
- **Security event logging**: Comprehensive security monitoring

## Rate Limiting

### Device-Based Rate Limits
- **General API**: 100 requests per 15 minutes
- **Authentication**: 5 attempts per 15 minutes
- **Device Registration**: 3 registrations per hour
- **API Key Operations**: 10 operations per hour
- **Strict Operations**: 3 attempts per 5 minutes

### Rate Limit Headers
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

## Environment Configuration

### Required Environment Variables
```bash
# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key
JWT_REFRESH_SECRET=your-super-secret-refresh-key
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
MAX_SESSIONS_PER_DEVICE=5
SESSION_CLEANUP_INTERVAL=3600000

# API Key Configuration
INTERNAL_API_KEY=your-internal-api-key

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password

# Database Configuration
DATABASE_URL=postgresql://user:password@localhost:5432/database
```

## Usage Examples

### Client-Side Implementation

#### Register Device
```javascript
const registerDevice = async () => {
  const response = await fetch('/api/v1/auth/device/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  });
  
  const data = await response.json();
  
  if (data.success) {
    // Store tokens securely
    localStorage.setItem('accessToken', data.data.accessToken);
    localStorage.setItem('refreshToken', data.data.refreshToken);
    localStorage.setItem('deviceId', data.data.deviceId);
  }
};
```

#### Make Authenticated Request
```javascript
const makeAuthenticatedRequest = async (url, options = {}) => {
  const accessToken = localStorage.getItem('accessToken');
  
  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${accessToken}`
    }
  });
  
  if (response.status === 401) {
    // Token expired, try to refresh
    await refreshToken();
    // Retry request
    return makeAuthenticatedRequest(url, options);
  }
  
  return response;
};
```

#### Refresh Token
```javascript
const refreshToken = async () => {
  const refreshToken = localStorage.getItem('refreshToken');
  
  const response = await fetch('/api/v1/auth/refresh', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ refreshToken })
  });
  
  const data = await response.json();
  
  if (data.success) {
    localStorage.setItem('accessToken', data.data.accessToken);
    localStorage.setItem('refreshToken', data.data.refreshToken);
  } else {
    // Refresh failed, redirect to login
    window.location.href = '/login';
  }
};
```

### Server-Side Implementation

#### Using API Keys
```javascript
const makeApiRequest = async (url, apiKey) => {
  const response = await fetch(url, {
    headers: {
      'X-API-Key': apiKey,
      'Content-Type': 'application/json'
    }
  });
  
  return response;
};
```

## Testing

### Unit Tests
```bash
npm test tests/unit/auth.test.js
```

### Integration Tests
```bash
npm test tests/integration/auth.test.js
```

### Security Tests
```bash
npm test tests/security/
```

## Production Considerations

### Performance
- **Redis caching**: Session and rate limit data cached in Redis
- **Connection pooling**: Database connection pooling for optimal performance
- **Token validation**: Efficient JWT validation with minimal database queries

### Monitoring
- **Prometheus metrics**: Authentication and rate limiting metrics
- **Health checks**: Comprehensive health check endpoints
- **Structured logging**: JSON-formatted logs for easy parsing

### Scalability
- **Horizontal scaling**: Stateless design allows horizontal scaling
- **Load balancing**: Compatible with load balancers
- **Database sharding**: Schema designed for potential sharding

## Security Best Practices

1. **Never log sensitive data**: Tokens and keys are never logged
2. **Use HTTPS**: All communication must be over HTTPS in production
3. **Regular token rotation**: Implement regular token rotation policies
4. **Monitor for anomalies**: Set up alerts for suspicious activity
5. **Keep dependencies updated**: Regularly update all dependencies
6. **Use strong secrets**: Generate cryptographically strong secrets
7. **Implement proper CORS**: Configure CORS policies appropriately
8. **Rate limit everything**: Apply rate limiting to all endpoints
9. **Validate all inputs**: Sanitize and validate all user inputs
10. **Audit regularly**: Regular security audits and penetration testing

## Troubleshooting

### Common Issues

#### Token Validation Failures
- Check JWT_SECRET configuration
- Verify token expiration times
- Ensure proper token format

#### Rate Limit Issues
- Check Redis connection
- Verify rate limit configuration
- Monitor rate limit headers

#### Database Connection Issues
- Verify DATABASE_URL format
- Check database connectivity
- Ensure proper permissions

### Debug Mode
Enable debug logging by setting:
```bash
LOG_LEVEL=debug
```

This will provide detailed information about authentication flows and potential issues.
