const crypto = require('crypto');
const { promisify } = require('util');

/**
 * Device Fingerprinting Service
 * Generates cryptographically secure device identifiers while maintaining privacy
 */
class DeviceFingerprintingService {
  constructor() {
    this.salt = process.env.DEVICE_FINGERPRINT_SALT || 'myl-zip-device-salt-v2';
  }

  /**
   * Generate a comprehensive device fingerprint
   * @param {Object} deviceInfo - Device information from client
   * @returns {Promise<Object>} Fingerprint data
   */
  async generateFingerprint(deviceInfo) {
    try {
      const fingerprintComponents = await this._collectFingerprintComponents(deviceInfo);
      const fingerprint = await this._generateFingerprintHash(fingerprintComponents);
      
      return {
        fingerprint,
        components: fingerprintComponents,
        timestamp: new Date().toISOString(),
        version: '2.0.0'
      };
    } catch (error) {
      throw new Error(`Failed to generate device fingerprint: ${error.message}`);
    }
  }

  /**
   * Collect fingerprint components from device info
   * @private
   */
  async _collectFingerprintComponents(deviceInfo) {
    const components = {
      // Device type and version
      deviceType: deviceInfo.type || 'unknown',
      deviceVersion: deviceInfo.version || '1.0.0',
      
      // Platform information (anonymized)
      platform: this._anonymizePlatform(deviceInfo.platform),
      architecture: this._anonymizeArchitecture(deviceInfo.architecture),
      
      // Capabilities
      capabilities: this._normalizeCapabilities(deviceInfo.capabilities),
      
      // Network characteristics (anonymized)
      timezone: this._anonymizeTimezone(deviceInfo.timezone),
      language: this._anonymizeLanguage(deviceInfo.language),
      
      // Hardware characteristics (anonymized)
      cpuCores: this._anonymizeCpuCores(deviceInfo.cpuCores),
      memory: this._anonymizeMemory(deviceInfo.memory),
      
      // Browser/Environment info (anonymized)
      userAgent: this._anonymizeUserAgent(deviceInfo.userAgent),
      screenResolution: this._anonymizeScreenResolution(deviceInfo.screenResolution),
      
      // Security features
      hasWebCrypto: deviceInfo.hasWebCrypto || false,
      hasLocalStorage: deviceInfo.hasLocalStorage || false,
      hasIndexedDB: deviceInfo.hasIndexedDB || false
    };

    return components;
  }

  /**
   * Generate fingerprint hash from components
   * @private
   */
  async _generateFingerprintHash(components) {
    // Create a deterministic string from components
    const fingerprintString = JSON.stringify(components, Object.keys(components).sort());
    
    // Generate hash with salt
    const hash = crypto.createHash('sha256');
    hash.update(fingerprintString + this.salt);
    
    return hash.digest('hex');
  }

  /**
   * Verify device fingerprint
   * @param {string} deviceId - Device ID
   * @param {string} fingerprint - Fingerprint to verify
   * @param {Object} deviceInfo - Current device info
   * @returns {Promise<boolean>} Verification result
   */
  async verifyFingerprint(deviceId, fingerprint, deviceInfo) {
    try {
      const currentFingerprint = await this.generateFingerprint(deviceInfo);
      return currentFingerprint.fingerprint === fingerprint;
    } catch (error) {
      console.error('Fingerprint verification failed:', error);
      return false;
    }
  }

  /**
   * Anonymize platform information
   * @private
   */
  _anonymizePlatform(platform) {
    if (!platform) return 'unknown';
    
    const platformMap = {
      'win32': 'windows',
      'darwin': 'macos',
      'linux': 'linux',
      'android': 'android',
      'ios': 'ios'
    };
    
    return platformMap[platform.toLowerCase()] || 'other';
  }

  /**
   * Anonymize architecture information
   * @private
   */
  _anonymizeArchitecture(arch) {
    if (!arch) return 'unknown';
    
    const archMap = {
      'x64': 'x64',
      'x86': 'x86',
      'arm64': 'arm64',
      'arm': 'arm'
    };
    
    return archMap[arch.toLowerCase()] || 'other';
  }

  /**
   * Normalize capabilities array
   * @private
   */
  _normalizeCapabilities(capabilities) {
    if (!Array.isArray(capabilities)) return [];
    
    const validCapabilities = [
      'encryption', 'sync', 'storage', 'notifications', 
      'offline', 'cross-device', 'biometric', 'hardware-security'
    ];
    
    return capabilities
      .filter(cap => validCapabilities.includes(cap))
      .sort();
  }

  /**
   * Anonymize timezone (only keep timezone offset)
   * @private
   */
  _anonymizeTimezone(timezone) {
    if (!timezone) return 'unknown';
    
    // Extract only the offset part (e.g., "+05:30" -> "+05:00")
    const offsetMatch = timezone.match(/([+-]\d{2}):\d{2}/);
    return offsetMatch ? offsetMatch[1] + ':00' : 'unknown';
  }

  /**
   * Anonymize language (only keep primary language)
   * @private
   */
  _anonymizeLanguage(language) {
    if (!language) return 'unknown';
    
    // Extract only the primary language (e.g., "en-US" -> "en")
    const langMatch = language.match(/^([a-z]{2})/i);
    return langMatch ? langMatch[1].toLowerCase() : 'unknown';
  }

  /**
   * Anonymize CPU cores (round to nearest power of 2)
   * @private
   */
  _anonymizeCpuCores(cores) {
    if (!cores || typeof cores !== 'number') return 'unknown';
    
    const powersOf2 = [1, 2, 4, 8, 16, 32, 64];
    return powersOf2.find(power => cores <= power) || '64+';
  }

  /**
   * Anonymize memory (round to nearest GB)
   * @private
   */
  _anonymizeMemory(memory) {
    if (!memory || typeof memory !== 'number') return 'unknown';
    
    const memoryGB = Math.round(memory / (1024 * 1024 * 1024));
    if (memoryGB <= 2) return '2GB';
    if (memoryGB <= 4) return '4GB';
    if (memoryGB <= 8) return '8GB';
    if (memoryGB <= 16) return '16GB';
    return '32GB+';
  }

  /**
   * Anonymize user agent (only keep browser and major version)
   * @private
   */
  _anonymizeUserAgent(userAgent) {
    if (!userAgent) return 'unknown';
    
    // Extract browser and major version
    const browserMatch = userAgent.match(/(Chrome|Firefox|Safari|Edge)\/(\d+)/i);
    if (browserMatch) {
      return `${browserMatch[1].toLowerCase()}-${browserMatch[2]}`;
    }
    
    return 'other';
  }

  /**
   * Anonymize screen resolution (round to common resolutions)
   * @private
   */
  _anonymizeScreenResolution(resolution) {
    if (!resolution || !resolution.width || !resolution.height) return 'unknown';
    
    const { width, height } = resolution;
    
    // Common resolution categories
    if (width <= 1024) return '1024x768';
    if (width <= 1280) return '1280x720';
    if (width <= 1366) return '1366x768';
    if (width <= 1440) return '1440x900';
    if (width <= 1920) return '1920x1080';
    if (width <= 2560) return '2560x1440';
    return '4K+';
  }

  /**
   * Generate device ID from fingerprint
   * @param {string} fingerprint - Device fingerprint
   * @returns {string} Device ID
   */
  generateDeviceId(fingerprint) {
    const hash = crypto.createHash('sha256');
    hash.update(fingerprint + this.salt + 'device-id');
    return hash.digest('hex').substring(0, 32);
  }

  /**
   * Validate fingerprint format
   * @param {string} fingerprint - Fingerprint to validate
   * @returns {boolean} Validation result
   */
  validateFingerprint(fingerprint) {
    return typeof fingerprint === 'string' && 
           fingerprint.length === 64 && 
           /^[a-f0-9]+$/i.test(fingerprint);
  }

  /**
   * Get fingerprint statistics for monitoring
   * @returns {Object} Statistics
   */
  getStatistics() {
    return {
      saltLength: this.salt.length,
      hashAlgorithm: 'sha256',
      fingerprintLength: 64,
      version: '2.0.0',
      privacyLevel: 'high'
    };
  }
}

module.exports = new DeviceFingerprintingService();
