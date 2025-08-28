# Enhanced Trust Network Implementation

## Overview

The Enhanced Trust Network system provides **differentiated user experiences** for the Myl.Zip Chrome extension based on authentication status. When authenticated users visit backend-configured sites, they receive enhanced features unavailable to public users.

## Architecture

### Core Components

1. **Enhanced Trust Network Service** (`src/services/enhancedTrustNetworkService.js`)
   - Manages enhanced sites configuration
   - Handles user permissions and validation
   - Manages enhanced authentication state
   - Provides logging and monitoring capabilities

2. **Enhanced Trust Network Controller** (`src/controllers/enhancedTrustNetworkController.js`)
   - Handles HTTP requests and responses
   - Validates input data
   - Orchestrates service operations

3. **Enhanced Trust Network Routes** (`src/routes/enhancedTrustNetwork.js`)
   - Defines API endpoints
   - Applies middleware (authentication, rate limiting)
   - Routes requests to appropriate controllers

4. **Database Schema** (`database/enhanced_trust_network_schema.sql`)
   - Enhanced sites configuration tables
   - User permissions management
   - Authentication state tracking
   - Usage logging and analytics

## Database Schema

### Tables

#### `enhanced_sites`
Stores configuration for sites that support enhanced features.

```sql
CREATE TABLE enhanced_sites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  domain VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  enhanced_features JSONB DEFAULT '[]'::jsonb,
  permission_requirements JSONB DEFAULT '[]'::jsonb,
  ui_injection JSONB DEFAULT '{}'::jsonb,
  config JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### `user_permissions`
Manages user permissions and feature access.

```sql
CREATE TABLE user_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR(255) NOT NULL,
  device_id VARCHAR(255),
  permissions JSONB DEFAULT '[]'::jsonb,
  feature_access JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMP,
  last_verified TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### `enhanced_auth_state`
Tracks enhanced authentication state for devices.

```sql
CREATE TABLE enhanced_auth_state (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  device_id VARCHAR(255) NOT NULL,
  operator_id VARCHAR(255),
  device_token TEXT NOT NULL,
  permissions JSONB DEFAULT '[]'::jsonb,
  last_verified TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### `enhanced_feature_logs`
Logs enhanced feature usage for analytics.

```sql
CREATE TABLE enhanced_feature_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  device_id VARCHAR(255) NOT NULL,
  site_domain VARCHAR(255) NOT NULL,
  feature_name VARCHAR(100) NOT NULL,
  action VARCHAR(100) NOT NULL,
  ip_address INET,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### `enhanced_site_access_logs`
Tracks site access patterns and permissions usage.

```sql
CREATE TABLE enhanced_site_access_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  device_id VARCHAR(255) NOT NULL,
  site_domain VARCHAR(255) NOT NULL,
  access_type VARCHAR(50) NOT NULL,
  permissions_used JSONB DEFAULT '[]'::jsonb,
  features_accessed JSONB DEFAULT '[]'::jsonb,
  ip_address INET,
  user_agent TEXT,
  session_duration INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## API Endpoints

### Enhanced Sites Configuration

#### `GET /api/sites/enhanced`
Retrieves all enhanced sites configuration.

**Response:**
```json
{
  "success": true,
  "message": "Enhanced sites retrieved successfully",
  "data": {
    "sites": [
      {
        "id": "site-001",
        "domain": "xdmiq.com",
        "name": "Business Operations Frontend",
        "description": "Main business operations interface",
        "enhancedFeatures": ["admin", "debug", "analytics", "reporting"],
        "permissionRequirements": ["admin"],
        "uiInjection": {
          "adminPanel": true,
          "debugTools": true,
          "analytics": true
        },
        "config": {
          "autoEnable": true,
          "showNotification": true,
          "persistentUI": false
        },
        "lastUpdated": "2024-01-15T10:30:00Z",
        "isActive": true
      }
    ]
  }
}
```

#### `GET /api/sites/enhanced/:domain`
Retrieves enhanced site configuration by domain.

#### `POST /api/sites/enhanced`
Creates or updates enhanced site configuration.

**Request Body:**
```json
{
  "domain": "example.com",
  "name": "Example Site",
  "description": "An example enhanced site",
  "enhancedFeatures": ["feature1", "feature2"],
  "permissionRequirements": ["permission1"],
  "uiInjection": {
    "feature1Panel": true
  },
  "config": {
    "autoEnable": true,
    "showNotification": true,
    "persistentUI": false
  }
}
```

#### `PUT /api/sites/enhanced/:siteId`
Updates existing enhanced site configuration.

#### `DELETE /api/sites/enhanced/:siteId`
Deletes enhanced site configuration.

### User Permissions

#### `GET /api/auth/permissions/:userId`
Retrieves user permissions by device ID.

#### `POST /api/auth/permissions/validate`
Validates user permissions for a specific site.

**Request Body:**
```json
{
  "deviceId": "device-001",
  "siteDomain": "xdmiq.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Permissions validation completed",
  "data": {
    "hasAccess": true,
    "permissions": ["admin", "debug"],
    "features": ["admin", "debug", "analytics", "reporting"],
    "uiInjection": {
      "adminPanel": true,
      "debugTools": true,
      "analytics": true
    },
    "config": {
      "autoEnable": true,
      "showNotification": true,
      "persistentUI": false
    }
  }
}
```

### Enhanced Authentication State

#### `POST /api/auth/device/register`
Creates or updates enhanced authentication state.

**Request Body:**
```json
{
  "deviceId": "device-001",
  "operatorId": "operator-001",
  "deviceToken": "jwt-device-token",
  "permissions": ["admin", "debug", "analytics"],
  "expiresAt": "2024-12-31T23:59:59Z"
}
```

#### `POST /api/auth/device/authenticate`
Authenticates device using enhanced authentication state.

#### `POST /api/auth/device/verify`
Verifies enhanced authentication state.

#### `POST /api/auth/device/deauthenticate`
Deauthenticates device and clears enhanced authentication state.

### Enhanced Feature Usage Logging

#### `POST /api/enhanced/features/log`
Logs enhanced feature usage for analytics.

**Request Body:**
```json
{
  "deviceId": "device-001",
  "siteDomain": "xdmiq.com",
  "featureName": "adminPanel",
  "action": "open",
  "metadata": {
    "timestamp": "2024-01-15T10:30:00Z",
    "userAction": "click"
  }
}
```

#### `POST /api/enhanced/sites/log`
Logs enhanced site access patterns.

**Request Body:**
```json
{
  "deviceId": "device-001",
  "siteDomain": "xdmiq.com",
  "accessType": "enhanced",
  "permissionsUsed": ["admin"],
  "featuresAccessed": ["adminPanel", "debugTools"],
  "sessionDuration": 300
}
```

### Statistics and Monitoring

#### `GET /api/enhanced/stats/sites`
Retrieves enhanced sites statistics.

#### `GET /api/enhanced/stats/permissions`
Retrieves user permissions statistics.

#### `GET /api/enhanced/health`
Health check endpoint for the Enhanced Trust Network.

## Rate Limiting

The Enhanced Trust Network implements specific rate limiting strategies:

- **Enhanced Trust Network**: 20 requests per 15 minutes
- **Enhanced Sites**: 10 requests per 15 minutes
- **Permissions**: 20 requests per 15 minutes

## Caching Strategy

- **Enhanced Sites**: Cache for 5 minutes
- **Permissions**: Cache for 15 minutes
- **Device Tokens**: Cache for 1 hour

## Security Features

1. **JWT Token Management**
   - Device tokens with 24-hour expiration
   - Secure token storage with encryption
   - Automatic token refresh on verification

2. **Permission Validation**
   - Role-based access control (RBAC)
   - Feature-level permissions
   - Session validation every 15 minutes

3. **Audit Logging**
   - Comprehensive operation logging
   - Feature usage tracking
   - Security event monitoring

## Performance Requirements

- **Authentication**: < 200ms response time
- **Site Configuration**: < 100ms response time
- **Permission Validation**: < 50ms response time

## Integration Points

### Existing Systems
- **User Management**: Integrates with existing user authentication
- **Permission System**: Extends current RBAC implementation
- **Audit Logging**: Tracks all enhanced feature access

### Monitoring & Analytics
- **Feature Usage**: Tracks which enhanced features are accessed
- **Performance Metrics**: Monitors response times and error rates
- **Security Events**: Logs authentication attempts and permission violations

## Testing

### Test Coverage
- **Unit Tests**: Service layer testing
- **Integration Tests**: End-to-end API testing
- **Security Tests**: Permission validation and access control

### Test Data
- Default enhanced sites configuration
- Test user permissions and authentication states
- Comprehensive test scenarios for all endpoints

## Deployment

### Environment Setup
1. **Development**: Local testing environment
2. **Staging**: Chrome extension testing environment
3. **Production**: Live extension environment

### Configuration Management
- **Feature Flags**: Enable/disable enhanced features
- **Site Configuration**: Dynamic site management
- **Permission Templates**: Predefined permission sets

## Monitoring & Maintenance

### Real-time Monitoring
- Authentication failures and permission violations
- Performance dashboards for response times and error rates
- Usage analytics for feature access patterns

### Troubleshooting
- Centralized logging for debugging
- Detailed error reporting and analysis
- Extension-specific support documentation

## Usage Examples

### Chrome Extension Integration

```javascript
// Check if current site supports enhanced features
const currentDomain = window.location.hostname;
const response = await fetch(`/api/sites/enhanced/${currentDomain}`);
const siteConfig = await response.json();

if (siteConfig.success && siteConfig.data) {
  // Site supports enhanced features
  const enhancedFeatures = siteConfig.data.enhancedFeatures;
  const uiInjection = siteConfig.data.uiInjection;
  
  // Inject enhanced UI elements
  if (uiInjection.adminPanel) {
    injectAdminPanel();
  }
  
  if (uiInjection.debugTools) {
    injectDebugTools();
  }
}
```

### Permission Validation

```javascript
// Validate user permissions for current site
const validationResponse = await fetch('/api/auth/permissions/validate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    deviceId: getDeviceId(),
    siteDomain: window.location.hostname
  })
});

const validation = await validationResponse.json();

if (validation.data.hasAccess) {
  // User has access to enhanced features
  enableEnhancedFeatures(validation.data.features);
} else {
  // User does not have access
  showAccessDeniedMessage(validation.data.reason);
}
```

## Future Enhancements

1. **Advanced Permission Models**
   - Time-based permissions
   - Context-aware access control
   - Dynamic permission updates

2. **Enhanced Analytics**
   - User behavior tracking
   - Feature adoption metrics
   - Performance optimization insights

3. **Integration Capabilities**
   - Third-party authentication providers
   - External permission systems
   - API gateway integration

## Support & Documentation

For additional support and documentation:
- **API Reference**: Complete endpoint documentation
- **Integration Guide**: Step-by-step implementation guide
- **Troubleshooting**: Common issues and solutions
- **Performance Tuning**: Optimization recommendations

---

*This implementation provides a robust foundation for the Enhanced Trust Network system, enabling the Chrome extension to deliver differentiated user experiences based on authentication status and permissions.*
