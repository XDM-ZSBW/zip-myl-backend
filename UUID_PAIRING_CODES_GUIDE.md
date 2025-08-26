# UUID Pairing Codes Implementation Guide

## 🚀 **Overview**

This document describes the implementation of UUID pairing code support for the Myl.Zip backend API. The system now supports multiple pairing code formats with UUID v4 as the default, providing enhanced security and consistency.

## 📋 **Supported Formats**

### 1. **UUID Format (Default)**
- **Format**: `xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx`
- **Length**: 36 characters
- **Entropy**: 122 bits
- **Example**: `123e4567-e89b-12d3-a456-426614174000`
- **Use Case**: Production systems, high-security applications

### 2. **Short Format**
- **Format**: 12-character hexadecimal string
- **Length**: 12 characters
- **Entropy**: 48 bits
- **Example**: `38836d2c4498`
- **Use Case**: User-friendly applications, mobile devices

### 3. **Legacy Format (Backward Compatibility)**
- **Format**: 6-digit numeric string
- **Length**: 6 characters
- **Entropy**: ~20 bits
- **Example**: `123456`
- **Use Case**: Legacy systems, backward compatibility

## 🔧 **API Endpoints**

### **Generate Pairing Code**

**Endpoint**: `POST /api/v1/encrypted/devices/pairing-code`

**Request Body**:
```json
{
  "deviceId": "device_123",
  "format": "uuid",        // Optional: "uuid", "short", or "legacy"
  "expiresIn": 300         // Optional: expiration time in seconds
}
```

**Response**:
```json
{
  "success": true,
  "pairingCode": "123e4567-e89b-12d3-a456-426614174000",
  "format": "uuid",
  "expiresAt": "2024-01-01T12:00:00Z",
  "expiresIn": 300
}
```

### **Verify Pairing Code**

**Endpoint**: `POST /api/v1/encrypted/devices/pair`

**Request Body**:
```json
{
  "deviceId": "device_123",
  "pairingCode": "123e4567-e89b-12d3-a456-426614174000",
  "encryptedTrustData": "encrypted-trust-information"
}
```

**Response**:
```json
{
  "success": true,
  "trustRelationship": {
    "id": "trust-123",
    "trustLevel": 1,
    "createdAt": "2024-01-01T12:00:00Z"
  },
  "pairedDevice": {
    "deviceId": "paired-device-456",
    "deviceType": "chrome-extension",
    "deviceVersion": "2.0.0"
  },
  "pairingCodeFormat": "uuid"
}
```

## 🗄️ **Database Schema**

### **Updated pairing_codes Table**

```sql
CREATE TABLE pairing_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(36) UNIQUE NOT NULL,        -- Extended to support UUIDs
  device_id VARCHAR(255) NOT NULL,
  format VARCHAR(10) DEFAULT 'uuid',       -- NEW: Format tracking
  expires_at TIMESTAMP NOT NULL,
  is_used BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (device_id) REFERENCES devices(device_id) ON DELETE CASCADE,
  CONSTRAINT chk_pairing_codes_format CHECK (format IN ('uuid', 'short', 'legacy'))
);
```

### **New Indexes**

```sql
CREATE INDEX idx_pairing_codes_format ON pairing_codes(format);
```

### **Database Functions**

#### **Generate Pairing Code**
```sql
SELECT * FROM generate_pairing_code('device_123', 'uuid', 10);
```

#### **Verify Pairing Code**
```sql
SELECT * FROM verify_pairing_code('123e4567-e89b-12d3-a456-426614174000');
```

## 🔒 **Security Features**

### **Enhanced Entropy**
- **UUID**: 122 bits of entropy (virtually impossible to guess)
- **Short**: 48 bits of entropy (2^48 possibilities)
- **Legacy**: ~20 bits of entropy (1,000,000 possibilities)

### **Format Validation**
- Automatic format detection
- Strict validation rules for each format
- Database-level constraints

### **Rate Limiting**
- 10 pairing code generations per hour per device
- 3 pairing attempts per hour per device
- Configurable limits per format

## 🧪 **Testing**

### **Unit Tests**
```bash
npm test tests/unit/pairing-codes.test.js
```

### **Integration Tests**
```bash
npm test tests/integration/pairing-codes-api.test.js
```

### **Test Coverage**
- Format generation validation
- Entropy verification
- Backward compatibility
- Error handling
- Performance benchmarks

## 📊 **Performance Metrics**

### **Generation Speed**
- UUID: ~0.1ms per code
- Short: ~0.05ms per code
- Legacy: ~0.02ms per code

### **Validation Speed**
- Format detection: ~0.01ms per code
- Database lookup: ~1-5ms per query

### **Memory Usage**
- UUID storage: 36 bytes per code
- Short storage: 12 bytes per code
- Legacy storage: 6 bytes per code

## 🔄 **Migration Guide**

### **Step 1: Database Migration**
```bash
psql -d your_database -f scripts/migrate-pairing-codes-uuid.sql
```

### **Step 2: Update Client Code**
```javascript
// Old way
const response = await fetch('/api/v1/encrypted/devices/pairing-code', {
  method: 'POST',
  body: JSON.stringify({ deviceId: 'device_123' })
});

// New way (with format support)
const response = await fetch('/api/v1/encrypted/devices/pairing-code', {
  method: 'POST',
  body: JSON.stringify({ 
    deviceId: 'device_123',
    format: 'uuid'  // Explicitly request UUID format
  })
});
```

### **Step 3: Update Validation**
```javascript
// Old validation
function isValidPairingCode(code) {
  return /^\d{6}$/.test(code);
}

// New validation (supports all formats)
function isValidPairingCode(code) {
  return detectPairingCodeFormat(code) !== 'unknown';
}
```

## 🚨 **Breaking Changes**

### **API Changes**
- `format` parameter is now optional (defaults to 'uuid')
- Response now includes `format` field
- Pairing response includes `pairingCodeFormat` field

### **Database Changes**
- `code` column extended from VARCHAR(6) to VARCHAR(36)
- New `format` column added
- New constraints and indexes

### **Validation Changes**
- Legacy 6-digit codes still supported
- New validation functions for each format
- Format detection utility

## 🔧 **Configuration**

### **Environment Variables**
```bash
# Default pairing code format
DEFAULT_PAIRING_FORMAT=uuid

# Expiration times (in seconds)
PAIRING_CODE_EXPIRY_UUID=600
PAIRING_CODE_EXPIRY_SHORT=300
PAIRING_CODE_EXPIRY_LEGACY=180

# Rate limiting
PAIRING_CODE_RATE_LIMIT=10
PAIRING_ATTEMPT_RATE_LIMIT=3
```

### **Service Configuration**
```javascript
const pairingConfig = {
  defaultFormat: 'uuid',
  expiryTimes: {
    uuid: 600,    // 10 minutes
    short: 300,   // 5 minutes
    legacy: 180   // 3 minutes
  },
  rateLimits: {
    generation: 10,
    verification: 3
  }
};
```

## 📈 **Monitoring and Analytics**

### **Metrics to Track**
- Pairing code generation by format
- Success/failure rates by format
- Average pairing time
- Format adoption rates

### **Logging**
```javascript
logger.info('Pairing code generated', {
  deviceId: 'device_123',
  format: 'uuid',
  expiresIn: 600,
  timestamp: new Date().toISOString()
});
```

## 🐛 **Troubleshooting**

### **Common Issues**

#### **Invalid Format Error**
```
Error: Invalid format parameter
Message: Format must be "uuid", "short", or "legacy"
```
**Solution**: Ensure the format parameter is one of the supported values.

#### **Database Constraint Violation**
```
Error: UUID format requires 36 characters, got 12
```
**Solution**: Check that the code length matches the specified format.

#### **Rate Limit Exceeded**
```
Error: Rate limit exceeded
RetryAfter: 600
```
**Solution**: Wait for the specified time before retrying.

### **Debug Mode**
```javascript
// Enable debug logging
process.env.DEBUG_PAIRING_CODES = 'true';
```

## 🔮 **Future Enhancements**

### **Planned Features**
- Custom format support
- Biometric pairing codes
- QR code integration
- Offline pairing support

### **Performance Optimizations**
- Redis caching for active codes
- Batch code generation
- Async verification

## 📚 **References**

- [RFC 4122 - UUID Specification](https://tools.ietf.org/html/rfc4122)
- [UUID Best Practices](https://www.uuidgenerator.net/dev-tools/uuid-best-practices)
- [Cryptographic Entropy](https://en.wikipedia.org/wiki/Entropy_(computing))

## 🤝 **Contributing**

### **Code Style**
- Follow existing ESLint configuration
- Use JSDoc for function documentation
- Write comprehensive tests

### **Pull Request Process**
1. Create feature branch
2. Add tests for new functionality
3. Update documentation
4. Submit pull request with detailed description

---

**Last Updated**: 2024-01-01  
**Version**: 1.0.0  
**Maintainer**: Backend Development Team
