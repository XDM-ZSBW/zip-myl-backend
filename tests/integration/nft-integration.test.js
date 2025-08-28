const { NFTService } = require('../../src/services/nftService');
const { PairingService } = require('../../src/services/pairingService');

describe('NFT Integration Tests', () => {
  let nftService, pairingService;

  beforeAll(() => {
    // Create service instances
    nftService = new NFTService();
    pairingService = new PairingService();
  });

  describe('Service Initialization', () => {
    it('should create NFT service successfully', () => {
      expect(nftService).toBeDefined();
      expect(nftService.db).toBeDefined();
      expect(nftService.encryption).toBeDefined();
      expect(nftService.cache).toBeDefined();
    });

    it('should create Pairing service successfully', () => {
      expect(pairingService).toBeDefined();
      expect(pairingService.db).toBeDefined();
      expect(pairingService.cache).toBeDefined();
      expect(pairingService.encryption).toBeDefined();
    });
  });

  describe('NFT Data Validation', () => {
    it('should validate correct NFT data', async() => {
      const validNFTData = {
        tokenId: '123',
        contractAddress: '0x1234567890123456789012345678901234567890',
        chainId: 1,
        metadata: { name: 'Test NFT' },
        imageUrl: 'https://example.com/image.jpg',
      };

      const result = await pairingService.validateNFTData(validNFTData);

      expect(result.isValid).toBe(true);
      expect(result.reason).toBe('NFT data is valid');
    });

    it('should reject NFT data with missing required fields', async() => {
      const invalidNFTData = {
        tokenId: '123',
        // Missing contractAddress and chainId
      };

      const result = await pairingService.validateNFTData(invalidNFTData);

      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('Missing required field');
    });

    it('should reject NFT data with invalid contract address', async() => {
      const invalidNFTData = {
        tokenId: '123',
        contractAddress: 'invalid-address',
        chainId: 1,
      };

      const result = await pairingService.validateNFTData(invalidNFTData);

      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('Invalid contract address format');
    });

    it('should reject NFT data with invalid chain ID', async() => {
      const invalidNFTData = {
        tokenId: '123',
        contractAddress: '0x1234567890123456789012345678901234567890',
        chainId: -1,
      };

      const result = await pairingService.validateNFTData(invalidNFTData);

      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('Chain ID must be a positive number');
    });
  });

  describe('Encryption Service', () => {
    it('should encrypt and decrypt data correctly', async() => {
      const testData = { test: 'data', number: 123 };

      // Encrypt
      const encrypted = await nftService.encryption.encrypt(testData);
      expect(encrypted).toBeDefined();
      expect(typeof encrypted).toBe('string');

      // Decrypt
      const decrypted = await nftService.encryption.decrypt(encrypted);
      expect(decrypted).toBeDefined();

      // Parse and compare
      const parsedDecrypted = JSON.parse(decrypted);
      expect(parsedDecrypted).toEqual(testData);
    });

    it('should generate consistent hashes', async() => {
      const testData = 'test data';

      const hash1 = await nftService.encryption.hash(testData);
      const hash2 = await nftService.encryption.hash(testData);

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA-256 hex length
    });
  });

  describe('Cache Service', () => {
    it('should set and get cache values', async() => {
      const key = 'test-key';
      const value = { test: 'value' };

      // Set cache
      const setResult = await nftService.cache.set(key, value, 60);
      expect(setResult).toBe(true);

      // Get cache
      const getResult = await nftService.cache.get(key);
      expect(getResult).toEqual(value);
    });

    it('should handle cache expiration', async() => {
      const key = 'expire-key';
      const value = 'expire-value';

      // Set cache with 1 second TTL
      await nftService.cache.set(key, value, 1);

      // Should exist immediately
      const immediate = await nftService.cache.get(key);
      expect(immediate).toBe(value);

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Should not exist after expiration
      const expired = await nftService.cache.get(key);
      expect(expired).toBeNull();
    });
  });
});
