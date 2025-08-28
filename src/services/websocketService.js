const WebSocket = require('ws');
const { logger } = require('../utils/logger');
const { authenticateDevice } = require('../middleware/auth');

/**
 * WebSocket Service for Real-time Communication
 * Supports multiple client platforms with platform-specific features
 */
class WebSocketService {
  constructor(server) {
    this.wss = new WebSocket.Server({ server });
    this.clients = new Map(); // deviceId -> WebSocket
    this.rooms = new Map(); // roomId -> Set of deviceIds
    this.heartbeats = new Map(); // deviceId -> last heartbeat
    
    this.setupWebSocketServer();
  }

  /**
   * Setup WebSocket server with event handlers
   */
  setupWebSocketServer() {
    this.wss.on('connection', (ws, req) => {
      this.handleConnection(ws, req);
    });

    // Heartbeat cleanup every 30 seconds
    setInterval(() => {
      this.cleanupDeadConnections();
    }, 30000);
  }

  /**
   * Handle new WebSocket connection
   */
  async handleConnection(ws, req) {
    try {
      // Extract device ID from query params or headers
      const deviceId = this.extractDeviceId(req);
      if (!deviceId) {
        ws.close(1008, 'Device ID required');
        return;
      }

      // Authenticate device (simplified for WebSocket)
      const isAuthenticated = await this.authenticateWebSocketConnection(deviceId, req);
      if (!isAuthenticated) {
        ws.close(1008, 'Authentication failed');
        return;
      }

      // Store client connection
      this.clients.set(deviceId, {
        ws,
        deviceId,
        platform: req.headers['x-client-platform'] || 'unknown',
        version: req.headers['x-client-version'] || '1.0.0',
        connectedAt: new Date(),
        lastHeartbeat: new Date()
      });

      // Send welcome message
      this.sendToClient(deviceId, {
        type: 'connection_established',
        data: {
          deviceId,
          timestamp: new Date().toISOString(),
          message: 'WebSocket connection established'
        }
      });

      // Setup message handlers
      ws.on('message', (data) => {
        this.handleMessage(deviceId, data);
      });

      ws.on('close', () => {
        this.handleDisconnection(deviceId);
      });

      ws.on('error', (error) => {
        logger.error(`WebSocket error for device ${deviceId}:`, error);
        this.handleDisconnection(deviceId);
      });

      ws.on('pong', () => {
        this.updateHeartbeat(deviceId);
      });

      // Setup ping/pong for heartbeat
      this.setupHeartbeat(ws, deviceId);

      logger.info(`WebSocket client connected: ${deviceId}`);
    } catch (error) {
      logger.error('WebSocket connection error:', error);
      ws.close(1011, 'Internal server error');
    }
  }

  /**
   * Extract device ID from request
   */
  extractDeviceId(req) {
    // Try query parameter first
    const url = new URL(req.url, `http://${req.headers.host}`);
    let deviceId = url.searchParams.get('deviceId');
    
    // Fallback to headers
    if (!deviceId) {
      deviceId = req.headers['x-device-id'];
    }
    
    return deviceId;
  }

  /**
   * Authenticate WebSocket connection
   */
  async authenticateWebSocketConnection(deviceId, req) {
    try {
      // For WebSocket, we'll do a simplified authentication
      // In production, you might want to validate a token or use a different method
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return false;
      }

      // TODO: Implement proper WebSocket authentication
      // This could involve validating a JWT token or API key
      return true;
    } catch (error) {
      logger.error(`WebSocket authentication error for device ${deviceId}:`, error);
      return false;
    }
  }

  /**
   * Handle incoming WebSocket messages
   */
  handleMessage(deviceId, data) {
    try {
      const message = JSON.parse(data.toString());
      const { type, payload, roomId, targetDeviceId } = message;

      switch (type) {
        case 'ping':
          this.handlePing(deviceId);
          break;
        case 'join_room':
          this.handleJoinRoom(deviceId, roomId);
          break;
        case 'leave_room':
          this.handleLeaveRoom(deviceId, roomId);
          break;
        case 'room_message':
          this.handleRoomMessage(deviceId, roomId, payload);
          break;
        case 'private_message':
          this.handlePrivateMessage(deviceId, targetDeviceId, payload);
          break;
        case 'sync_request':
          this.handleSyncRequest(deviceId, payload);
          break;
        case 'sync_response':
          this.handleSyncResponse(deviceId, payload);
          break;
        case 'plugin_event':
          this.handlePluginEvent(deviceId, payload);
          break;
        default:
          logger.warn(`Unknown WebSocket message type: ${type} from device ${deviceId}`);
      }
    } catch (error) {
      logger.error(`Error handling WebSocket message from device ${deviceId}:`, error);
      this.sendToClient(deviceId, {
        type: 'error',
        data: {
          message: 'Invalid message format',
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  /**
   * Handle ping message
   */
  handlePing(deviceId) {
    this.updateHeartbeat(deviceId);
    this.sendToClient(deviceId, {
      type: 'pong',
      data: {
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Handle room join request
   */
  handleJoinRoom(deviceId, roomId) {
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, new Set());
    }
    
    this.rooms.get(roomId).add(deviceId);
    
    // Notify other room members
    this.broadcastToRoom(roomId, {
      type: 'user_joined',
      data: {
        deviceId,
        roomId,
        timestamp: new Date().toISOString()
      }
    }, [deviceId]); // Exclude the joining user
    
    logger.info(`Device ${deviceId} joined room ${roomId}`);
  }

  /**
   * Handle room leave request
   */
  handleLeaveRoom(deviceId, roomId) {
    if (this.rooms.has(roomId)) {
      this.rooms.get(roomId).delete(deviceId);
      
      // Clean up empty rooms
      if (this.rooms.get(roomId).size === 0) {
        this.rooms.delete(roomId);
      }
      
      // Notify other room members
      this.broadcastToRoom(roomId, {
        type: 'user_left',
        data: {
          deviceId,
          roomId,
          timestamp: new Date().toISOString()
        }
      });
      
      logger.info(`Device ${deviceId} left room ${roomId}`);
    }
  }

  /**
   * Handle room message
   */
  handleRoomMessage(deviceId, roomId, payload) {
    if (this.rooms.has(roomId) && this.rooms.get(roomId).has(deviceId)) {
      this.broadcastToRoom(roomId, {
        type: 'room_message',
        data: {
          deviceId,
          roomId,
          message: payload.message,
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  /**
   * Handle private message
   */
  handlePrivateMessage(fromDeviceId, toDeviceId, payload) {
    if (this.clients.has(toDeviceId)) {
      this.sendToClient(toDeviceId, {
        type: 'private_message',
        data: {
          fromDeviceId,
          message: payload.message,
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  /**
   * Handle sync request
   */
  handleSyncRequest(deviceId, payload) {
    // TODO: Implement sync request handling
    logger.info(`Sync request from device ${deviceId}:`, payload);
    
    // Send sync response
    this.sendToClient(deviceId, {
      type: 'sync_response',
      data: {
        requestId: payload.requestId,
        status: 'processing',
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Handle sync response
   */
  handleSyncResponse(deviceId, payload) {
    // TODO: Implement sync response handling
    logger.info(`Sync response from device ${deviceId}:`, payload);
  }

  /**
   * Handle plugin event
   */
  handlePluginEvent(deviceId, payload) {
    // TODO: Implement plugin event handling
    logger.info(`Plugin event from device ${deviceId}:`, payload);
    
    // Broadcast plugin event to interested clients
    this.broadcastToClients({
      type: 'plugin_event',
      data: {
        deviceId,
        pluginId: payload.pluginId,
        event: payload.event,
        data: payload.data,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Send message to specific client
   */
  sendToClient(deviceId, message) {
    const client = this.clients.get(deviceId);
    if (client && client.ws.readyState === WebSocket.OPEN) {
      try {
        client.ws.send(JSON.stringify(message));
      } catch (error) {
        logger.error(`Error sending message to device ${deviceId}:`, error);
        this.handleDisconnection(deviceId);
      }
    }
  }

  /**
   * Broadcast message to all clients
   */
  broadcastToClients(message) {
    this.clients.forEach((client, deviceId) => {
      this.sendToClient(deviceId, message);
    });
  }

  /**
   * Broadcast message to room members
   */
  broadcastToRoom(roomId, message, excludeDeviceIds = []) {
    if (this.rooms.has(roomId)) {
      this.rooms.get(roomId).forEach(deviceId => {
        if (!excludeDeviceIds.includes(deviceId)) {
          this.sendToClient(deviceId, message);
        }
      });
    }
  }

  /**
   * Setup heartbeat for client
   */
  setupHeartbeat(ws, deviceId) {
    const heartbeatInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.ping();
      } else {
        clearInterval(heartbeatInterval);
      }
    }, 25000); // Send ping every 25 seconds
  }

  /**
   * Update client heartbeat
   */
  updateHeartbeat(deviceId) {
    const client = this.clients.get(deviceId);
    if (client) {
      client.lastHeartbeat = new Date();
      this.heartbeats.set(deviceId, new Date());
    }
  }

  /**
   * Clean up dead connections
   */
  cleanupDeadConnections() {
    const now = new Date();
    const timeout = 60000; // 60 seconds

    this.clients.forEach((client, deviceId) => {
      const timeSinceHeartbeat = now - client.lastHeartbeat;
      if (timeSinceHeartbeat > timeout) {
        logger.warn(`Device ${deviceId} heartbeat timeout, closing connection`);
        this.handleDisconnection(deviceId);
      }
    });
  }

  /**
   * Handle client disconnection
   */
  handleDisconnection(deviceId) {
    // Remove from all rooms
    this.rooms.forEach((roomMembers, roomId) => {
      if (roomMembers.has(deviceId)) {
        roomMembers.delete(deviceId);
        if (roomMembers.size === 0) {
          this.rooms.delete(roomId);
        } else {
          // Notify other room members
          this.broadcastToRoom(roomId, {
            type: 'user_disconnected',
            data: {
              deviceId,
              roomId,
              timestamp: new Date().toISOString()
            }
          });
        }
      }
    });

    // Clean up client data
    this.clients.delete(deviceId);
    this.heartbeats.delete(deviceId);

    logger.info(`WebSocket client disconnected: ${deviceId}`);
  }

  /**
   * Get connection statistics
   */
  getStats() {
    return {
      totalConnections: this.clients.size,
      totalRooms: this.rooms.size,
      connections: Array.from(this.clients.values()).map(client => ({
        deviceId: client.deviceId,
        platform: client.platform,
        version: client.version,
        connectedAt: client.connectedAt,
        lastHeartbeat: client.lastHeartbeat
      })),
      rooms: Array.from(this.rooms.entries()).map(([roomId, members]) => ({
        roomId,
        memberCount: members.size,
        members: Array.from(members)
      }))
    };
  }
}

module.exports = WebSocketService;
