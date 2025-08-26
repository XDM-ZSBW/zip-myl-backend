# Chromium Team Testing Guide - UUID Format Support

## 🎯 **Testing Overview**

This guide provides comprehensive testing instructions for the Chromium team to verify UUID format support in the Myl.Zip backend API.

## ✅ **Implementation Status**

- ✅ **Backend API**: UUID format support implemented
- ✅ **Endpoint**: `/api/v1/device-registration/pairing-codes` 
- ✅ **Format Support**: UUID only (for security)
- ✅ **Extension Compatibility**: Ready for testing

## 🔄 **Complete Pairing Workflow**

The pairing process involves two steps:
1. **Generate Pairing Code**: Device A generates a UUID pairing code
2. **Verify Pairing Code**: Device B enters the code to establish trust

## 🧪 **Testing Scenarios**

### **Test 1: UUID Format Generation (Primary Test)**

**Endpoint**: `POST /api/v1/device-registration/pairing-codes`

**Request**:
```bash
curl -X POST https://api.myl.zip/api/v1/device-registration/pairing-codes \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "chrome-extension-test-123",
    "format": "uuid",
    "expiresIn": 300
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "pairingCode": "550e8400-e29b-41d4-a716-446655440000",
  "format": "uuid",
  "expiresAt": "2024-12-20T15:30:00Z",
  "expiresIn": 300,
  "deviceId": "chrome-extension-test-123",
  "message": "UUID pairing code generated successfully"
}
```

**Validation Criteria**:
- ✅ Status: 200 OK
- ✅ `success`: true
- ✅ `format`: "uuid"
- ✅ `pairingCode`: Valid UUID v4 format (36 characters with hyphens)
- ✅ `expiresAt`: Valid ISO 8601 timestamp
- ✅ `expiresIn`: 300 seconds
- ✅ `deviceId`: Matches request

### **Test 2: Default Format (No Format Parameter)**

**Request**:
```bash
curl -X POST https://api.myl.zip/api/v1/device-registration/pairing-codes \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "chrome-extension-test-456",
    "expiresIn": 300
  }'
```

**Expected Response**: Same as Test 1, but with `format: "uuid"` (default)

### **Test 3: Invalid Format Rejection**

**Request**:
```bash
curl -X POST https://api.myl.zip/api/v1/device-registration/pairing-codes \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "chrome-extension-test-789",
    "format": "short",
    "expiresIn": 300
  }'
```

**Expected Response**:
```json
{
  "error": "Invalid format parameter",
  "message": "Only UUID format is supported for security reasons"
}
```

**Validation Criteria**:
- ✅ Status: 400 Bad Request
- ✅ Error message indicates only UUID is supported

### **Test 4: Missing Device ID**

**Request**:
```bash
curl -X POST https://api.myl.zip/api/v1/device-registration/pairing-codes \
  -H "Content-Type: application/json" \
  -d '{
    "format": "uuid",
    "expiresIn": 300
  }'
```

**Expected Response**:
```json
{
  "error": "Missing deviceId"
}
```

**Validation Criteria**:
- ✅ Status: 400 Bad Request
- ✅ Clear error message about missing deviceId

### **Test 5: Pairing Code Verification (Complete Workflow)**

**Endpoint**: `POST /api/v1/device-registration/pair`

**Request**:
```bash
curl -X POST https://api.myl.zip/api/v1/device-registration/pair \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "device-b-456",
    "pairingCode": "550e8400-e29b-41d4-a716-446655440000",
    "encryptedTrustData": "encrypted-trust-information"
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "trustRelationship": {
    "id": "trust-1703092200000",
    "trustLevel": 1,
    "createdAt": "2024-12-20T15:30:00Z"
  },
  "pairedDevice": {
    "deviceId": "paired-device-123",
    "deviceType": "chrome-extension",
    "deviceVersion": "2.0.0"
  },
  "pairingCodeFormat": "uuid",
  "message": "Devices paired successfully"
}
```

**Validation Criteria**:
- ✅ Status: 200 OK
- ✅ `success`: true
- ✅ `trustRelationship`: Valid trust relationship object
- ✅ `pairedDevice`: Valid paired device information
- ✅ `pairingCodeFormat`: "uuid"

### **Test 6: Invalid Pairing Code Format**

**Request**:
```bash
curl -X POST https://api.myl.zip/api/v1/device-registration/pair \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "device-b-456",
    "pairingCode": "invalid-uuid-format",
    "encryptedTrustData": "encrypted-trust-information"
  }'
```

**Expected Response**:
```json
{
  "error": "Invalid pairing code format",
  "message": "Only UUID format pairing codes are supported"
}
```

**Validation Criteria**:
- ✅ Status: 400 Bad Request
- ✅ Error message indicates invalid format
- ✅ Message specifies UUID format requirement

## 🔍 **UUID Format Validation**

### **UUID v4 Pattern**
- **Length**: 36 characters
- **Format**: `xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx`
- **Pattern**: `^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$`

### **Example Valid UUIDs**
```
550e8400-e29b-41d4-a716-446655440000
123e4567-e89b-12d3-a456-426614174000
6ba7b810-9dad-11d1-80b4-00c04fd430c8
```

### **Example Invalid UUIDs**
```
550e8400-e29b-41d4-a716-44665544000  (too short)
550e8400-e29b-41d4-a716-4466554400000 (too long)
550e8400-e29b-41d4-a716-44665544000g (invalid character)
```

## 🚀 **Extension Integration Testing**

### **Test with Chromium Extension**

1. **Load Extension**: Load the Myl.Zip Chromium extension
2. **Select UUID Format**: Choose "UUID (Most Secure)" from format dropdown
3. **Generate Code**: Click generate pairing code
4. **Verify Response**: Check that UUID format is returned
5. **Check Warning**: Ensure no format mismatch warnings appear

### **Expected Extension Behavior**

- ✅ **Format Selection**: UUID option available and selectable
- ✅ **API Request**: Correctly sends `"format": "uuid"` parameter
- ✅ **Response Handling**: Properly processes UUID response
- ✅ **No Warnings**: No format mismatch warnings displayed
- ✅ **Code Display**: UUID code displayed correctly in extension UI

## 📊 **Performance Testing**

### **Response Time Requirements**
- **Target**: < 500ms for pairing code generation
- **Acceptable**: < 1000ms
- **Unacceptable**: > 2000ms

### **Load Testing**
```bash
# Test with multiple concurrent requests
for i in {1..10}; do
  curl -X POST https://api.myl.zip/api/v1/device-registration/pairing-codes \
    -H "Content-Type: application/json" \
    -d "{\"deviceId\": \"test-device-$i\", \"format\": \"uuid\"}" &
done
wait
```

## 🔒 **Security Validation**

### **UUID Security Benefits**
- **Entropy**: 122 bits of entropy
- **Unpredictability**: Cryptographically secure random generation
- **Collision Resistance**: Virtually impossible to generate duplicates
- **Standardization**: RFC 4122 compliant

### **Security Tests**
1. **Uniqueness**: Generate 1000 codes, verify all are unique
2. **Randomness**: Verify UUIDs don't follow predictable patterns
3. **Format Validation**: Ensure all generated codes match UUID v4 pattern

## 🐛 **Error Handling Tests**

### **Test Invalid JSON**
```bash
curl -X POST https://api.myl.zip/api/v1/device-registration/pairing-codes \
  -H "Content-Type: application/json" \
  -d '{"deviceId": "test", "format": "uuid"'  # Missing closing brace
```

**Expected**: 400 Bad Request with JSON parsing error

### **Test Invalid Content Type**
```bash
curl -X POST https://api.myl.zip/api/v1/device-registration/pairing-codes \
  -H "Content-Type: text/plain" \
  -d '{"deviceId": "test", "format": "uuid"}'
```

**Expected**: 400 Bad Request or 415 Unsupported Media Type

## 📝 **Test Results Template**

### **Test Execution Log**

| Test ID | Description | Status | Response Time | Notes |
|---------|-------------|--------|---------------|-------|
| T1 | UUID Format Generation | ✅/❌ | XXXms | |
| T2 | Default Format | ✅/❌ | XXXms | |
| T3 | Invalid Format Rejection | ✅/❌ | XXXms | |
| T4 | Missing Device ID | ✅/❌ | XXXms | |
| T5 | Pairing Code Verification | ✅/❌ | XXXms | |
| T6 | Invalid Pairing Code Format | ✅/❌ | XXXms | |
| T7 | Extension Integration | ✅/❌ | XXXms | |
| T8 | Performance Test | ✅/❌ | XXXms | |
| T9 | Security Validation | ✅/❌ | XXXms | |

### **Sample Test Results**

```json
{
  "testRun": "2024-12-20T15:30:00Z",
  "environment": "production",
  "endpoint": "https://api.myl.zip/api/v1/device-registration/pairing-codes",
  "results": {
    "uuidGeneration": "PASSED",
    "formatValidation": "PASSED", 
    "errorHandling": "PASSED",
    "performance": "PASSED",
    "security": "PASSED"
  },
  "sampleResponse": {
    "success": true,
    "pairingCode": "550e8400-e29b-41d4-a716-446655440000",
    "format": "uuid",
    "expiresAt": "2024-12-20T15:35:00Z",
    "expiresIn": 300,
    "deviceId": "chrome-extension-test-123"
  }
}
```

## 🎯 **Success Criteria**

The implementation is considered successful when:

- ✅ **All Tests Pass**: All test scenarios return expected results
- ✅ **UUID Generation**: Valid UUID v4 codes generated consistently
- ✅ **Format Validation**: Only UUID format accepted, others rejected
- ✅ **Extension Integration**: Extension works without warnings
- ✅ **Performance**: Response times under 500ms
- ✅ **Security**: UUIDs are cryptographically secure and unique
- ✅ **Error Handling**: Appropriate error messages for invalid requests

## 📞 **Support & Troubleshooting**

### **Common Issues**

1. **404 Not Found**: Check endpoint URL is correct
2. **400 Bad Request**: Verify JSON format and required fields
3. **500 Internal Server Error**: Check server logs for details
4. **Format Mismatch**: Ensure extension sends `"format": "uuid"`

### **Debug Information**

- **Server Logs**: Check application logs for detailed error information
- **Network Tab**: Use browser dev tools to inspect API requests/responses
- **Extension Console**: Check extension console for JavaScript errors

### **Contact Information**

- **Backend Team**: For API-related issues
- **Extension Team**: For extension integration issues
- **Security Team**: For security validation questions

---

**Last Updated**: December 2024  
**Version**: 1.0  
**Status**: Ready for Testing
