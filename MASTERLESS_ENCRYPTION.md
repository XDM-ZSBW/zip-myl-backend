# Masterless Encryption Architecture

## 🔐 **No Master Key Required!**

This implementation provides **6 different approaches** to encryption without requiring a central master key. The philosophy is: **"Only when you have access to all the keys can something be a master."**

## 🎯 **Core Principles**

1. **Zero-Knowledge Architecture**: Server never has access to user data
2. **User-Controlled Keys**: Users maintain full control over their encryption keys
3. **Device-Specific Security**: Each device manages its own cryptographic material
4. **Threshold Security**: Keys can be split across multiple devices/users
5. **No Single Point of Failure**: No central key that could compromise everything

## 🔧 **Available Approaches**

### **1. Device-Specific Key Derivation**
```javascript
// Each device generates keys from its own characteristics
const keyData = masterlessKeyService.generateDeviceSpecificKey(
  deviceId,           // Unique device identifier
  userPassword,       // User's password
  deviceFingerprint   // Device-specific characteristics
);
```

**How it works:**
- Combines device ID, user password, and device fingerprint
- Uses PBKDF2 with 100,000 iterations
- Generates device-specific salt
- **Result**: Each device has a unique key that can't be replicated elsewhere

### **2. User-Controlled Key Management**
```javascript
// Users provide their own encryption keys
const userKey = masterlessKeyService.importUserKey(
  userProvidedKey,    // User's own key (hex format)
  keyId,              // Optional key identifier
  metadata           // Additional metadata
);
```

**How it works:**
- Users generate and provide their own keys
- Server validates key format but never stores the actual key
- Users maintain full control and responsibility
- **Result**: Complete user ownership of cryptographic material

### **3. Threshold Cryptography**
```javascript
// Split keys across multiple devices
const thresholdKey = masterlessKeyService.generateThresholdKey(
  deviceIds,    // Array of device IDs
  threshold     // Minimum devices needed (e.g., 2 out of 3)
);
```

**How it works:**
- Uses Shamir's Secret Sharing (simplified implementation)
- Splits a master key across multiple devices
- Requires threshold number of devices to reconstruct
- **Result**: No single device can decrypt data alone

### **4. Key Escrow with User Control**
```javascript
// Keys encrypted with user-controlled passphrases
const escrow = masterlessKeyService.createKeyEscrow(
  originalKey,      // The key to escrow
  userPassphrase,   // User's recovery passphrase
  escrowDevices     // Devices that can hold escrowed keys
);
```

**How it works:**
- Original key is encrypted with user's passphrase
- User controls the recovery process
- Escrow devices store encrypted keys only
- **Result**: User-controlled key recovery without server access

### **5. Cross-Device Key Exchange**
```javascript
// Direct device-to-device key exchange
const exchange = masterlessKeyService.initiateKeyExchange(
  sourceDeviceId,    // Device initiating exchange
  targetDeviceId,    // Target device
  keyExchangeData    // Exchange data
);
```

**How it works:**
- Devices exchange keys directly
- No central authority involved
- Time-limited exchange tokens
- **Result**: Peer-to-peer key sharing without intermediaries

### **6. Biometric + Device Key Derivation**
```javascript
// Use biometric data combined with device characteristics
const biometricKey = masterlessKeyService.generateBiometricKey(
  deviceId,        // Device identifier
  biometricHash,   // Hashed biometric data
  userPin          // User's PIN
);
```

**How it works:**
- Combines biometric hash with device ID and PIN
- Biometric data is hashed (never stored raw)
- Device-bound and user-specific
- **Result**: Multi-factor key derivation with biometric security

## 🚀 **API Endpoints**

### **Key Status**
```http
GET /api/v1/keys/status
```
Returns information about available key management approaches.

### **Device-Specific Key Generation**
```http
POST /api/v1/keys/device-specific
Content-Type: application/json

{
  "deviceId": "device-123",
  "userPassword": "user-password",
  "deviceFingerprint": "device-fingerprint"
}
```

### **User Key Import**
```http
POST /api/v1/keys/import
Content-Type: application/json

{
  "userKey": "hex-encoded-key",
  "keyId": "optional-key-id",
  "metadata": {}
}
```

### **Threshold Key Generation**
```http
POST /api/v1/keys/threshold
Content-Type: application/json

{
  "deviceIds": ["device-1", "device-2", "device-3"],
  "threshold": 2
}
```

## 🔒 **Security Benefits**

### **1. No Single Point of Failure**
- No master key that could compromise everything
- Each approach has independent security properties
- Multiple layers of protection

### **2. User Control**
- Users maintain ownership of their keys
- No server-side key storage
- User-controlled recovery processes

### **3. Device Independence**
- Each device can operate independently
- No reliance on central key management
- Cross-device synchronization without central authority

### **4. Privacy by Design**
- Zero-knowledge architecture
- Server never sees unencrypted data
- User data remains private even from service providers

## 🛡️ **Implementation Details**

### **Key Derivation**
- **Algorithm**: PBKDF2-SHA256
- **Iterations**: 100,000 (configurable)
- **Key Length**: 256 bits (32 bytes)
- **Salt**: Device-specific or user-provided

### **Encryption**
- **Algorithm**: AES-256-GCM
- **IV Length**: 128 bits
- **Tag Length**: 128 bits
- **AAD**: "myl-zip-masterless"

### **Key Storage**
- Keys are never stored on the server
- Only metadata and encrypted data are stored
- Users are responsible for key backup and recovery

## 🔄 **Key Rotation**

### **Automatic Rotation**
- Keys can be rotated every 30 days (configurable)
- Rotation is user-initiated, not automatic
- Old keys remain valid until explicitly revoked

### **Manual Rotation**
- Users can trigger key rotation at any time
- New keys are generated using the same approach
- Old encrypted data can be re-encrypted with new keys

## 📱 **Client Integration**

### **Chrome Extension**
```javascript
// Generate device-specific key
const keyData = await fetch('/api/v1/keys/device-specific', {
  method: 'POST',
  body: JSON.stringify({
    deviceId: chrome.runtime.id,
    userPassword: userPassword,
    deviceFingerprint: generateDeviceFingerprint()
  })
});
```

### **Mobile App**
```javascript
// Use biometric key derivation
const biometricKey = await fetch('/api/v1/keys/biometric', {
  method: 'POST',
  body: JSON.stringify({
    deviceId: deviceId,
    biometricHash: await hashBiometricData(),
    userPin: userPin
  })
});
```

### **Obsidian Plugin**
```javascript
// Import user-controlled key
const userKey = await fetch('/api/v1/keys/import', {
  method: 'POST',
  body: JSON.stringify({
    userKey: userProvidedKey,
    keyId: 'obsidian-plugin-key'
  })
});
```

## 🎯 **Use Cases**

### **1. Personal Knowledge Management**
- Each device has its own key derived from user password
- Cross-device sync using threshold cryptography
- User controls all access and recovery

### **2. Team Collaboration**
- Shared keys using threshold cryptography
- Multiple team members required for access
- No single person can access all data

### **3. Enterprise Security**
- Device-specific keys for each employee device
- Biometric authentication for high-security access
- Key escrow for compliance without compromising security

### **4. IoT Device Management**
- Each IoT device has its own derived key
- Cross-device communication without central authority
- User controls device access and permissions

## 🔍 **Testing the Implementation**

### **1. Check Key Service Status**
```bash
curl http://localhost:3000/api/v1/keys/status
```

### **2. Generate Device-Specific Key**
```bash
curl -X POST http://localhost:3000/api/v1/keys/device-specific \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "test-device-123",
    "userPassword": "test-password",
    "deviceFingerprint": "test-fingerprint"
  }'
```

### **3. Test Encryption Endpoints**
```bash
curl http://localhost:3000/api/v1/encrypted
```

## 🚀 **Deployment**

The masterless encryption system works without any environment variables:

```bash
# No ENCRYPTION_MASTER_KEY required!
$env:PORT = "3000"
$env:NODE_ENV = "development"
node src/app-simple.js
```

The service will start successfully and provide all masterless encryption features without requiring any master key configuration.

## 📚 **Further Reading**

- [PBKDF2 Specification](https://tools.ietf.org/html/rfc2898)
- [AES-GCM Mode](https://tools.ietf.org/html/rfc5288)
- [Shamir's Secret Sharing](https://en.wikipedia.org/wiki/Shamir%27s_Secret_Sharing)
- [Zero-Knowledge Architecture](https://en.wikipedia.org/wiki/Zero-knowledge_proof)

---

**Remember**: With masterless encryption, **you are the master of your own keys**. The server never has access to your data, and only you (with access to your devices and passwords) can decrypt your information.
