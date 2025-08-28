const { describe, it, expect, beforeEach, afterEach } = require('@jest/globals');
const { thoughtService } = require('../../src/services/thoughtService.js');
const { Thought } = require('../../src/models/Thought');
const { v4: uuidv4 } = require('uuid');

describe('Thought Service', () => {
  beforeEach(async() => {
    // Reset all mocks
    jest.clearAllMocks();
  });

  afterEach(async() => {
    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('createThought', () => {
    it('should create a new thought', async() => {
      const thoughtData = {
        content: 'Test thought content',
        metadata: { source: 'test' },
        url: 'https://example.com',
        userId: uuidv4(),
      };

      const mockThought = {
        id: uuidv4(),
        ...thoughtData,
        timestamp: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        toJSON: () => ({
          id: mockThought.id,
          content: mockThought.content,
          metadata: mockThought.metadata,
          userId: mockThought.userId,
          url: mockThought.url,
          timestamp: mockThought.timestamp,
          createdAt: mockThought.createdAt,
          updatedAt: mockThought.updatedAt,
        }),
      };

      // Mock the Thought.create method
      Thought.create.mockResolvedValue(mockThought);

      const thought = await thoughtService.createThought(thoughtData);

      expect(thought).toBeDefined();
      expect(thought.content).toBe(thoughtData.content);
      expect(thought.metadata).toEqual(thoughtData.metadata);
      expect(thought.url).toBe(thoughtData.url);
      expect(thought.userId).toBe(thoughtData.userId);
    });

    it('should create a thought without optional fields', async() => {
      const thoughtData = {
        content: 'Minimal thought content',
      };

      const mockThought = {
        id: uuidv4(),
        content: thoughtData.content,
        metadata: {},
        url: null,
        userId: null,
        timestamp: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        toJSON: () => ({
          id: mockThought.id,
          content: mockThought.content,
          metadata: mockThought.metadata,
          userId: mockThought.userId,
          url: mockThought.url,
          timestamp: mockThought.timestamp,
          createdAt: mockThought.createdAt,
          updatedAt: mockThought.updatedAt,
        }),
      };

      // Mock the Thought.create method
      Thought.create.mockResolvedValue(mockThought);

      const thought = await thoughtService.createThought(thoughtData);

      expect(thought).toBeDefined();
      expect(thought.content).toBe(thoughtData.content);
      expect(thought.metadata).toEqual({});
      expect(thought.url).toBeNull();
      expect(thought.userId).toBeNull();
    });
  });

  describe('getThoughtById', () => {
    it('should retrieve a thought by ID', async() => {
      const thoughtData = {
        content: 'Test thought for retrieval',
        userId: uuidv4(),
      };

      const mockThought = {
        id: uuidv4(),
        ...thoughtData,
        metadata: {},
        url: null,
        timestamp: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        toJSON: () => ({
          id: mockThought.id,
          content: mockThought.content,
          metadata: mockThought.metadata,
          userId: mockThought.userId,
          url: mockThought.url,
          timestamp: mockThought.timestamp,
          createdAt: mockThought.createdAt,
          updatedAt: mockThought.updatedAt,
        }),
      };

      // Mock the Thought methods
      Thought.create.mockResolvedValue(mockThought);
      Thought.findById.mockResolvedValue(mockThought);

      const createdThought = await thoughtService.createThought(thoughtData);
      const retrievedThought = await thoughtService.getThoughtById(createdThought.id);

      expect(retrievedThought).toBeDefined();
      expect(retrievedThought.id).toBe(createdThought.id);
      expect(retrievedThought.content).toBe(thoughtData.content);
    });

    it('should return null for non-existent thought', async() => {
      const nonExistentId = uuidv4();
      
      // Mock the Thought.findById method to return null
      Thought.findById.mockResolvedValue(null);

      const thought = await thoughtService.getThoughtById(nonExistentId);

      expect(thought).toBeNull();
    });
  });

  describe('updateThought', () => {
    it('should update a thought', async() => {
      const thoughtData = {
        content: 'Original content',
        userId: uuidv4(),
      };

      const mockThought = {
        id: uuidv4(),
        ...thoughtData,
        metadata: {},
        url: null,
        timestamp: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        toJSON: () => ({
          id: mockThought.id,
          content: mockThought.content,
          metadata: mockThought.metadata,
          userId: mockThought.userId,
          url: mockThought.url,
          timestamp: mockThought.timestamp,
          createdAt: mockThought.createdAt,
          updatedAt: mockThought.updatedAt,
        }),
        update: jest.fn().mockResolvedValue({
          id: uuidv4(),
          content: 'Updated content',
          metadata: { updated: true },
          userId: thoughtData.userId,
          url: null,
          timestamp: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
          toJSON: () => ({
            id: uuidv4(),
            content: 'Updated content',
            metadata: { updated: true },
            userId: thoughtData.userId,
            url: null,
            timestamp: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
          }),
        }),
      };

      // Mock the Thought methods
      Thought.create.mockResolvedValue(mockThought);
      Thought.findById.mockResolvedValue(mockThought);

      const createdThought = await thoughtService.createThought(thoughtData);

      const updateData = {
        content: 'Updated content',
        metadata: { updated: true },
      };

      const updatedThought = await thoughtService.updateThought(createdThought.id, updateData);

      expect(updatedThought.content).toBe(updateData.content);
      expect(updatedThought.metadata).toEqual(updateData.metadata);
    });

    it('should throw error for non-existent thought', async() => {
      const nonExistentId = uuidv4();
      const updateData = { content: 'Updated content' };

      // Mock the Thought.findById method to return null
      Thought.findById.mockResolvedValue(null);

      await expect(thoughtService.updateThought(nonExistentId, updateData))
        .rejects.toThrow('Thought not found');
    });
  });

  describe('deleteThought', () => {
    it('should delete a thought', async() => {
      const thoughtData = {
        content: 'Thought to be deleted',
        userId: uuidv4(),
      };

      const mockThought = {
        id: uuidv4(),
        ...thoughtData,
        metadata: {},
        url: null,
        timestamp: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        toJSON: () => ({
          id: mockThought.id,
          content: mockThought.content,
          metadata: mockThought.metadata,
          userId: mockThought.userId,
          url: mockThought.url,
          timestamp: mockThought.timestamp,
          createdAt: mockThought.createdAt,
          updatedAt: mockThought.updatedAt,
        }),
        delete: jest.fn().mockResolvedValue(true),
      };

      // Mock the Thought methods
      Thought.create.mockResolvedValue(mockThought);
      Thought.findById.mockResolvedValue(mockThought);
      Thought.findById.mockResolvedValueOnce(mockThought).mockResolvedValueOnce(null); // First call returns thought, second returns null

      const createdThought = await thoughtService.createThought(thoughtData);
      const result = await thoughtService.deleteThought(createdThought.id);

      expect(result).toBe(true);

      const deletedThought = await thoughtService.getThoughtById(createdThought.id);
      expect(deletedThought).toBeNull();
    });

    it('should throw error for non-existent thought', async() => {
      const nonExistentId = uuidv4();

      // Mock the Thought.findById method to return null
      Thought.findById.mockResolvedValue(null);

      await expect(thoughtService.deleteThought(nonExistentId))
        .rejects.toThrow('Thought not found');
    });
  });
});
