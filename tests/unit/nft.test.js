const { NFTService } = require('../../src/services/nftService');
const { PairingService } = require('../../src/services/pairingService');

// Mock dependencies
jest.mock('../../src/services/nftDatabaseService');
jest.mock('../../src/services/nftEncryptionService');
jest.mock('../../src/services/nftCacheService');
jest.mock('../../src/utils/logger');

describe('NFT Service', () => {
  let nftService;
  let mockDb, mockEncryption, mockCache;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock database service
    mockDb = {
      query: jest.fn()
    };
    
    // Mock encryption service
    mockEncryption = {
      encrypt: jest.fn(),
      decrypt: jest.fn()
    };
    
    // Mock cache service
    mockCache = {
      set: jest.fn(),
      get: jest.fn(),
      del: jest.fn()
    };

    // Mock the nftDatabaseService module
    const nftDatabaseService = require('../../src/services/nftDatabaseService');
    nftDatabaseService.nftDatabaseService = mockDb;

    // Mock the nftEncryptionService module
    const nftEncryptionService = require('../../src/services/nftEncryptionService');
    nftEncryptionService.nftEncryptionService = mockEncryption;

    // Mock the nftCacheService module
    const nftCacheService = require('../../src/services/nftCacheService');
    nftCacheService.nftCacheService = mockCache;

    nftService = new NFTService();
  });

  describe('generatePairingToken', () => {
    it('should generate a pairing token successfully', async () => {
      const userId = 'test-user-id';
      const platform = 'ethereum';
      const collectionName = 'Test Collection';

      mockDb.query.mockResolvedValue({
        rows: [{ id: 'token-id', token: 'generated-token', expires_at: new Date() }]
      });
      mockCache.set.mockResolvedValue(true);

      const result = await nftService.generatePairingToken(userId, platform, collectionName);

      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('expiresAt');
      expect(result).toHaveProperty('qrCode');
      expect(result).toHaveProperty('tokenId');
      expect(mockDb.query).toHaveBeenCalled();
      expect(mockCache.set).toHaveBeenCalled();
    });

    it('should throw error when database insertion fails', async () => {
      const userId = 'test-user-id';
      const platform = 'ethereum';

      mockDb.query.mockResolvedValue({ rows: [] });

      await expect(nftService.generatePairingToken(userId, platform))
        .rejects.toThrow('Failed to generate pairing token');
    });
  });

  describe('storeNFT', () => {
    it('should store NFT successfully', async () => {
      const userId = 'test-user-id';
      const nftData = { tokenId: '123', contractAddress: '0x123...' };
      const platform = 'ethereum';
      const collectionName = 'Test Collection';

      mockEncryption.encrypt.mockResolvedValue('encrypted-data');
      mockDb.query.mockResolvedValue({
        rows: [{ id: 'nft-id', created_at: new Date() }]
      });
      mockCache.set.mockResolvedValue(true);

      const result = await nftService.storeNFT(userId, nftData, platform, collectionName);

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('nftData');
      expect(result).toHaveProperty('platform');
      expect(mockEncryption.encrypt).toHaveBeenCalled();
      expect(mockDb.query).toHaveBeenCalled();
    });
  });

  describe('getProfileCollection', () => {
    it('should retrieve profile collection with pagination', async () => {
      const userId = 'test-user-id';
      const options = { page: 1, limit: 10, platform: 'ethereum' };

      mockDb.query
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'nft-1',
              nft_data: 'encrypted-data-1',
              platform: 'ethereum',
              collection_name: 'Test',
              created_at: new Date()
            }
          ]
        })
        .mockResolvedValueOnce({
          rows: [{ total: '1' }]
        });

      mockEncryption.decrypt.mockResolvedValue('{"tokenId": "123"}');

      const result = await nftService.getProfileCollection(userId, options);

      expect(result).toHaveProperty('nfts');
      expect(result).toHaveProperty('pagination');
      expect(result.nfts).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
    });
  });

  describe('storeInvalidNFT', () => {
    it('should store invalid NFT with reason', async () => {
      const nftData = { tokenId: '123' };
      const reason = 'Invalid metadata';
      const platform = 'ethereum';
      const userId = 'test-user-id';

      mockEncryption.encrypt.mockResolvedValue('encrypted-data');
      mockDb.query.mockResolvedValue({
        rows: [{ id: 'invalid-id', created_at: new Date() }]
      });

      const result = await nftService.storeInvalidNFT(nftData, reason, platform, userId);

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('reason');
      expect(result).toHaveProperty('platform');
      expect(mockEncryption.encrypt).toHaveBeenCalled();
    });
  });

  describe('updateProfilePicture', () => {
    it('should update profile picture successfully', async () => {
      const userId = 'test-user-id';
      const imageData = 'base64-image-data';
      const imageFormat = 'jpeg';

      mockDb.query.mockResolvedValue({
        rows: [{ id: 'profile-id', profile_picture_url: 'https://example.com/image.jpg', updated_at: new Date() }]
      });
      mockCache.set.mockResolvedValue(true);

      const result = await nftService.updateProfilePicture(userId, imageData, imageFormat);

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('imageUrl');
      expect(result).toHaveProperty('imageHash');
      expect(mockDb.query).toHaveBeenCalled();
      expect(mockCache.set).toHaveBeenCalled();
    });

    it('should throw error for invalid image format', async () => {
      const userId = 'test-user-id';
      const imageData = 'base64-image-data';
      const imageFormat = 'invalid';

      await expect(nftService.updateProfilePicture(userId, imageData, imageFormat))
        .rejects.toThrow('Invalid image format');
    });
  });

  describe('getUserStats', () => {
    it('should return user NFT statistics', async () => {
      const userId = 'test-user-id';

      mockDb.query
        .mockResolvedValueOnce({
          rows: [{ total_nfts: '5', platforms: '2', collections: '3' }]
        })
        .mockResolvedValueOnce({
          rows: [{ profile_picture_url: 'https://example.com/image.jpg', nft_count: '5', last_nft_added: new Date() }]
        })
        .mockResolvedValueOnce({
          rows: [
            { platform: 'ethereum', count: '3' },
            { platform: 'polygon', count: '2' }
          ]
        });

      mockCache.set.mockResolvedValue(true);

      const result = await nftService.getUserStats(userId);

      expect(result).toHaveProperty('totalNFTs');
      expect(result).toHaveProperty('platforms');
      expect(result).toHaveProperty('collections');
      expect(result).toHaveProperty('platformDistribution');
      expect(result).toHaveProperty('profile');
      expect(result.totalNFTs).toBe(5);
      expect(result.platforms).toBe(2);
    });
  });
});

describe('Pairing Service', () => {
  let pairingService;
  let mockDb, mockCache, mockEncryption;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockDb = { query: jest.fn() };
    mockCache = { get: jest.fn(), del: jest.fn() };
    mockEncryption = { encrypt: jest.fn() };

    const nftDatabaseService = require('../../src/services/nftDatabaseService');
    nftDatabaseService.nftDatabaseService = mockDb;

    const nftCacheService = require('../../src/services/nftCacheService');
    nftCacheService.nftCacheService = mockCache;

    const nftEncryptionService = require('../../src/services/nftEncryptionService');
    nftEncryptionService.nftEncryptionService = mockEncryption;

    pairingService = new PairingService();
  });

  describe('validateNFTData', () => {
    it('should validate correct NFT data', async () => {
      const validNFTData = {
        tokenId: '123',
        contractAddress: '0x1234567890123456789012345678901234567890',
        chainId: 1,
        metadata: { name: 'Test NFT' },
        imageUrl: 'https://example.com/image.jpg'
      };

      const result = await pairingService.validateNFTData(validNFTData);

      expect(result.isValid).toBe(true);
      expect(result.reason).toBe('NFT data is valid');
    });

    it('should reject NFT data with missing required fields', async () => {
      const invalidNFTData = {
        tokenId: '123'
        // Missing contractAddress and chainId
      };

      const result = await pairingService.validateNFTData(invalidNFTData);

      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('Missing required field');
    });

    it('should reject NFT data with invalid contract address', async () => {
      const invalidNFTData = {
        tokenId: '123',
        contractAddress: 'invalid-address',
        chainId: 1
      };

      const result = await pairingService.validateNFTData(invalidNFTData);

      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('Invalid contract address format');
    });

    it('should reject NFT data with invalid chain ID', async () => {
      const invalidNFTData = {
        tokenId: '123',
        contractAddress: '0x1234567890123456789012345678901234567890',
        chainId: -1
      };

      const result = await pairingService.validateNFTData(invalidNFTData);

      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('Chain ID must be a positive number');
    });
  });

  describe('validateTokenFromDatabase', () => {
    it('should return token details for valid token', async () => {
      const token = 'valid-token';
      const mockTokenData = {
        id: 'token-id',
        token: 'valid-token',
        user_id: 'user-id',
        platform: 'ethereum',
        expires_at: new Date(Date.now() + 60000), // 1 minute from now
        used_at: null,
        is_active: true
      };

      mockDb.query.mockResolvedValue({ rows: [mockTokenData] });

      const result = await pairingService.validateTokenFromDatabase(token);

      expect(result).toBeDefined();
      expect(result.token).toBe(token);
      expect(result.platform).toBe('ethereum');
    });

    it('should return null for expired token', async () => {
      const token = 'expired-token';
      const mockTokenData = {
        id: 'token-id',
        token: 'expired-token',
        user_id: 'user-id',
        platform: 'ethereum',
        expires_at: new Date(Date.now() - 60000), // 1 minute ago
        used_at: null,
        is_active: true
      };

      mockDb.query.mockResolvedValue({ rows: [mockTokenData] });

      const result = await pairingService.validateTokenFromDatabase(token);

      expect(result).toBeNull();
    });

    it('should return null for used token', async () => {
      const token = 'used-token';
      const mockTokenData = {
        id: 'token-id',
        token: 'used-token',
        user_id: 'user-id',
        platform: 'ethereum',
        expires_at: new Date(Date.now() + 60000),
        used_at: new Date(), // Already used
        is_active: true
      };

      mockDb.query.mockResolvedValue({ rows: [mockTokenData] });

      const result = await pairingService.validateTokenFromDatabase(token);

      expect(result).toBeNull();
    });
  });
});
