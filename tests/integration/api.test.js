const request = require('supertest');
const app = require('../../src/app.js');
const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/test_db',
    },
  },
});

describe('API Integration Tests', () => {
  beforeEach(async () => {
    // Clean up test data
    await prisma.thought.deleteMany();
  });

  afterEach(async () => {
    // Clean up test data
    await prisma.thought.deleteMany();
  });

  describe('Health Endpoints', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.status).toBe('healthy');
      expect(response.body.timestamp).toBeDefined();
      expect(response.body.services).toBeDefined();
    });

    it('should return readiness status', async () => {
      const response = await request(app)
        .get('/health/ready')
        .expect(200);

      expect(response.body.status).toBe('ready');
    });

    it('should return liveness status', async () => {
      const response = await request(app)
        .get('/health/live')
        .expect(200);

      expect(response.body.status).toBe('alive');
    });
  });

  describe('Thoughts API', () => {
    it('should create a new thought', async () => {
      const thoughtData = {
        content: 'Test thought content',
        metadata: { source: 'test' },
        url: 'https://example.com',
      };

      const response = await request(app)
        .post('/api/thoughts')
        .send(thoughtData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.content).toBe(thoughtData.content);
      expect(response.body.data.metadata).toEqual(thoughtData.metadata);
      expect(response.body.data.url).toBe(thoughtData.url);
    });

    it('should retrieve thoughts', async () => {
      // Create test thoughts
      const thought1 = await prisma.thought.create({
        data: {
          content: 'First thought',
          metadata: {},
          userId: uuidv4(),
        },
      });

      const thought2 = await prisma.thought.create({
        data: {
          content: 'Second thought',
          metadata: {},
          userId: uuidv4(),
        },
      });

      const response = await request(app)
        .get('/api/thoughts')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.pagination).toBeDefined();
    });

    it('should retrieve a specific thought', async () => {
      const thought = await prisma.thought.create({
        data: {
          content: 'Specific thought',
          metadata: {},
          userId: uuidv4(),
        },
      });

      const response = await request(app)
        .get(`/api/thoughts/${thought.id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(thought.id);
      expect(response.body.data.content).toBe('Specific thought');
    });

    it('should update a thought', async () => {
      const thought = await prisma.thought.create({
        data: {
          content: 'Original content',
          metadata: {},
          userId: uuidv4(),
        },
      });

      const updateData = {
        content: 'Updated content',
        metadata: { updated: true },
      };

      const response = await request(app)
        .put(`/api/thoughts/${thought.id}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.content).toBe(updateData.content);
      expect(response.body.data.metadata).toEqual(updateData.metadata);
    });

    it('should delete a thought', async () => {
      const thought = await prisma.thought.create({
        data: {
          content: 'Thought to delete',
          metadata: {},
          userId: uuidv4(),
        },
      });

      const response = await request(app)
        .delete(`/api/thoughts/${thought.id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Thought deleted successfully');

      // Verify thought is deleted
      const deletedThought = await prisma.thought.findUnique({
        where: { id: thought.id },
      });
      expect(deletedThought).toBeNull();
    });

    it('should return 404 for non-existent thought', async () => {
      const nonExistentId = uuidv4();

      const response = await request(app)
        .get(`/api/thoughts/${nonExistentId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Thought not found');
    });

    it('should validate request data', async () => {
      const invalidData = {
        content: '', // Empty content should fail validation
      };

      const response = await request(app)
        .post('/api/thoughts')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
    });
  });

  describe('Root Endpoint', () => {
    it('should return API information', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      expect(response.body.message).toBe('Myl.Zip Backend Service');
      expect(response.body.version).toBe('1.0.0');
      expect(response.body.endpoints).toBeDefined();
    });
  });
});
