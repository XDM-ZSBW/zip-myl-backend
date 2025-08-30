# 🔐 SSL Certificate Provisioning API Documentation

## Overview

The MyL.Zip SSL Certificate Provisioning System provides automatic SSL certificate generation, management, and Windows 11 integration for every registered device. This system generates immediate revenue through premium SSL features while providing free basic SSL certificates to attract users.

## 🎯 Business Model

- **Free Tier**: Basic SSL certificate with auto-renewal for all registered devices
- **Premium Tier**: $19/month for advanced SSL management features
- **Enterprise Tier**: $99/month for team SSL management

## 🚀 Quick Start

### 1. Provision SSL Certificate for Device

```bash
curl -X POST http://localhost:3000/api/v1/ssl/provision-device \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "device_123",
    "domain": "device123.myl.zip",
    "certificateType": "single",
    "autoRenewal": true
  }'
```

### 2. Install on Windows 11

```bash
curl -X POST http://localhost:3000/api/v1/windows-ssl/auto-install \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "device_123",
    "domain": "device123.myl.zip"
  }'
```

## 📋 API Endpoints

### SSL Certificate Management

#### POST `/api/v1/ssl/provision-device`
Provision SSL certificate for a device.

**Request Body:**
```json
{
  "deviceId": "string (required)",
  "domain": "string (required)",
  "certificateType": "single|wildcard|multi (optional)",
  "autoRenewal": "boolean (optional, default: true)"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "certificate": {
      "id": "uuid",
      "deviceId": "device_123",
      "domain": "device123.myl.zip",
      "type": "single",
      "status": "active",
      "issuedAt": "2025-08-29T13:00:00.000Z",
      "expiresAt": "2025-11-27T13:00:00.000Z",
      "autoRenewal": true,
      "premium": false,
      "features": ["single_domain_certificate", "automatic_renewal", "basic_ssl_management", "standard_support"]
    }
  },
  "message": "SSL certificate provisioned successfully"
}
```

#### GET `/api/v1/ssl/device-status/:deviceId`
Get SSL status for a specific device.

**Response:**
```json
{
  "success": true,
  "data": {
    "certificate": {
      "id": "uuid",
      "deviceId": "device_123",
      "domain": "device123.myl.zip",
      "status": "active",
      "expired": false,
      "daysUntilExpiry": 45,
      "needsRenewal": false
    },
    "status": "active"
  },
  "message": "SSL device status retrieved successfully"
}
```

#### POST `/api/v1/ssl/renew-certificate/:deviceId`
Renew SSL certificate for a device.

#### DELETE `/api/v1/ssl/revoke-certificate/:deviceId`
Revoke SSL certificate for a device.

### Premium Features

#### GET `/api/v1/ssl/premium-features/:deviceId`
Get premium SSL features for a device.

**Response (Non-Premium):**
```json
{
  "success": false,
  "data": {
    "message": "Premium features not available",
    "upgradeRequired": true,
    "pricing": {
      "monthly": 19.00,
      "currency": "USD",
      "features": [
        "wildcard_certificates",
        "multi_domain_certificates",
        "custom_domains",
        "ssl_monitoring",
        "hsts_configuration",
        "ocsp_stapling",
        "api_access",
        "priority_support",
        "advanced_analytics",
        "team_management"
      ]
    }
  },
  "message": "Premium features information retrieved"
}
```

#### POST `/api/v1/ssl/upgrade-to-premium`
Upgrade device to premium SSL.

**Request Body:**
```json
{
  "deviceId": "string (required)"
}
```

#### GET `/api/v1/ssl/advanced-management/:deviceId`
Get advanced SSL management features (Premium only).

### Windows 11 Integration

#### POST `/api/v1/windows-ssl/install/:deviceId`
Install SSL certificate on Windows 11.

#### DELETE `/api/v1/windows-ssl/remove/:deviceId`
Remove SSL certificate from Windows 11.

#### GET `/api/v1/windows-ssl/status/:deviceId`
Get Windows SSL certificate status.

#### POST `/api/v1/windows-ssl/auto-install`
Auto-install SSL certificate for device (Windows integration).

**Request Body:**
```json
{
  "deviceId": "string (required)",
  "domain": "string (required)",
  "certificateType": "single|wildcard|multi (optional)",
  "autoRenewal": "boolean (optional, default: true)"
}
```

#### GET `/api/v1/windows-ssl/powershell/:deviceId/:action`
Generate PowerShell script for SSL management.

**Actions:** `install`, `remove`, `status`

**Response:**
```json
{
  "success": true,
  "data": {
    "script": "# Install SSL Certificate for device_123\n# Run as Administrator\n\n# Import certificate\nImport-Certificate -FilePath \"device_123.crt\" -CertStoreLocation Cert:\\LocalMachine\\My\n\n# Verify installation\nGet-ChildItem -Path Cert:\\LocalMachine\\My | Where-Object {$_.Subject -like \"*device_123*\"}\n\nWrite-Host \"SSL certificate installed successfully for device_123\"",
    "description": "Install SSL certificate in Windows certificate store",
    "action": "install",
    "deviceId": "device_123",
    "powershellVersion": "5.1+",
    "requirements": "Run as Administrator"
  },
  "message": "PowerShell script generated successfully"
}
```

### Analytics & Monitoring

#### GET `/api/v1/ssl/analytics/revenue`
Get SSL revenue analytics (Admin function).

**Response:**
```json
{
  "success": true,
  "data": {
    "totalUsers": 150,
    "premiumUsers": 38,
    "monthlyRevenue": 722.00,
    "conversionRate": 25.33,
    "currency": "USD"
  },
  "message": "SSL revenue analytics retrieved successfully"
}
```

#### GET `/api/v1/ssl/analytics/certificates`
Get all SSL certificates (Admin function).

#### GET `/api/v1/ssl/health`
Get SSL service health status.

#### GET `/api/v1/windows-ssl/health`
Get Windows SSL integration health status.

## 🔧 Windows 11 Integration Features

### Certificate Store Integration
- **Store Location**: `LocalMachine\My`
- **Automatic Installation**: Seamless certificate installation
- **PowerShell Support**: Full PowerShell management scripts
- **Service Integration**: Windows service for SSL management

### Business Features
- **Team Management**: Multiple device SSL management
- **Compliance Ready**: Business compliance requirements
- **Enterprise Support**: Priority business support
- **Advanced Analytics**: Detailed SSL usage analytics

## 💰 Revenue Generation

### Premium Features ($19/month)
- Wildcard certificates
- Multi-domain certificates
- Custom domains
- SSL monitoring and alerts
- HSTS configuration
- OCSP stapling
- API access
- Priority support
- Advanced analytics
- Team management

### Enterprise Features ($99/month)
- Team SSL management
- Advanced compliance reporting
- Dedicated support
- Custom integration
- SLA guarantees

## 🚨 Error Handling

### Common Error Codes
- `SSL_CERTIFICATE_NOT_FOUND`: No certificate found for device
- `PREMIUM_SUBSCRIPTION_REQUIRED`: Premium features require upgrade
- `WINDOWS_INTEGRATION_FAILED`: Windows installation failed
- `CERTIFICATE_EXPIRED`: Certificate has expired
- `RENEWAL_FAILED`: Certificate renewal failed

### Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": "Additional error details"
  },
  "message": "Error message for API consumers"
}
```

## 🔒 Security

### API Key Authentication
All SSL endpoints require valid API key in `X-API-Key` header.

### Rate Limiting
- General API: 100 requests per 15 minutes
- SSL Operations: 50 requests per 15 minutes
- Certificate Generation: 10 requests per hour

### Certificate Security
- Private keys remain with users
- Encrypted certificate storage
- Secure certificate transmission
- Audit logging for all operations

## 📊 Monitoring & Health

### Health Check Endpoints
- `/api/v1/ssl/health` - SSL service health
- `/api/v1/windows-ssl/health` - Windows integration health
- `/api/v1/health` - Overall system health

### Metrics Available
- Total SSL certificates
- Premium conversion rate
- Monthly revenue
- Certificate expiration alerts
- Windows integration status

## 🚀 Implementation Timeline

### Week 1: Core SSL System
- [x] Let's Encrypt integration (simulated)
- [x] SSL provisioning APIs
- [x] Certificate management
- [x] Basic Windows integration

### Week 2: Premium Features & Windows Integration
- [x] Premium SSL features
- [x] Windows 11 service integration
- [x] PowerShell management scripts
- [x] Revenue analytics

## 📞 Support

### Technical Support
- API Documentation: `/api/v1/docs`
- Health Status: `/api/v1/ssl/health`
- Windows Integration: `/api/v1/windows-ssl/health`

### Business Support
- Premium users get priority support
- Enterprise users get dedicated support
- SLA guarantees for business users

## 🔮 Future Enhancements

### Planned Features
- Real Let's Encrypt integration
- Advanced certificate types
- Mobile device support
- Cloud provider integration
- Advanced compliance features

### Revenue Expansion
- Additional premium tiers
- Industry-specific packages
- White-label solutions
- Partner integrations

---

**This SSL implementation provides immediate revenue generation through premium features while establishing MyL.Zip as the leading platform for device-level SSL management.**

**Target: Windows 11 business workstations with $19/month premium conversion**
**Timeline: 2 weeks implementation**
**Revenue Target: $5K+ monthly within 1 month**
