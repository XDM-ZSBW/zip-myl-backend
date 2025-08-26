const { describe, it, expect, beforeEach, afterEach } = require('@jest/globals');
const { PrismaClient } = require('@prisma/client');
const thoughtService = require('../../src/services/thoughtService.js');
const { v4: uuidv4 } = require('uuid');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/test_db',
    },
  },
});

describe('Thought Service', () => {
  beforeEach(async () => {
    // Clean up test data
    await prisma.thought.deleteMany();
  });

  afterEach(async () => {
    // Clean up test data
    await prisma.thought.deleteMany();
  });

  describe('createThought', () => {
    it('should create a new thought', async () => {
      const thoughtData = {
        content: 'Test thought content',
        metadata: { source: 'test' },
        url: 'https://example.com',
        userId: uuidv4(),
      };

      const thought = await thoughtService.createThought(thoughtData);

      expect(thought).toBeDefined();
      expect(thought.content).toBe(thoughtData.content);
      expect(thought.metadata).toEqual(thoughtData.metadata);
      expect(thought.url).toBe(thoughtData.url);
      expect(thought.userId).toBe(thoughtData.userId);
    });

    it('should create a thought without optional fields', async () => {
      const thoughtData = {
        content: 'Minimal thought content',
      };

      const thought = await thoughtService.createThought(thoughtData);

      expect(thought).toBeDefined();
      expect(thought.content).toBe(thoughtData.content);
      expect(thought.metadata).toEqual({});
      expect(thought.url).toBeNull();
      expect(thought.userId).toBeNull();
    });
  });

  describe('getThoughtById', () => {
    it('should retrieve a thought by ID', async () => {
      const thoughtData = {
        content: 'Test thought for retrieval',
        userId: uuidv4(),
      };

      const createdThought = await thoughtService.createThought(thoughtData);
      const retrievedThought = await thoughtService.getThoughtById(createdThought.id);

      expect(retrievedThought).toBeDefined();
      expect(retrievedThought.id).toBe(createdThought.id);
      expect(retrievedThought.content).toBe(thoughtData.content);
    });

    it('should return null for non-existent thought', async () => {
      const nonExistentId = uuidv4();
      const thought = await thoughtService.getThoughtById(nonExistentId);

      expect(thought).toBeNull();
    });
  });

  describe('updateThought', () => {
    it('should update a thought', async () => {
      const thoughtData = {
        content: 'Original content',
        userId: uuidv4(),
      };

      const createdThought = await thoughtService.createThought(thoughtData);
      
      const updateData = {
        content: 'Updated content',
        metadata: { updated: true },
      };

      const updatedThought = await thoughtService.updateThought(createdThought.id, updateData);

      expect(updatedThought.content).toBe(updateData.content);
      expect(updatedThought.metadata).toEqual(updateData.metadata);
    });

    it('should throw error for non-existent thought', async () => {
      const nonExistentId = uuidv4();
      const updateData = { content: 'Updated content' };

      await expect(thoughtService.updateThought(nonExistentId, updateData))
        .rejects.toThrow('Thought not found');
    });
  });

  describe('deleteThought', () => {
    it('should delete a thought', async () => {
      const thoughtData = {
        content: 'Thought to be deleted',
        userId: uuidv4(),
      };

      const createdThought = await thoughtService.createThought(thoughtData);
      const result = await thoughtService.deleteThought(createdThought.id);

      expect(result).toBe(true);

      const deletedThought = await thoughtService.getThoughtById(createdThought.id);
      expect(deletedThought).toBeNull();
    });

    it('should throw error for non-existent thought', async () => {
      const nonExistentId = uuidv4();

      await expect(thoughtService.deleteThought(nonExistentId))
        .rejects.toThrow('Thought not found');
    });
  });
});
