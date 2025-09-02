const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const { validate, schemas } = require('../middleware/validation');
// const { rateLimit } = require('../middleware/rateLimiter'); // Unused import
const { authenticateDevice, authenticateDeviceEventSource } = require('../middleware/auth');
const redis = require('../config/redis');
const { generateTokenCode } = require('../utils/tokenCodes');

// Chat session management
const chatSessions = new Map();
const deviceConnections = new Map();

// Enhanced AI intelligence system
class ChatIntelligence {
  constructor() {
    this.contextWindow = 15; // Increased context for shared conversations
    this.devicePreferences = new Map(); // Track preferences per device
    this.conversationContext = new Map(); // Track conversation context per device
    this.sharedKnowledge = new Map(); // Collective knowledge across devices
    this.responseTemplates = {
      greeting: [
        'Hello! I\'m here to help you across all your devices.',
        'Hi there! I\'ll assist you with your setup and preferences.',
        'Welcome! Let me help you configure your personalized experience.',
      ],
      ui_preferences: [
        'I understand your UI preferences! I\'ll share these with the setup wizard for a personalized experience.',
        'Great choice! I\'ll sync your theme preferences across all your devices.',
        'Your layout preferences have been noted and will be applied to your interface.',
      ],
      technical_support: [
        'I can help you with technical questions! Let me guide you through the setup process.',
        'For detailed setup instructions, check out the setup wizard at myl.zip/setup-wizard.html',
        'I\'ll help you troubleshoot any issues with your device configuration.',
      ],
      sync_status: [
        'Synchronization is working perfectly! Your data is being shared across all connected devices in real-time.',
        'Your device network is fully connected. I\'m learning from your usage patterns to provide better assistance.',
        'All your preferences and conversations are being synced seamlessly. I\'m building a comprehensive profile of your needs.',
      ],
      cross_device_insight: [
        'I notice you\'re using this from multiple devices. Let me share some insights about your ' +
        'usage patterns and suggest optimizations.',
        'Based on your cross-device activity, I can recommend some personalized features that would ' +
        'enhance your experience.',
        'Your multi-device setup is impressive! I\'m learning from your behavior to provide smarter, ' +
        'more contextual assistance.',
      ],
    };
  }

  analyzeMessage(message, deviceId, _context = []) {
    const lowerMessage = message.toLowerCase();
    const analysis = {
      intent: 'general',
      confidence: 0.8,
      ui_preferences: {},
      requires_response: true,
      response_type: 'helpful',
      cross_device_context: false,
      personalization_level: 'basic',
    };

    // Enhanced intent classification with cross-device awareness
    if (lowerMessage.includes('hi') || lowerMessage.includes('hello') || lowerMessage.includes('hey')) {
      analysis.intent = 'greeting';
      analysis.confidence = 0.9;
      analysis.cross_device_context = true;
    } else if (lowerMessage.includes('theme') || lowerMessage.includes('color') || lowerMessage.includes('dark') || lowerMessage.includes('light')) {
      analysis.intent = 'ui_preferences';
      analysis.confidence = 0.85;
      analysis.ui_preferences.theme = lowerMessage.includes('dark') ? 'dark' : 'light';
      analysis.personalization_level = 'high';
    } else if (lowerMessage.includes('font') || lowerMessage.includes('text') || lowerMessage.includes('size')) {
      analysis.intent = 'ui_preferences';
      analysis.confidence = 0.8;
      analysis.ui_preferences.fontSize = lowerMessage.includes('large') || lowerMessage.includes('big') ? 'large' : 'small';
      analysis.personalization_level = 'high';
    } else if (lowerMessage.includes('help') || lowerMessage.includes('support') || lowerMessage.includes('problem')) {
      analysis.intent = 'technical_support';
      analysis.confidence = 0.9;
      analysis.cross_device_context = true;
    } else if (lowerMessage.includes('sync') || lowerMessage.includes('connect') || lowerMessage.includes('status')) {
      analysis.intent = 'sync_status';
      analysis.confidence = 0.85;
      analysis.cross_device_context = true;
    } else if (lowerMessage.includes('device') || lowerMessage.includes('browser') || lowerMessage.includes('mobile')) {
      analysis.intent = 'cross_device_insight';
      analysis.confidence = 0.9;
      analysis.cross_device_context = true;
      analysis.personalization_level = 'high';
    }

    // Store device preferences for future personalization
    if (analysis.intent === 'ui_preferences') {
      this.updateDevicePreferences(deviceId, analysis.ui_preferences);
    }

    // Update conversation context
    this.updateConversationContext(deviceId, message, analysis);

    return analysis;
  }

  updateDevicePreferences(deviceId, preferences) {
    if (!this.devicePreferences.has(deviceId)) {
      this.devicePreferences.set(deviceId, {});
    }

    const devicePrefs = this.devicePreferences.get(deviceId);
    Object.assign(devicePrefs, preferences);

    // Share preferences across devices
    this.sharedKnowledge.set(`preferences:${deviceId}`, {
      preferences: devicePrefs,
      timestamp: Date.now(),
      source: deviceId,
    });
  }

  updateConversationContext(deviceId, message, analysis) {
    if (!this.conversationContext.has(deviceId)) {
      this.conversationContext.set(deviceId, []);
    }

    const context = this.conversationContext.get(deviceId);
    context.push({
      message,
      analysis,
      timestamp: Date.now(),
    });

    // Keep only recent context
    if (context.length > this.contextWindow) {
      context.shift();
    }

    // Share context for cross-device learning
    this.sharedKnowledge.set(`context:${deviceId}`, {
      context: context.slice(-5), // Share last 5 messages for privacy
      timestamp: Date.now(),
      source: deviceId,
    });
  }

  generateResponse(analysis, deviceId, context = []) {
    let response = '';

    // Check if we have cross-device insights
    const hasCrossDeviceData = this.hasCrossDeviceInsights(deviceId);

    switch (analysis.intent) {
    case 'greeting':
      if (hasCrossDeviceData) {
        response = this.getRandomResponse('cross_device_insight');
      } else {
        response = this.getRandomResponse('greeting');
      }
      break;

    case 'ui_preferences':
      response = this.getRandomResponse('ui_preferences');
      if (hasCrossDeviceData) {
        response += this.generateCrossDeviceRecommendations(deviceId);
      }
      break;

    case 'technical_support':
      response = this.getRandomResponse('technical_support');
      if (hasCrossDeviceData) {
        response += this.generatePersonalizedSupport(deviceId);
      }
      break;

    case 'sync_status':
      response = this.getRandomResponse('sync_status');
      if (hasCrossDeviceData) {
        response += this.generateSyncInsights(deviceId);
      }
      break;

    case 'cross_device_insight':
      response = this.generateCrossDeviceInsights(deviceId);
      break;

    default:
      if (hasCrossDeviceData) {
        response = this.generateContextualResponse(deviceId, context);
      } else {
        response = 'I\'m here to help! I can assist with SSL certificates, MyKeys.zip integration, API key generation, ' +
          'USB device offers, security features, setup processes, and cryptocurrency integration. What would you like to know more about?';
      }
    }

    // Add context-aware enhancements
    if (context.length > 0 && hasCrossDeviceData) {
      response += this.generateContextualEnhancements(deviceId, context);
    }

    return response;
  }

  hasCrossDeviceInsights(deviceId) {
    // Check if we have data from other devices
    for (const [key, value] of this.sharedKnowledge.entries()) {
      if (value.source !== deviceId && (Date.now() - value.timestamp) < 3600000) { // Within last hour
        return true;
      }
    }
    return false;
  }

  generateCrossDeviceRecommendations(deviceId) {
    const recommendations = [];

    // Analyze preferences from other devices
    for (const [key, value] of this.sharedKnowledge.entries()) {
      if (key.startsWith('preferences:') && value.source !== deviceId) {
        const otherPrefs = value.preferences;
        if (otherPrefs.theme && otherPrefs.theme !== this.devicePreferences.get(deviceId)?.theme) {
          recommendations.push(` I notice you prefer ${otherPrefs.theme} theme on other devices - would you like me to apply that here too?`);
        }
      }
    }

    return recommendations.join('');
  }

  generatePersonalizedSupport(deviceId) {
    const deviceContext = this.conversationContext.get(deviceId) || [];
    const recentIssues = deviceContext.filter(ctx =>
      ctx.analysis.intent === 'technical_support' &&
      (Date.now() - ctx.timestamp) < 86400000, // Within last 24 hours
    );

    if (recentIssues.length > 0) {
      return ` I see you've had ${recentIssues.length} technical questions recently. Let me provide more targeted assistance based on your usage patterns.`;
    }

    return '';
  }

  generateSyncInsights(deviceId) {
    const connectedDevices = Array.from(this.devicePreferences.keys()).filter(id => id !== deviceId);

    if (connectedDevices.length > 0) {
      return ` You're currently connected from ${connectedDevices.length} other device${connectedDevices.length > 1 ? 's' : ''}. I'm learning from your activity across all of them to provide better assistance.`;
    }

    return '';
  }

  generateCrossDeviceInsights(deviceId) {
    const insights = [];
    const otherDevices = Array.from(this.devicePreferences.keys()).filter(id => id !== deviceId);

    if (otherDevices.length > 0) {
      insights.push(`I can see you're using MyL.Zip from ${otherDevices.length} device${otherDevices.length > 1 ? 's' : ''}.`);

      // Analyze usage patterns
      const usagePatterns = this.analyzeUsagePatterns(deviceId);
      if (usagePatterns) {
        insights.push(usagePatterns);
      }

      insights.push('I\'m building a comprehensive profile of your needs to provide smarter, more personalized assistance across your entire ecosystem.');
    }

    return insights.join(' ');
  }

  analyzeUsagePatterns(deviceId) {
    const deviceContext = this.conversationContext.get(deviceId) || [];
    const recentActivity = deviceContext.filter(ctx =>
      (Date.now() - ctx.timestamp) < 604800000, // Within last week
    );

    if (recentActivity.length > 5) {
      return `You're quite active! I've noticed you prefer ${this.getPreferredTopics(recentActivity)}.`;
    }

    return null;
  }

  getPreferredTopics(activity) {
    const topicCounts = {};
    activity.forEach(ctx => {
      const intent = ctx.analysis.intent;
      topicCounts[intent] = (topicCounts[intent] || 0) + 1;
    });

    const topTopic = Object.entries(topicCounts)
      .sort(([,a], [,b]) => b - a)[0];

    if (topTopic) {
      const topicNames = {
        'ui_preferences': 'customizing your interface',
        'technical_support': 'getting technical help',
        'sync_status': 'managing your device connections',
        'general': 'exploring features',
      };

      return topicNames[topTopic[0]] || 'exploring features';
    }

    return 'exploring features';
  }

  generateContextualResponse(deviceId, _context) {
    const deviceContext = this.conversationContext.get(deviceId) || [];

    if (deviceContext.length > 0) {
      const recentTopics = deviceContext.slice(-3).map(ctx => ctx.analysis.intent);
      const uniqueTopics = [...new Set(recentTopics)];

      if (uniqueTopics.length > 1) {
        return 'I see you\'ve been exploring multiple aspects of MyL.Zip. Based on your recent activity, ' +
          `I can help you with ${uniqueTopics.join(', ')}. What would you like to focus on?`;
      }
    }

    return 'I\'m here to help! I can assist with SSL certificates, MyKeys.zip integration, API key generation, ' +
      'USB device offers, security features, setup processes, and cryptocurrency integration. What would you like to know more about?';
  }

  generateContextualEnhancements(deviceId, _context) {
    const enhancements = [];

    // Check if user is asking about something they've discussed before
    const deviceContext = this.conversationContext.get(deviceId) || [];
    const recentMessages = deviceContext.slice(-5);

    if (recentMessages.length > 0) {
      const lastTopic = recentMessages[recentMessages.length - 1].analysis.intent;
      if (lastTopic !== 'greeting') {
        enhancements.push(` I'm also continuing our conversation about ${this.getTopicName(lastTopic)} from earlier.`);
      }
    }

    return enhancements.join('');
  }

  getTopicName(intent) {
    const topicNames = {
      'ui_preferences': 'interface customization',
      'technical_support': 'technical assistance',
      'sync_status': 'device synchronization',
      'cross_device_insight': 'cross-device features',
    };

    return topicNames[intent] || 'your setup';
  }

  getRandomResponse(type) {
    const responses = this.responseTemplates[type] || this.responseTemplates.greeting;
    return responses[Math.floor(Math.random() * responses.length)];
  }
}

const chatAI = new ChatIntelligence();

// WebSocket-like real-time communication using Server-Sent Events
router.get('/stream/:deviceId', authenticateDeviceEventSource, async(req, res) => {
  const { deviceId } = req.params;
  const tokenCode = generateTokenCode('chat', 'stream');

  logger.info(`🔗 Chat stream initiated for device ${deviceId}`, { tokenCode });

  // Set up SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control',
  });

  // Create device connection
  const connection = {
    deviceId,
    res,
    lastSeen: Date.now(),
    messageQueue: [],
  };

  deviceConnections.set(deviceId, connection);

  // Send initial connection message
  res.write(`data: ${JSON.stringify({
    type: 'connection_established',
    deviceId,
    timestamp: Date.now(),
    tokenCode,
  })}\n\n`);

  // Keep connection alive
  const keepAlive = setInterval(() => {
    if (connection.res.writableEnded) {
      clearInterval(keepAlive);
      deviceConnections.delete(deviceId);
      return;
    }

    res.write(`data: ${JSON.stringify({
      type: 'keepalive',
      timestamp: Date.now(),
    })}\n\n`);
  }, 30000);

  // Handle client disconnect
  req.on('close', () => {
    clearInterval(keepAlive);
    deviceConnections.delete(deviceId);
    logger.info(`🔌 Chat stream closed for device ${deviceId}`);
  });
});

// Send message to all connected devices
router.post('/broadcast', authenticateDevice, validate(schemas.broadcastMessage), async(req, res) => {
  try {
    const { message, sourceDeviceId, targetDeviceIds = [] } = req.body;
    const tokenCode = generateTokenCode('chat', 'broadcast');

    logger.info(`📢 Broadcasting message from ${sourceDeviceId}`, { tokenCode });

    if (!message || !sourceDeviceId) {
      return res.status(400).json({
        success: false,
        error: 'Message and sourceDeviceId are required',
        tokenCode,
      });
    }

    // Analyze message with AI
    const analysis = chatAI.analyzeMessage(message, sourceDeviceId);

    // Create message object
    const messageObj = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      content: message,
      sourceDeviceId,
      timestamp: Date.now(),
      analysis,
      tokenCode,
    };

    // Store message in Redis for persistence
    await redis.lpush(`chat:messages:${sourceDeviceId}`, JSON.stringify(messageObj));
    await redis.expire(`chat:messages:${sourceDeviceId}`, 86400); // 24 hours

    // Broadcast to all connected devices
    const broadcastPromises = [];

    if (targetDeviceIds.length > 0) {
      // Send to specific target devices
      targetDeviceIds.forEach(targetId => {
        const targetConnection = deviceConnections.get(targetId);
        if (targetConnection && targetConnection.res.writableEnded === false) {
          targetConnection.res.write(`data: ${JSON.stringify({
            type: 'message',
            ...messageObj,
          })}\n\n`);
          broadcastPromises.push(Promise.resolve());
        }
      });
    } else {
      // Broadcast to all connected devices except sender
      deviceConnections.forEach((connection, deviceId) => {
        if (deviceId !== sourceDeviceId && connection.res.writableEnded === false) {
          connection.res.write(`data: ${JSON.stringify({
            type: 'message',
            ...messageObj,
          })}\n\n`);
          broadcastPromises.push(Promise.resolve());
        }
      });
    }

    await Promise.all(broadcastPromises);

    // Generate AI response if needed
    if (analysis.requires_response) {
      const aiResponse = chatAI.generateResponse(analysis, sourceDeviceId);
      const aiMessageObj = {
        id: `ai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        content: aiResponse,
        sourceDeviceId: 'ai-assistant',
        timestamp: Date.now(),
        analysis: { intent: 'ai_response', confidence: 1.0 },
        tokenCode: generateTokenCode('chat', 'ai_response'),
      };

      // Broadcast AI response
      deviceConnections.forEach((connection, _deviceId) => {
        if (connection.res.writableEnded === false) {
          connection.res.write(`data: ${JSON.stringify({
            type: 'ai_response',
            ...aiMessageObj,
          })}\n\n`);
        }
      });

      // Store AI response
      await redis.lpush(`chat:ai_responses:${sourceDeviceId}`, JSON.stringify(aiMessageObj));
      await redis.expire(`chat:ai_responses:${sourceDeviceId}`, 86400);
    }

    res.json({
      success: true,
      messageId: messageObj.id,
      broadcastCount: broadcastPromises.length,
      tokenCode,
    });
  } catch (error) {
    logger.error('Error broadcasting message:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to broadcast message',
      tokenCode: generateTokenCode('chat', 'error'),
    });
  }
});

// Get chat history
router.get('/history/:deviceId', authenticateDevice, async(req, res) => {
  try {
    const { deviceId } = req.params;
    const tokenCode = generateTokenCode('chat', 'history');

    logger.info(`📚 Retrieving chat history for device ${deviceId}`, { tokenCode });

    // Get messages from Redis
    const messages = await redis.lrange(`chat:messages:${deviceId}`, 0, -1);
    const aiResponses = await redis.lrange(`chat:ai_responses:${deviceId}`, 0, -1);

    // Parse and combine messages
    const parsedMessages = messages.map(msg => JSON.parse(msg));
    const parsedAIResponses = aiResponses.map(msg => JSON.parse(msg));

    // Combine and sort by timestamp
    const allMessages = [...parsedMessages, ...parsedAIResponses]
      .sort((a, b) => a.timestamp - b.timestamp)
      .slice(-50); // Limit to last 50 messages

    res.json({
      success: true,
      messages: allMessages,
      count: allMessages.length,
      tokenCode,
    });
  } catch (error) {
    logger.error('Error retrieving chat history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve chat history',
      tokenCode: generateTokenCode('chat', 'error'),
    });
  }
});

// Get connected devices with enhanced insights
router.get('/devices', authenticateDevice, async(req, res) => {
  try {
    const tokenCode = generateTokenCode('chat', 'devices');

    const connectedDevices = Array.from(deviceConnections.keys()).map(deviceId => {
      const connection = deviceConnections.get(deviceId);
      const devicePrefs = chatAI.devicePreferences.get(deviceId) || {};
      const deviceContext = chatAI.conversationContext.get(deviceId) || [];

      // Calculate device intelligence score
      const intelligenceScore = calculateDeviceIntelligence(deviceId, devicePrefs, deviceContext);

      return {
        deviceId,
        lastSeen: connection.lastSeen,
        status: 'connected',
        preferences: devicePrefs,
        activityLevel: deviceContext.length,
        intelligenceScore,
        recentTopics: getRecentTopics(deviceContext),
        crossDeviceInsights: generateDeviceInsights(deviceId),
      };
    });

    // Sort by intelligence score (smartest devices first)
    connectedDevices.sort((a, b) => b.intelligenceScore - a.intelligenceScore);

    res.json({
      success: true,
      devices: connectedDevices,
      count: connectedDevices.length,
      totalIntelligenceScore: connectedDevices.reduce((sum, d) => sum + d.intelligenceScore, 0),
      averageIntelligenceScore: connectedDevices.length > 0 ?
        connectedDevices.reduce((sum, d) => sum + d.intelligenceScore, 0) / connectedDevices.length : 0,
      tokenCode,
    });
  } catch (error) {
    logger.error('Error retrieving connected devices:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve connected devices',
      tokenCode: generateTokenCode('chat', 'error'),
    });
  }
});


// Get recent topics for a device
function getRecentTopics(context) {
  const recentTopics = context.slice(-5).map(ctx => ctx.analysis.intent);
  const uniqueTopics = [...new Set(recentTopics)];

  return uniqueTopics.map(topic => ({
    topic,
    count: recentTopics.filter(t => t === topic).length,
  }));
}

// Generate insights for a specific device
function generateDeviceInsights(deviceId) {
  const insights = [];
  const devicePrefs = chatAI.devicePreferences.get(deviceId) || {};
  const deviceContext = chatAI.conversationContext.get(deviceId) || [];

  // Preference insights
  if (devicePrefs.theme) {
    insights.push(`Prefers ${devicePrefs.theme} theme`);
  }
  if (devicePrefs.fontSize) {
    insights.push(`Uses ${devicePrefs.fontSize} font size`);
  }

  // Activity insights
  if (deviceContext.length > 10) {
    insights.push('Very active user');
  } else if (deviceContext.length > 5) {
    insights.push('Moderately active user');
  } else {
    insights.push('New user');
  }

  // Cross-device insights
  const otherDevices = Array.from(chatAI.devicePreferences.keys()).filter(id => id !== deviceId);
  if (otherDevices.length > 0) {
    insights.push(`Connected from ${otherDevices.length} other device${otherDevices.length > 1 ? 's' : ''}`);
  }

  return insights;
}

// Update device preferences based on chat analysis
router.post('/preferences/:deviceId', authenticateDevice, validate(schemas.chatPreferences), async(req, res) => {
  try {
    const { deviceId } = req.params;
    const { preferences } = req.body;
    const tokenCode = generateTokenCode('chat', 'preferences');

    logger.info(`⚙️ Updating preferences for device ${deviceId}`, { tokenCode, preferences });

    // Store preferences in Redis
    await redis.hset(`device:preferences:${deviceId}`, preferences);
    await redis.expire(`device:preferences:${deviceId}`, 604800); // 7 days

    // Notify all connected devices about preference update
    deviceConnections.forEach((connection, id) => {
      if (connection.res.writableEnded === false) {
        connection.res.write(`data: ${JSON.stringify({
          type: 'preferences_updated',
          deviceId,
          preferences,
          timestamp: Date.now(),
          tokenCode,
        })}\n\n`);
      }
    });

    res.json({
      success: true,
      message: 'Preferences updated successfully',
      tokenCode,
    });
  } catch (error) {
    logger.error('Error updating preferences:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update preferences',
      tokenCode: generateTokenCode('chat', 'error'),
    });
  }
});

// Handle image uploads
router.post('/image', authenticateDevice, async(req, res) => {
  try {
    const { sourceDeviceId } = req.body;
    const imageFile = req.files?.image;
    const tokenCode = generateTokenCode('chat', 'image_upload');

    logger.info(`📷 Image upload from device ${sourceDeviceId}`, { tokenCode });

    if (!imageFile || !sourceDeviceId) {
      return res.status(400).json({
        success: false,
        error: 'Image file and sourceDeviceId are required',
        tokenCode,
      });
    }

    // Validate image file
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(imageFile.mimetype)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid image format. Supported: JPEG, PNG, GIF, WebP',
        tokenCode,
      });
    }

    // Store image metadata in Redis
    const imageData = {
      id: `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      filename: imageFile.name,
      mimetype: imageFile.mimetype,
      size: imageFile.size,
      sourceDeviceId,
      timestamp: Date.now(),
      tokenCode,
    };

    await redis.lpush(`chat:images:${sourceDeviceId}`, JSON.stringify(imageData));
    await redis.expire(`chat:images:${sourceDeviceId}`, 86400); // 24 hours

    // Broadcast image upload to all connected devices
    deviceConnections.forEach((connection, deviceId) => {
      if (deviceId !== sourceDeviceId && connection.res.writableEnded === false) {
        connection.res.write(`data: ${JSON.stringify({
          type: 'image_uploaded',
          ...imageData,
        })}\n\n`);
      }
    });

    res.json({
      success: true,
      messageId: imageData.id,
      filename: imageFile.name,
      size: imageFile.size,
      tokenCode,
    });
  } catch (error) {
    logger.error('Error uploading image:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload image',
      tokenCode: generateTokenCode('chat', 'error'),
    });
  }
});

// Health check for chat service
router.get('/health', async(req, res) => {
  const tokenCode = generateTokenCode('chat', 'health');

  // Calculate intelligence metrics
  const totalIntelligenceScore = Array.from(chatAI.devicePreferences.keys()).reduce((sum, deviceId) => {
    const devicePrefs = chatAI.devicePreferences.get(deviceId) || {};
    const deviceContext = chatAI.conversationContext.get(deviceId) || [];
    return sum + calculateDeviceIntelligence(deviceId, devicePrefs, deviceContext);
  }, 0);

  const averageIntelligenceScore = chatAI.devicePreferences.size > 0 ?
    totalIntelligenceScore / chatAI.devicePreferences.size : 0;

  res.json({
    success: true,
    status: 'healthy',
    connectedDevices: deviceConnections.size,
    activeSessions: chatSessions.size,
    totalIntelligenceScore,
    averageIntelligenceScore,
    crossDeviceConnections: chatAI.sharedKnowledge.size,
    sharedKnowledgeEntries: Array.from(chatAI.sharedKnowledge.keys()).length,
    timestamp: Date.now(),
    tokenCode,
  });
});

// Get intelligent suggestions for a device
router.get('/suggestions/:deviceId', authenticateDevice, async(req, res) => {
  try {
    const { deviceId } = req.params;
    const tokenCode = generateTokenCode('chat', 'suggestions');

    const suggestions = generateIntelligentSuggestions(deviceId);

    res.json({
      success: true,
      deviceId,
      suggestions,
      count: suggestions.length,
      tokenCode,
    });
  } catch (error) {
    logger.error('Error generating suggestions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate suggestions',
      tokenCode: generateTokenCode('chat', 'error'),
    });
  }
});

// Generate intelligent suggestions for a device
function generateIntelligentSuggestions(deviceId) {
  const suggestions = [];
  const devicePrefs = chatAI.devicePreferences.get(deviceId) || {};
  const deviceContext = chatAI.conversationContext.get(deviceId) || [];
  const otherDevices = Array.from(chatAI.devicePreferences.keys()).filter(id => id !== deviceId);

  // Theme suggestions
  if (!devicePrefs.theme && otherDevices.length > 0) {
    const popularTheme = getPopularPreference(otherDevices, 'theme');
    if (popularTheme) {
      suggestions.push({
        type: 'preference',
        category: 'theme',
        suggestion: `Try the ${popularTheme} theme - it's popular among your other devices`,
        confidence: 0.8,
      });
    }
  }

  // Feature suggestions based on usage patterns
  const recentTopics = deviceContext.slice(-10).map(ctx => ctx.analysis.intent);
  const topicCounts = {};
  recentTopics.forEach(topic => {
    topicCounts[topic] = (topicCounts[topic] || 0) + 1;
  });

  if (topicCounts['technical_support'] > 2) {
    suggestions.push({
      type: 'feature',
      category: 'support',
      suggestion: 'Consider checking out our comprehensive setup guide - it might answer your questions faster',
      confidence: 0.9,
    });
  }

  if (topicCounts['ui_preferences'] > 1) {
    suggestions.push({
      type: 'feature',
      category: 'customization',
      suggestion: 'Explore our advanced customization options - you seem to enjoy personalizing your experience',
      confidence: 0.85,
    });
  }

  // Cross-device optimization suggestions
  if (otherDevices.length > 0) {
    suggestions.push({
      type: 'optimization',
      category: 'cross_device',
      suggestion: `Optimize your experience by syncing preferences across all ${otherDevices.length + 1} devices`,
      confidence: 0.9,
    });
  }

  // New user suggestions
  if (deviceContext.length < 3) {
    suggestions.push({
      type: 'onboarding',
      category: 'getting_started',
      suggestion: 'Start with our setup wizard to get the most out of MyL.Zip',
      confidence: 0.95,
    });
  }

  return suggestions.sort((a, b) => b.confidence - a.confidence);
}

// Calculate device intelligence score
function calculateDeviceIntelligence(deviceId, preferences, context) {
  let score = 0;

  // Base score for being connected
  score += 10;

  // Preference diversity bonus
  const prefCount = Object.keys(preferences).length;
  score += prefCount * 5;

  // Activity level bonus
  score += Math.min(context.length * 2, 50);

  // Cross-device learning bonus
  const hasCrossDeviceData = chatAI.hasCrossDeviceInsights(deviceId);
  if (hasCrossDeviceData) {
    score += 25;
  }

  // Recent activity bonus
  const recentActivity = context.filter(ctx =>
    (Date.now() - ctx.timestamp) < 3600000, // Within last hour
  );
  score += recentActivity.length * 3;

  return Math.min(score, 100); // Cap at 100
}

// Get popular preference across devices
function getPopularPreference(deviceIds, preferenceType) {
  const preferences = deviceIds.map(id => {
    const devicePrefs = chatAI.devicePreferences.get(id) || {};
    return devicePrefs[preferenceType];
  }).filter(Boolean);

  if (preferences.length === 0) return null;

  // Count occurrences
  const counts = {};
  preferences.forEach(pref => {
    counts[pref] = (counts[pref] || 0) + 1;
  });

  // Return most popular
  return Object.entries(counts)
    .sort(([,a], [,b]) => b - a)[0][0];
}

module.exports = router;
