import { Thought } from '../models/Thought.js';
import cacheService from './cacheService.js';
import { logger } from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

class ThoughtService {
  async createThought(data) {
    try {
      const thoughtData = {
        ...data,
        id: uuidv4(),
        timestamp: data.timestamp || new Date(),
      };

      const thought = await Thought.create(thoughtData);
      
      // Cache the new thought
      await cacheService.cacheThought(thought.id, thought.toJSON());
      
      // Invalidate user thoughts cache if userId is provided
      if (data.userId) {
        await cacheService.invalidateUserThoughts(data.userId);
      }

      logger.info(`Thought created successfully: ${thought.id}`);
      return thought;
    } catch (error) {
      logger.error('Error creating thought:', error);
      throw error;
    }
  }

  async getThoughtById(id) {
    try {
      // Try to get from cache first
      const cachedThought = await cacheService.getCachedThought(id);
      if (cachedThought) {
        return new Thought(cachedThought);
      }

      // Get from database
      const thought = await Thought.findById(id);
      if (thought) {
        // Cache the thought
        await cacheService.cacheThought(id, thought.toJSON());
      }

      return thought;
    } catch (error) {
      logger.error('Error getting thought by ID:', error);
      throw error;
    }
  }

  async getUserThoughts(userId, options = {}) {
    try {
      // Try to get from cache first
      const cacheKey = `user:${userId}:thoughts:${JSON.stringify(options)}`;
      const cachedThoughts = await cacheService.get(cacheKey);
      if (cachedThoughts) {
        return cachedThoughts;
      }

      // Get from database
      const result = await Thought.findByUserId(userId, options);
      
      // Cache the result
      await cacheService.set(cacheKey, result, 1800); // 30 minutes

      return result;
    } catch (error) {
      logger.error('Error getting user thoughts:', error);
      throw error;
    }
  }

  async getAllThoughts(options = {}) {
    try {
      // Try to get from cache first
      const cacheKey = `thoughts:all:${JSON.stringify(options)}`;
      const cachedThoughts = await cacheService.get(cacheKey);
      if (cachedThoughts) {
        return cachedThoughts;
      }

      // Get from database
      const result = await Thought.findAll(options);
      
      // Cache the result
      await cacheService.set(cacheKey, result, 900); // 15 minutes

      return result;
    } catch (error) {
      logger.error('Error getting all thoughts:', error);
      throw error;
    }
  }

  async updateThought(id, data) {
    try {
      const thought = await Thought.findById(id);
      if (!thought) {
        throw new Error('Thought not found');
      }

      const updatedThought = await thought.update(data);
      
      // Update cache
      await cacheService.cacheThought(id, updatedThought.toJSON());
      
      // Invalidate user thoughts cache if userId exists
      if (thought.userId) {
        await cacheService.invalidateUserThoughts(thought.userId);
      }

      logger.info(`Thought updated successfully: ${id}`);
      return updatedThought;
    } catch (error) {
      logger.error('Error updating thought:', error);
      throw error;
    }
  }

  async deleteThought(id) {
    try {
      const thought = await Thought.findById(id);
      if (!thought) {
        throw new Error('Thought not found');
      }

      const userId = thought.userId;
      await thought.delete();
      
      // Remove from cache
      await cacheService.del(`thought:${id}`);
      
      // Invalidate user thoughts cache if userId exists
      if (userId) {
        await cacheService.invalidateUserThoughts(userId);
      }

      logger.info(`Thought deleted successfully: ${id}`);
      return true;
    } catch (error) {
      logger.error('Error deleting thought:', error);
      throw error;
    }
  }

  async searchThoughts(query, options = {}) {
    try {
      // This would typically use a full-text search in the database
      // For now, we'll implement a simple content search
      const { page = 1, limit = 10, userId } = options;
      
      // Try to get from cache first
      const cacheKey = `thoughts:search:${query}:${JSON.stringify(options)}`;
      const cachedResults = await cacheService.get(cacheKey);
      if (cachedResults) {
        return cachedResults;
      }

      // Get all thoughts and filter (in production, use database full-text search)
      const allThoughts = await Thought.findAll({ userId, page: 1, limit: 1000 });
      
      const filteredThoughts = allThoughts.thoughts.filter(thought =>
        thought.content.toLowerCase().includes(query.toLowerCase())
      );

      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedThoughts = filteredThoughts.slice(startIndex, endIndex);

      const result = {
        thoughts: paginatedThoughts,
        pagination: {
          page,
          limit,
          total: filteredThoughts.length,
          pages: Math.ceil(filteredThoughts.length / limit),
        },
        query,
      };

      // Cache the result
      await cacheService.set(cacheKey, result, 600); // 10 minutes

      return result;
    } catch (error) {
      logger.error('Error searching thoughts:', error);
      throw error;
    }
  }

  async getThoughtStats() {
    try {
      const cacheKey = 'thoughts:stats';
      const cachedStats = await cacheService.get(cacheKey);
      if (cachedStats) {
        return cachedStats;
      }

      // Get stats from database
      const databaseService = (await import('./databaseService.js')).default;
      const prisma = databaseService.getClient();

      const [totalThoughts, recentThoughts, uniqueUsers] = await Promise.all([
        prisma.thought.count(),
        prisma.thought.count({
          where: {
            createdAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
            },
          },
        }),
        prisma.thought.groupBy({
          by: ['userId'],
          _count: {
            userId: true,
          },
        }),
      ]);

      const stats = {
        totalThoughts,
        recentThoughts,
        uniqueUsers: uniqueUsers.length,
        timestamp: new Date().toISOString(),
      };

      // Cache the stats
      await cacheService.set(cacheKey, stats, 3600); // 1 hour

      return stats;
    } catch (error) {
      logger.error('Error getting thought stats:', error);
      throw error;
    }
  }
}

// Create singleton instance
const thoughtService = new ThoughtService();

export default thoughtService;
