# Cursor Prompts for Myl.Zip End-to-End Encryption Implementation
## Updated for Production Deployment v2.0.0

**Production Backend URL:** `https://api.myl.zip`
**API Base:** `/api/v1/encrypted`

## 🚀 Chrome Extension Implementation

### Prompt 1: End-to-End Encryption for Chrome Extension

```
Implement end-to-end encryption for the Myl.Zip Chrome extension to securely share thoughts across trusted devices.

Requirements:
1. Create an encryption service (encryptionService.js) that:
   - Generates and manages user encryption keys
   - Encrypts/decrypts thought data using AES-256-GCM
   - Derives keys from user passwords using PBKDF2
   - Stores keys securely in chrome.storage.local

2. Update content.js to:
   - Encrypt all thought data before sending to backend
   - Only send encrypted blobs to https://api.myl.zip/api/v1/encrypted/thoughts
   - Handle device registration and trust management
   - Implement cross-device thought sharing

3. Create device management (deviceManager.js) that:
   - Registers the extension as a trusted device
   - Manages device trust relationships
   - Handles pairing codes for new device trust
   - Stores device fingerprints and public keys

4. Update manifest.json to:
   - Add permissions for chrome.storage.local
   - Include new encryption and device management scripts
   - Add background script for key management

5. Implement secure key storage:
   - Never store encryption keys in plain text
   - Use chrome.storage.local with encryption
   - Implement key recovery with user passwords
   - Handle key rotation and backup

6. Add device trust UI:
   - Settings page for managing trusted devices
   - Pairing code generation and verification
   - Device permission management (read/write/share)
   - Trust status indicators

The extension should work with the production backend at https://api.myl.zip and support sharing thoughts with other trusted devices (Obsidian, mobile apps, etc.).
```

### Prompt 2: Chrome Extension UI Updates

```
Update the Myl.Zip Chrome extension UI to support end-to-end encryption and device trust management.

Requirements:
1. Update popup.html to include:
   - Device trust status indicator
   - Trusted devices list
   - Pairing code display
   - Encryption status indicator

2. Create settings.html with:
   - Device management section
   - Trust relationship controls
   - Key management options
   - Cross-device sharing settings

3. Update popup.css to:
   - Add styles for trust indicators
   - Style device management UI
   - Add encryption status visual feedback
   - Responsive design for new elements

4. Add JavaScript functionality for:
   - Device registration on first install
   - Trust status checking
   - Pairing code generation/verification
   - Encrypted thought sharing

5. Implement user onboarding:
   - First-time setup wizard
   - Key generation and backup
   - Device trust establishment
   - Security best practices guidance

The UI should clearly indicate when data is encrypted and which devices are trusted for sharing.
```

## 📝 Obsidian Plugin Implementation

### Prompt 3: Obsidian Plugin with End-to-End Encryption

```
Create an Obsidian plugin for Myl.Zip that supports end-to-end encrypted thought sharing with Chrome extension and other devices.

Requirements:
1. Create main.ts with:
   - Plugin initialization and settings
   - Encryption service integration
   - Device trust management
   - Thought synchronization with backend

2. Implement encryption service (encryptionService.ts) that:
   - Generates and manages encryption keys
   - Encrypts/decrypts Obsidian notes
   - Handles key derivation from user passwords
   - Stores keys securely in Obsidian's data folder

3. Create device manager (deviceManager.ts) that:
   - Registers Obsidian as a trusted device
   - Manages trust relationships with other devices
   - Handles pairing codes for device trust
   - Syncs thoughts with trusted devices

4. Add settings tab with:
   - Backend URL configuration (default: https://api.myl.zip)
   - Device trust management
   - Encryption key management
   - Cross-device sharing preferences

5. Implement thought synchronization:
   - Encrypt notes before sending to backend
   - Sync with other trusted devices
   - Handle conflicts and merge strategies
   - Maintain local encryption

6. Add UI components:
   - Trust status indicator in status bar
   - Device management modal
   - Pairing code interface
   - Encryption status display

The plugin should seamlessly integrate with Obsidian's note-taking workflow while maintaining end-to-end encryption.
```

### Prompt 4: Obsidian Plugin UI Components

```
Create UI components for the Myl.Zip Obsidian plugin to manage device trust and encryption.

Requirements:
1. Create DeviceTrustModal.tsx with:
   - List of trusted devices
   - Add/remove device functionality
   - Permission management (read/write/share)
   - Device pairing interface

2. Create EncryptionStatusWidget.tsx for:
   - Status bar encryption indicator
   - Key management status
   - Trust relationship status
   - Sync status with backend

3. Create PairingCodeModal.tsx with:
   - Pairing code generation
   - Code verification interface
   - QR code display for mobile pairing
   - Expiration countdown

4. Create ThoughtSyncModal.tsx for:
   - Manual sync trigger
   - Sync status display
   - Conflict resolution interface
   - Sync history and logs

5. Update settings tab to include:
   - Backend configuration
   - Encryption settings
   - Device management
   - Sharing preferences

6. Add keyboard shortcuts for:
   - Quick sync (Ctrl+Shift+S)
   - Device management (Ctrl+Shift+D)
   - Trust status (Ctrl+Shift+T)

All components should follow Obsidian's design system and provide clear feedback about encryption and trust status.
```

## 📱 Mobile App Implementation

### Prompt 5: React Native Mobile App

```
Create a React Native mobile app for Myl.Zip that supports end-to-end encrypted thought sharing.

Requirements:
1. Set up React Native project with:
   - Navigation (React Navigation)
   - State management (Redux/Zustand)
   - Secure storage (react-native-keychain)
   - HTTP client (Axios)

2. Implement encryption service (encryptionService.js) that:
   - Generates and manages encryption keys
   - Encrypts/decrypts thought data
   - Handles key derivation from biometrics/passwords
   - Stores keys securely in device keychain

3. Create device management that:
   - Registers mobile device with backend
   - Manages trust relationships
   - Handles QR code pairing
   - Syncs with other trusted devices

4. Build thought management screens:
   - Thought creation/editing
   - Encrypted thought list
   - Search and filtering
   - Offline support

5. Add device trust screens:
   - Trusted devices list
   - Device pairing (QR code)
   - Permission management
   - Trust status indicators

6. Implement secure authentication:
   - Biometric authentication
   - PIN/password protection
   - Session management
   - Auto-lock functionality

The app should work seamlessly with the Chrome extension and Obsidian plugin through the production backend at https://api.myl.zip.
```

## 🔧 Backend Integration

### Prompt 6: Backend API Integration

```
Integrate client applications with the Myl.Zip backend's end-to-end encryption API.

Requirements:
1. Create API client (apiClient.js) that:
   - Handles authentication with device tokens
   - Manages encrypted data transmission
   - Implements retry logic and error handling
   - Supports offline mode with local storage

2. Implement device registration flow:
   - Generate device fingerprint
   - Register with backend at https://api.myl.zip/api/v1/encrypted/devices/register
   - Handle trust establishment
   - Store device credentials securely

3. Add thought synchronization:
   - Encrypt thoughts before sending
   - POST to /api/v1/encrypted/thoughts
   - Handle conflicts and merge strategies
   - Implement incremental sync

4. Create cross-device sharing:
   - Share thoughts with trusted devices
   - Handle permission management
   - Implement real-time updates
   - Manage sharing invitations

5. Add error handling for:
   - Network connectivity issues
   - Encryption/decryption failures
   - Trust relationship problems
   - Backend service unavailability

6. Implement security features:
   - Certificate pinning
   - Request signing
   - Rate limiting compliance
   - Secure key storage

The API client should work across all client applications (Chrome extension, Obsidian, mobile) and maintain consistent encryption standards.
```

## 🧪 Testing and Validation

### Prompt 7: End-to-End Testing

```
Create comprehensive tests for the Myl.Zip end-to-end encryption system.

Requirements:
1. Create unit tests for:
   - Encryption/decryption functions
   - Key generation and management
   - Device trust logic
   - API client functionality

2. Create integration tests for:
   - Chrome extension to backend communication
   - Obsidian plugin synchronization
   - Mobile app cross-device sharing
   - End-to-end encryption flow

3. Create security tests for:
   - Key storage security
   - Encrypted data transmission
   - Trust relationship validation
   - Authentication mechanisms

4. Create performance tests for:
   - Encryption/decryption speed
   - Large file handling
   - Concurrent device access
   - Network latency impact

5. Create user acceptance tests for:
   - Device pairing workflow
   - Thought sharing between devices
   - Trust management UI
   - Error handling scenarios

6. Add automated testing pipeline:
   - CI/CD integration
   - Security scanning
   - Performance monitoring
   - Cross-platform testing

All tests should validate that data remains encrypted end-to-end and that only trusted devices can access shared thoughts.
```

## 📚 Documentation

### Prompt 8: Security Documentation

```
Create comprehensive documentation for the Myl.Zip end-to-end encryption system.

Requirements:
1. Create SECURITY.md with:
   - Encryption implementation details
   - Key management procedures
   - Trust relationship model
   - Security best practices

2. Create API_DOCUMENTATION.md with:
   - Endpoint specifications
   - Authentication requirements
   - Request/response formats
   - Error handling guidelines

3. Create USER_GUIDE.md with:
   - Device setup instructions
   - Trust establishment guide
   - Cross-device sharing tutorial
   - Troubleshooting common issues

4. Create DEVELOPER_GUIDE.md with:
   - Architecture overview
   - Integration instructions
   - Security considerations
   - Contributing guidelines

5. Create PRIVACY_POLICY.md with:
   - Data handling practices
   - Encryption guarantees
   - User rights and controls
   - Compliance information

6. Add code documentation:
   - Inline comments for security-critical code
   - JSDoc/TypeDoc for API functions
   - Architecture diagrams
   - Security audit trail

The documentation should clearly explain how end-to-end encryption protects user data and how to properly implement the system.
```

---

## 🎯 Implementation Priority

1. **Backend API** (✅ Complete) - End-to-end encryption endpoints
2. **Chrome Extension** - Core encryption and device trust
3. **Obsidian Plugin** - Note synchronization with encryption
4. **Mobile App** - Cross-platform thought sharing
5. **Testing & Documentation** - Security validation and user guides

## 🔗 Backend Endpoints

- **Base URL:** `https://api.myl.zip/api/v1/encrypted`
- **Device Management:** `/devices/*`
- **Thought Management:** `/thoughts/*`
- **Cross-Device Sharing:** `/share/*`
- **Health Check:** `https://api.myl.zip/health`
- **API Documentation:** `https://api.myl.zip/docs`

All endpoints require device trust verification and handle only encrypted data.

## 🔐 Production Security Features

- **Google Secret Manager Integration** - All secrets stored securely
- **End-to-End Encryption** - AES-256-GCM with PBKDF2 key derivation
- **Device Trust Management** - Cross-device pairing with secure codes
- **Security Headers** - CSP, HSTS, XSS protection
- **Audit Logging** - All security events logged
- **Rate Limiting** - Protection against abuse

## 🚀 Updated Prompts for Production Deployment

### Prompt 9: Chrome Extension - Production Integration

```
Update the Myl.Zip Chrome extension to integrate with the production backend deployment.

Requirements:
1. Update API configuration to use production endpoints:
   - Base URL: https://api.myl.zip
   - Health check: https://api.myl.zip/health
   - Encrypted API: https://api.myl.zip/api/v1/encrypted

2. Implement production-ready error handling:
   - Handle HTTPS certificate validation
   - Implement proper CORS handling
   - Add retry logic for network failures
   - Handle rate limiting responses

3. Update device registration flow:
   - Register with production backend
   - Handle production authentication
   - Implement secure token storage
   - Add device fingerprinting for production

4. Add production security features:
   - Certificate pinning for backend
   - Secure storage of device credentials
   - Implement proper key rotation
   - Add audit logging for security events

5. Update UI for production status:
   - Show connection status to production backend
   - Display security indicators
   - Add production-specific settings
   - Implement proper error messaging

6. Add production testing:
   - Test with production backend
   - Validate encryption with live service
   - Test cross-device sharing
   - Verify security compliance

The extension should work seamlessly with the production backend while maintaining all security features.
```

### Prompt 10: Obsidian Plugin - Production Backend Integration

```
Update the Myl.Zip Obsidian plugin to work with the production backend deployment.

Requirements:
1. Update backend configuration:
   - Default URL: https://api.myl.zip
   - API endpoints: /api/v1/encrypted/*
   - Health check integration
   - Production authentication

2. Implement production-ready synchronization:
   - Handle HTTPS connections
   - Implement proper error handling
   - Add retry logic for failed requests
   - Handle rate limiting gracefully

3. Update device trust management:
   - Register with production backend
   - Handle production device tokens
   - Implement secure credential storage
   - Add production-specific trust flows

4. Add production security features:
   - Certificate validation
   - Secure key storage in Obsidian
   - Implement audit logging
   - Add security status indicators

5. Update settings for production:
   - Production backend configuration
   - Security settings
   - Device management
   - Sync preferences

6. Add production testing:
   - Test with live backend
   - Validate encryption
   - Test cross-device sync
   - Verify security compliance

The plugin should provide a seamless experience with the production backend while maintaining security.
```

### Prompt 11: Mobile App - Production Backend Integration

```
Update the Myl.Zip mobile app to integrate with the production backend deployment.

Requirements:
1. Update API configuration:
   - Production base URL: https://api.myl.zip
   - HTTPS certificate pinning
   - Production authentication flow
   - Secure token management

2. Implement production-ready networking:
   - Handle HTTPS connections
   - Implement proper error handling
   - Add retry logic and offline support
   - Handle rate limiting responses

3. Update device registration:
   - Register with production backend
   - Handle production device tokens
   - Implement secure credential storage
   - Add biometric authentication

4. Add production security features:
   - Certificate pinning
   - Secure key storage in keychain
   - Implement audit logging
   - Add security status indicators

5. Update UI for production:
   - Show connection status
   - Display security indicators
   - Add production settings
   - Implement proper error handling

6. Add production testing:
   - Test with live backend
   - Validate encryption
   - Test cross-device sharing
   - Verify security compliance

The mobile app should work seamlessly with the production backend while maintaining security.
```

### Prompt 12: API Client - Production Integration

```
Create a production-ready API client for Myl.Zip that works with the deployed backend.

Requirements:
1. Create production API client (apiClient.js) that:
   - Connects to https://api.myl.zip
   - Handles HTTPS certificate validation
   - Implements proper error handling
   - Supports offline mode with local storage

2. Implement production authentication:
   - Device token management
   - Secure credential storage
   - Token refresh handling
   - Production-specific auth flows

3. Add production security features:
   - Certificate pinning
   - Request signing
   - Rate limiting compliance
   - Audit logging

4. Implement production error handling:
   - Network connectivity issues
   - Backend service unavailability
   - Rate limiting responses
   - Authentication failures

5. Add production monitoring:
   - Connection status tracking
   - Performance monitoring
   - Error reporting
   - Security event logging

6. Create production testing:
   - Integration tests with live backend
   - Security validation
   - Performance testing
   - Cross-platform compatibility

The API client should work across all client applications and maintain consistent security standards.
```
