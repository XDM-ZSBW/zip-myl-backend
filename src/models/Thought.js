import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger.js';

const prisma = new PrismaClient();

export class Thought {
  constructor(data) {
    this.id = data.id;
    this.content = data.content;
    this.metadata = data.metadata;
    this.userId = data.userId;
    this.url = data.url;
    this.timestamp = data.timestamp;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  static async create(data) {
    try {
      const thought = await prisma.thought.create({
        data: {
          content: data.content,
          metadata: data.metadata || {},
          userId: data.userId,
          url: data.url,
          timestamp: data.timestamp || new Date(),
        },
      });
      
      logger.info(`Thought created with ID: ${thought.id}`);
      return new Thought(thought);
    } catch (error) {
      logger.error('Error creating thought:', error);
      throw error;
    }
  }

  static async findById(id) {
    try {
      const thought = await prisma.thought.findUnique({
        where: { id },
      });
      
      return thought ? new Thought(thought) : null;
    } catch (error) {
      logger.error('Error finding thought by ID:', error);
      throw error;
    }
  }

  static async findByUserId(userId, options = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = options;

      const skip = (page - 1) * limit;
      const orderBy = { [sortBy]: sortOrder };

      const [thoughts, total] = await Promise.all([
        prisma.thought.findMany({
          where: { userId },
          skip,
          take: limit,
          orderBy,
        }),
        prisma.thought.count({
          where: { userId },
        }),
      ]);

      return {
        thoughts: thoughts.map(thought => new Thought(thought)),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Error finding thoughts by user ID:', error);
      throw error;
    }
  }

  static async findAll(options = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        url,
      } = options;

      const skip = (page - 1) * limit;
      const orderBy = { [sortBy]: sortOrder };
      const where = url ? { url } : {};

      const [thoughts, total] = await Promise.all([
        prisma.thought.findMany({
          where,
          skip,
          take: limit,
          orderBy,
        }),
        prisma.thought.count({ where }),
      ]);

      return {
        thoughts: thoughts.map(thought => new Thought(thought)),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Error finding all thoughts:', error);
      throw error;
    }
  }

  async update(data) {
    try {
      const updatedThought = await prisma.thought.update({
        where: { id: this.id },
        data: {
          content: data.content,
          metadata: data.metadata,
          url: data.url,
        },
      });

      logger.info(`Thought updated with ID: ${this.id}`);
      return new Thought(updatedThought);
    } catch (error) {
      logger.error('Error updating thought:', error);
      throw error;
    }
  }

  async delete() {
    try {
      await prisma.thought.delete({
        where: { id: this.id },
      });

      logger.info(`Thought deleted with ID: ${this.id}`);
      return true;
    } catch (error) {
      logger.error('Error deleting thought:', error);
      throw error;
    }
  }

  toJSON() {
    return {
      id: this.id,
      content: this.content,
      metadata: this.metadata,
      userId: this.userId,
      url: this.url,
      timestamp: this.timestamp,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

export default Thought;
