# Backend Team Refactor Prompt: Frontend Separation

**Date:** August 29, 2025  
**Objective:** Refactor backend to support pure frontend Chromium extension  
**Priority:** HIGH - IP protection and clean architecture separation  

---

## 🎯 **REFACTOR OBJECTIVE**

The frontend team is converting this codebase to a **pure Chromium extension frontend** with **zero embedded business logic**. Your task is to refactor the backend to:

1. **Expose all business logic via clean REST APIs**
2. **Remove any frontend-specific code from backend**
3. **Ensure complete separation of concerns**
4. **Maintain all existing functionality**
5. **Prepare for external frontend consumption**

---

## 🚨 **CRITICAL REQUIREMENTS**

### **IP Protection**
- **NO business logic** in frontend code
- **NO database queries** in frontend
- **NO authentication logic** in frontend
- **NO encryption/decryption** in frontend
- **Complete separation** of backend and frontend

### **API-First Architecture**
- **All functionality** must be accessible via REST APIs
- **No server-side rendering** or HTML generation
- **Pure JSON responses** for all endpoints
- **Stateless API design** for scalability

---

## 🔄 **PHASE 1: API RESTRUCTURING**

### **1.1 Create Clean API Endpoints**

**Current Issue:** Mixed API and frontend serving in same routes

**Required Changes:**
```javascript
// BEFORE: Mixed frontend/API routes
app.use('/', rootRoutes);           // ❌ Serves HTML
app.use('/api/v1/auth', authRoutes); // ✅ API only

// AFTER: Pure API structure
app.use('/api/v1/auth', authRoutes);     // ✅ Authentication APIs
app.use('/api/v1/devices', deviceRoutes); // ✅ Device management APIs
app.use('/api/v1/nft', nftRoutes);       // ✅ NFT generation APIs
app.use('/api/v1/thoughts', thoughtRoutes); // ✅ Thoughts APIs
app.use('/api/v1/admin', adminRoutes);   // ✅ Admin APIs
app.use('/api/v1/health', healthRoutes); // ✅ Health check APIs

// ❌ REMOVE: All frontend-serving routes
// app.use('/', rootRoutes);           // DELETE
// app.use('/docs', docsRoutes);       // DELETE (or convert to API)
// app.use('/public', staticRoutes);   // DELETE
```

### **1.2 Standardize API Response Format**

**Current Issue:** Inconsistent API response structures

**Required Standard:**
```javascript
// ✅ SUCCESS Response Format
{
  "success": true,
  "data": { /* actual data */ },
  "timestamp": "2025-08-29T10:00:00.000Z",
  "requestId": "req_123456789"
}

// ✅ ERROR Response Format
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": { /* additional error info */ },
    "userAction": "What user should do",
    "retryAfter": 30
  },
  "timestamp": "2025-08-29T10:00:00.000Z",
  "requestId": "req_123456789"
}

// ✅ PAGINATION Response Format
{
  "success": true,
  "data": [ /* items */ ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5,
    "hasNext": true,
    "hasPrev": false
  },
  "timestamp": "2025-08-29T10:00:00.000Z"
}
```

---

## 🔐 **PHASE 2: AUTHENTICATION REFACTOR**

### **2.1 Device Authentication APIs**

**Current Issue:** Authentication mixed with frontend logic

**Required APIs:**
```javascript
// POST /api/v1/auth/device/register
{
  "deviceData": {
    "platform": "chrome-extension",
    "version": "1.0.0",
    "userAgent": "Mozilla/5.0...",
    "capabilities": ["nft-generation", "device-trust"]
  }
}

// Response:
{
  "success": true,
  "data": {
    "deviceId": "dev_123456789",
    "authToken": "jwt_token_here",
    "refreshToken": "refresh_token_here",
    "expiresAt": "2025-08-29T11:00:00.000Z",
    "capabilities": ["nft-generation", "device-trust"]
  }
}

// POST /api/v1/auth/device/authenticate
{
  "deviceId": "dev_123456789",
  "authToken": "jwt_token_here"
}

// POST /api/v1/auth/device/refresh
{
  "deviceId": "dev_123456789",
  "refreshToken": "refresh_token_here"
}

// DELETE /api/v1/auth/device/revoke
// Headers: Authorization: Bearer {authToken}
```

### **2.2 API Key Management**

**Required APIs:**
```javascript
// POST /api/v1/admin/keys/create
{
  "name": "Extension API Key",
  "permissions": ["nft-generation", "device-read"],
  "expiresAt": "2026-08-29T10:00:00.000Z"
}

// GET /api/v1/admin/keys/list
// Response: List of API keys with permissions

// PUT /api/v1/admin/keys/update
// DELETE /api/v1/admin/keys/revoke
```

---

## 🎨 **PHASE 3: NFT GENERATION REFACTOR**

### **3.1 Pairing Code Generation APIs**

**Current Issue:** NFT generation mixed with frontend logic

**Required APIs:**
```javascript
// POST /api/v1/nft/pairing-code/generate
{
  "format": "uuid", // "uuid", "short", "legacy"
  "deviceId": "dev_123456789",
  "preferences": {
    "geometricShapes": [4, 6, 8, 12],
    "colorScheme": "gradient",
    "patternType": "geometric"
  }
}

// Response:
{
  "success": true,
  "data": {
    "pairingCode": "uuid-here",
    "status": "generating",
    "estimatedTime": 45,
    "queuePosition": 1,
    "generationStartedAt": "2025-08-29T10:00:00.000Z"
  }
}

// GET /api/v1/nft/pairing-code/status/{pairingCode}
// Response: Current generation status with progress

// GET /api/v1/nft/pairing-code/status/{pairingCode}/stream
// Response: Server-Sent Events for real-time updates

// POST /api/v1/nft/pairing-code/retry/{pairingCode}
// Response: New generation attempt
```

### **3.2 NFT Management APIs**

```javascript
// GET /api/v1/nft/collection/{userId}
// Response: User's NFT collection

// GET /api/v1/nft/{nftId}
// Response: Specific NFT details

// PUT /api/v1/nft/{nftId}/profile-picture
// Response: Updated NFT with new profile picture

// GET /api/v1/nft/stats/{userId}
// Response: User's NFT statistics
```

---

## 🔧 **PHASE 4: DEVICE MANAGEMENT REFACTOR**

### **4.1 Device Trust APIs**

**Current Issue:** Device trust logic mixed with frontend

**Required APIs:**
```javascript
// GET /api/v1/devices/trusted
// Response: List of trusted devices

// POST /api/v1/devices/trust/{deviceId}
// Response: Device trust status

// DELETE /api/v1/devices/trust/{deviceId}
// Response: Device trust revoked

// GET /api/v1/devices/permissions/{deviceId}
// Response: Device permissions and capabilities

// PUT /api/v1/devices/update/{deviceId}
{
  "name": "Updated Device Name",
  "capabilities": ["nft-generation", "device-trust"],
  "settings": { /* device-specific settings */ }
}
```

### **4.2 Device Pairing APIs**

```javascript
// POST /api/v1/devices/pair
{
  "sourceDeviceId": "dev_123",
  "targetDeviceId": "dev_456",
  "pairingCode": "uuid-pairing-code"
}

// GET /api/v1/devices/pair/status/{pairingId}
// Response: Pairing status and progress

// DELETE /api/v1/devices/pair/{pairingId}
// Response: Pairing cancelled/removed
```

---

## 💭 **PHASE 5: THOUGHTS MANAGEMENT REFACTOR**

### **5.1 Thoughts CRUD APIs**

**Current Issue:** Thoughts logic mixed with frontend

**Required APIs:**
```javascript
// POST /api/v1/thoughts
{
  "content": "Encrypted thought content",
  "metadata": {
    "category": "personal",
    "tags": ["important", "work"],
    "priority": "high"
  },
  "encryption": {
    "algorithm": "aes-256-gcm",
    "keyId": "key_123"
  }
}

// GET /api/v1/thoughts
// Query params: page, limit, category, tags, dateFrom, dateTo

// GET /api/v1/thoughts/{thoughtId}

// PUT /api/v1/thoughts/{thoughtId}

// DELETE /api/v1/thoughts/{thoughtId}

// POST /api/v1/thoughts/batch
// Response: Batch operation results
```

---

## 📊 **PHASE 6: MONITORING & HEALTH REFACTOR**

### **6.1 Health Check APIs**

**Required APIs:**
```javascript
// GET /api/v1/health
// Response: Basic health status

// GET /api/v1/health/live
// Response: Liveness probe (for Kubernetes)

// GET /api/v1/health/ready
// Response: Readiness probe (for Kubernetes)

// GET /api/v1/health/detailed
// Response: Detailed system health including:
// - Database connectivity
// - Redis connectivity
// - External service status
// - System resources
// - Queue status
```

### **6.2 Metrics & Analytics APIs**

```javascript
// GET /api/v1/metrics
// Response: Prometheus metrics

// GET /api/v1/analytics/usage
// Response: Usage statistics

// GET /api/v1/analytics/performance
// Response: Performance metrics

// GET /api/v1/analytics/errors
// Response: Error statistics and trends
```

---

## 🧹 **PHASE 7: CLEANUP & OPTIMIZATION**

### **7.1 Remove Frontend Code**

**Files to Delete/Modify:**
```bash
# ❌ DELETE these files/directories
src/routes/root.js              # Frontend HTML serving
src/routes/docs.js              # Frontend documentation
public/                          # Static frontend files
src/middleware/cors.js           # Frontend-specific CORS

# ✅ MODIFY these files
src/app.js                      # Remove static file serving
src/middleware/                 # Remove frontend middleware
```

### **7.2 Update CORS Configuration**

**Current Issue:** CORS configured for frontend integration

**Required Changes:**
```javascript
// BEFORE: Frontend-specific CORS
const corsConfig = {
  origin: ['http://localhost:3000', 'https://api.myl.zip'],
  credentials: true
};

// AFTER: API-only CORS
const corsConfig = {
  origin: ['*'], // Or specific allowed domains
  credentials: false, // No cookies needed for API
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
};
```

### **7.3 Remove Static File Serving**

**Current Issue:** Express serving static files

**Required Changes:**
```javascript
// ❌ REMOVE from app.js
app.use(express.static(path.join(__dirname, '../public')));

// ✅ ADD: API-only middleware
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    next();
  } else {
    res.status(404).json({
      success: false,
      error: {
        code: 'ENDPOINT_NOT_FOUND',
        message: 'This is an API-only service. Frontend should be served separately.',
        userAction: 'Use the appropriate frontend application or API client.'
      }
    });
  }
});
```

---

## 🔒 **PHASE 8: SECURITY HARDENING**

### **8.1 API Security**

**Required Changes:**
```javascript
// ✅ ADD: Rate limiting per device
const deviceRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each device to 100 requests per windowMs
  keyGenerator: (req) => req.headers['x-device-id'] || req.ip,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests from this device',
      retryAfter: Math.ceil(req.rateLimit.resetTime / 1000)
    }
  }
});

// ✅ ADD: API key validation middleware
const validateApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'API_KEY_MISSING',
        message: 'API key required',
        userAction: 'Include X-API-Key header'
      }
    });
  }
  // Validate API key logic here
  next();
};
```

### **8.2 Input Validation**

**Required Changes:**
```javascript
// ✅ ADD: Comprehensive input validation
const validateNFTGeneration = (req, res, next) => {
  const { format, deviceId, preferences } = req.body;
  
  if (!format || !['uuid', 'short', 'legacy'].includes(format)) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_FORMAT',
        message: 'Invalid pairing code format',
        userAction: 'Use one of: uuid, short, legacy'
      }
    });
  }
  
  if (!deviceId) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'DEVICE_ID_MISSING',
        message: 'Device ID is required',
        userAction: 'Include deviceId in request body'
      }
    });
  }
  
  next();
};
```

---

## 📋 **PHASE 9: TESTING & VALIDATION**

### **9.1 API Testing**

**Required Tests:**
```javascript
// ✅ Test all API endpoints
describe('NFT Generation API', () => {
  test('POST /api/v1/nft/pairing-code/generate', async () => {
    // Test successful generation
    // Test validation errors
    // Test rate limiting
    // Test authentication
  });
  
  test('GET /api/v1/nft/pairing-code/status/{code}', async () => {
    // Test status retrieval
    // Test invalid codes
    // Test authentication
  });
});

// ✅ Test error handling
describe('Error Handling', () => {
  test('Standardized error responses', async () => {
    // Test 400, 401, 403, 404, 429, 500 errors
    // Verify error format consistency
  });
});
```

### **9.2 Integration Testing**

**Required Tests:**
```javascript
// ✅ Test complete workflows
describe('Complete NFT Workflow', () => {
  test('Device registration → NFT generation → Status monitoring', async () => {
    // 1. Register device
    // 2. Generate pairing code
    // 3. Monitor generation status
    // 4. Verify completion
  });
});
```

---

## 🚀 **PHASE 10: DEPLOYMENT & DOCUMENTATION**

### **10.1 API Documentation**

**Required Deliverables:**
```yaml
# OpenAPI 3.0 Specification
openapi: 3.0.0
info:
  title: MyL.Zip Backend API
  version: 2.0.0
  description: Pure API service for MyL.Zip Chromium extension

paths:
  /api/v1/auth/device/register:
    post:
      summary: Register new device
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/DeviceRegistration'
      responses:
        '200':
          description: Device registered successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/DeviceRegistrationResponse'
```

### **10.2 Deployment Configuration**

**Required Changes:**
```yaml
# Dockerfile - Remove frontend dependencies
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY src/ ./src/
EXPOSE 8080
CMD ["node", "src/app.js"]

# Kubernetes - API-only service
apiVersion: v1
kind: Service
metadata:
  name: myl-zip-api
spec:
  ports:
  - port: 8080
    targetPort: 8080
  selector:
    app: myl-zip-api
```

---

## 📊 **SUCCESS METRICS**

### **Functional Requirements**
- ✅ **100% API coverage** of all business logic
- ✅ **Zero frontend code** in backend
- ✅ **Complete separation** of concerns
- ✅ **All existing functionality** preserved
- ✅ **Real-time capabilities** maintained

### **Technical Requirements**
- ✅ **RESTful API design** following best practices
- ✅ **Comprehensive error handling** with user guidance
- ✅ **Rate limiting** and security measures
- ✅ **Input validation** and sanitization
- ✅ **Performance optimization** for API calls

### **Business Requirements**
- ✅ **IP protection** through clean separation
- ✅ **Scalable architecture** for future growth
- ✅ **Maintainable codebase** for development team
- ✅ **Professional quality** meeting industry standards
- ✅ **Ready for external consumption** by frontend team

---

## ⏱️ **TIMELINE & PRIORITIES**

### **Week 1: Planning & Analysis**
- [ ] Audit current codebase for frontend dependencies
- [ ] Design new API structure
- [ ] Plan migration strategy

### **Week 2-3: Core API Development**
- [ ] Implement authentication APIs
- [ ] Create NFT generation APIs
- [ ] Develop device management APIs

### **Week 4-5: Business Logic APIs**
- [ ] Implement thoughts management APIs
- [ ] Create admin and monitoring APIs
- [ ] Add comprehensive error handling

### **Week 6: Testing & Validation**
- [ ] Write comprehensive API tests
- [ ] Validate all functionality
- [ ] Performance testing

### **Week 7: Cleanup & Deployment**
- [ ] Remove all frontend code
- [ ] Update deployment configuration
- [ ] Create API documentation

---

## 🔧 **TECHNICAL REQUIREMENTS**

### **API Standards**
- **RESTful design** following HTTP standards
- **JSON responses** with consistent formatting
- **Proper HTTP status codes** for all responses
- **Request/response validation** using Joi or similar
- **Comprehensive error handling** with user guidance

### **Security Requirements**
- **API key authentication** for all endpoints
- **Rate limiting** per device/IP
- **Input sanitization** and validation
- **CORS configuration** for cross-origin requests
- **Request signing** for sensitive operations

### **Performance Requirements**
- **Response time** < 200ms for all endpoints
- **Concurrent handling** of 1000+ requests
- **Efficient database queries** with proper indexing
- **Caching strategy** for frequently accessed data
- **Queue management** for long-running operations

---

## 📞 **SUPPORT & RESOURCES**

### **Frontend Team Support**
- **API specification** and documentation
- **Test endpoints** for development
- **Error code reference** for debugging
- **Integration examples** and best practices

### **Development Resources**
- **Postman collection** for API testing
- **Swagger UI** for interactive documentation
- **Performance monitoring** tools
- **Security scanning** tools

---

**This refactor is critical for IP protection and clean architecture. The backend team must ensure complete separation of frontend and backend concerns while maintaining all existing functionality through well-designed APIs.**

**Priority: URGENT - This refactor enables the frontend team to proceed with Chromium extension development and protects company IP through clean separation of concerns.**
