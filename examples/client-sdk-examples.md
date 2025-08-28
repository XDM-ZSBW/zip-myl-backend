# Myl.Zip Multi-Client Ecosystem - Client SDK Examples

This document provides comprehensive examples of how different client platforms can integrate with the Myl.Zip backend infrastructure.

## 🌐 Web Extensions (Chrome, Firefox, Safari, Edge)

### Basic Setup
```javascript
class MylZipWebExtension {
  constructor() {
    this.baseUrl = 'https://api.myl.zip';
    this.deviceId = this.getDeviceId();
    this.platform = 'web';
    this.version = '2.0.0';
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      'x-client-platform': this.platform,
      'x-client-version': this.version,
      'x-device-id': this.deviceId,
      ...options.headers
    };

    const response = await fetch(url, {
      ...options,
      headers
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  // Device Registration
  async registerDevice(deviceInfo) {
    return this.request('/api/v2/auth/device/register', {
      method: 'POST',
      body: JSON.stringify({
        deviceId: this.deviceId,
        deviceType: this.platform,
        deviceVersion: this.version,
        capabilities: ['markdown', 'real-time-sync', 'offline-storage'],
        ...deviceInfo
      })
    });
  }

  // Real-time Sync
  async setupWebSocket() {
    const ws = new WebSocket(`wss://api.myl.zip/ws?deviceId=${this.deviceId}`);
    
    ws.onopen = () => {
      console.log('WebSocket connected');
      // Send platform info
      ws.send(JSON.stringify({
        type: 'platform_info',
        payload: {
          platform: this.platform,
          version: this.version
        }
      }));
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      this.handleWebSocketMessage(message);
    };

    return ws;
  }

  // Sync Operations
  async syncChanges(changes) {
    return this.request('/api/v2/sync/push', {
      method: 'POST',
      body: JSON.stringify({
        changes,
        deviceId: this.deviceId,
        timestamp: new Date().toISOString()
      })
    });
  }

  async getChanges(since) {
    return this.request(`/api/v2/sync/changes?since=${since}`);
  }
}
```

## 💻 Desktop Applications (Obsidian, VS Code, Sublime Text)

### Obsidian Plugin Example
```typescript
import { Plugin, TFile, Notice } from 'obsidian';

export default class MylZipPlugin extends Plugin {
  private mylZipClient: MylZipDesktopClient;
  private syncInterval: NodeJS.Timeout;

  async onload() {
    this.mylZipClient = new MylZipDesktopClient();
    
    // Register device
    await this.mylZipClient.registerDevice({
      deviceType: 'obsidian',
      deviceVersion: this.manifest.version,
      capabilities: ['file-system', 'markdown-editing', 'plugin-system']
    });

    // Setup real-time sync
    await this.setupRealTimeSync();

    // Setup periodic sync
    this.syncInterval = setInterval(() => {
      this.performSync();
    }, 5 * 60 * 1000); // Every 5 minutes

    // Add commands
    this.addCommand({
      id: 'myl-zip-sync',
      name: 'Sync with Myl.Zip',
      callback: () => this.performSync()
    });
  }

  private async setupRealTimeSync() {
    const ws = await this.mylZipClient.connectWebSocket();
    
    ws.on('message', (data) => {
      const message = JSON.parse(data.toString());
      this.handleSyncMessage(message);
    });
  }

  private async performSync() {
    try {
      // Get local changes
      const localChanges = this.getLocalChanges();
      
      // Push to server
      await this.mylZipClient.syncChanges(localChanges);
      
      // Pull server changes
      const serverChanges = await this.mylZipClient.getChanges(this.lastSyncTime);
      
      // Apply server changes locally
      this.applyServerChanges(serverChanges);
      
      Notice('Sync completed successfully');
    } catch (error) {
      console.error('Sync failed:', error);
      Notice('Sync failed: ' + error.message);
    }
  }

  private getLocalChanges() {
    // Implementation to detect local file changes
    const changes = [];
    // ... detect changes in vault
    return changes;
  }

  private applyServerChanges(changes: any[]) {
    // Implementation to apply server changes locally
    changes.forEach(change => {
      // ... apply change to local files
    });
  }
}

class MylZipDesktopClient {
  private baseUrl = 'https://api.myl.zip';
  private deviceId: string;
  private platform = 'desktop';

  constructor() {
    this.deviceId = this.generateDeviceId();
  }

  async registerDevice(deviceInfo: any) {
    const response = await fetch(`${this.baseUrl}/api/v2/auth/device/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-client-platform': this.platform,
        'x-device-id': this.deviceId
      },
      body: JSON.stringify({
        deviceId: this.deviceId,
        deviceType: deviceInfo.deviceType,
        deviceVersion: deviceInfo.deviceVersion,
        capabilities: deviceInfo.capabilities
      })
    });

    return response.json();
  }

  async connectWebSocket() {
    const WebSocket = require('ws');
    const ws = new WebSocket(`${this.baseUrl.replace('https', 'wss')}/ws?deviceId=${this.deviceId}`);
    
    return new Promise((resolve, reject) => {
      ws.on('open', () => resolve(ws));
      ws.on('error', reject);
    });
  }

  async syncChanges(changes: any[]) {
    const response = await fetch(`${this.baseUrl}/api/v2/sync/push`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-client-platform': this.platform,
        'x-device-id': this.deviceId
      },
      body: JSON.stringify({
        changes,
        deviceId: this.deviceId,
        timestamp: new Date().toISOString()
      })
    });

    return response.json();
  }

  async getChanges(since: string) {
    const response = await fetch(`${this.baseUrl}/api/v2/sync/changes?since=${since}`);
    return response.json();
  }

  private generateDeviceId(): string {
    // Generate unique device ID for desktop app
    return 'desktop-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  }
}
```

## 📱 Mobile Applications (iOS Safari, Android Chrome)

### React Native Example
```typescript
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface MylZipMobileClient {
  deviceId: string;
  platform: 'ios' | 'android';
  baseUrl: string;
}

class MylZipMobileClient implements MylZipMobileClient {
  deviceId: string;
  platform: 'ios' | 'android';
  baseUrl: string;

  constructor(platform: 'ios' | 'android') {
    this.platform = platform;
    this.baseUrl = 'https://api.myl.zip';
    this.deviceId = this.getDeviceId();
  }

  async request(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      'x-client-platform': this.platform,
      'x-client-version': '2.0.0',
      'x-device-id': this.deviceId,
      ...options.headers
    };

    const response = await fetch(url, {
      ...options,
      headers
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  async registerDevice(deviceInfo: any) {
    return this.request('/api/v2/auth/device/register', {
      method: 'POST',
      body: JSON.stringify({
        deviceId: this.deviceId,
        deviceType: this.platform,
        deviceVersion: '2.0.0',
        capabilities: ['touch-optimized', 'offline-first', 'push-notifications'],
        ...deviceInfo
      })
    });
  }

  async syncOffline() {
    // Get offline changes from local storage
    const offlineChanges = await AsyncStorage.getItem('offlineChanges');
    
    if (offlineChanges) {
      try {
        await this.request('/api/v2/sync/push', {
          method: 'POST',
          body: JSON.stringify({
            changes: JSON.parse(offlineChanges),
            deviceId: this.deviceId,
            timestamp: new Date().toISOString()
          })
        });
        
        // Clear offline changes after successful sync
        await AsyncStorage.removeItem('offlineChanges');
      } catch (error) {
        console.error('Offline sync failed:', error);
      }
    }
  }

  async saveOffline(change: any) {
    // Save change to offline storage
    const offlineChanges = await AsyncStorage.getItem('offlineChanges') || '[]';
    const changes = JSON.parse(offlineChanges);
    changes.push(change);
    await AsyncStorage.setItem('offlineChanges', JSON.stringify(changes));
  }

  private getDeviceId(): string {
    // Generate or retrieve device ID
    return `${this.platform}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// React Native Component
const MylZipMobileApp: React.FC = () => {
  const [client, setClient] = useState<MylZipMobileClient | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const platform = Platform.OS as 'ios' | 'android';
    const mobileClient = new MylZipMobileClient(platform);
    setClient(mobileClient);

    // Register device on app start
    mobileClient.registerDevice({
      deviceInfo: {
        model: Platform.constants.Brand,
        osVersion: Platform.Version
      }
    }).then(() => {
      setIsConnected(true);
    }).catch(console.error);
  }, []);

  const handleSync = async () => {
    if (client) {
      try {
        await client.syncOffline();
        Alert.alert('Success', 'Offline changes synced successfully');
      } catch (error) {
        Alert.alert('Error', 'Sync failed: ' + error.message);
      }
    }
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Myl.Zip Mobile Client</Text>
      <Text>Status: {isConnected ? 'Connected' : 'Disconnected'}</Text>
      <TouchableOpacity onPress={handleSync}>
        <Text>Sync Offline Changes</Text>
      </TouchableOpacity>
    </View>
  );
};
```

## 🛠️ Development Tools (JetBrains IDEs, Eclipse, Vim/Neovim)

### VS Code Extension Example
```typescript
import * as vscode from 'vscode';
import * as WebSocket from 'ws';

export class MylZipVSCodeExtension {
  private client: MylZipDevClient;
  private ws: WebSocket | null = null;
  private syncStatusBarItem: vscode.StatusBarItem;

  constructor() {
    this.client = new MylZipDevClient();
    this.syncStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right);
    this.syncStatusBarItem.text = 'Myl.Zip';
    this.syncStatusBarItem.show();
  }

  async activate(context: vscode.ExtensionContext) {
    // Register device
    await this.client.registerDevice({
      deviceType: 'vscode',
      deviceVersion: context.extension.packageJSON.version,
      capabilities: ['ide-integration', 'workspace-management', 'extension-api']
    });

    // Setup WebSocket connection
    this.setupWebSocket();

    // Register commands
    const syncCommand = vscode.commands.registerCommand('mylzip.sync', () => {
      this.performSync();
    });

    const workspaceCommand = vscode.commands.registerCommand('mylzip.workspace', () => {
      this.showWorkspaceInfo();
    });

    context.subscriptions.push(syncCommand, workspaceCommand);

    // Watch for file changes
    const fileWatcher = vscode.workspace.createFileSystemWatcher('**/*.md');
    fileWatcher.onDidChange((uri) => {
      this.handleFileChange(uri);
    });

    context.subscriptions.push(fileWatcher);
  }

  private setupWebSocket() {
    this.ws = new WebSocket(`wss://api.myl.zip/ws?deviceId=${this.client.deviceId}`);
    
    this.ws.on('open', () => {
      this.syncStatusBarItem.text = 'Myl.Zip ✓';
      this.syncStatusBarItem.tooltip = 'Connected to Myl.Zip';
    });

    this.ws.on('message', (data) => {
      const message = JSON.parse(data.toString());
      this.handleWebSocketMessage(message);
    });

    this.ws.on('close', () => {
      this.syncStatusBarItem.text = 'Myl.Zip ✗';
      this.syncStatusBarItem.tooltip = 'Disconnected from Myl.Zip';
    });
  }

  private async performSync() {
    try {
      this.syncStatusBarItem.text = 'Myl.Zip ⟳';
      
      // Get workspace changes
      const changes = await this.getWorkspaceChanges();
      
      // Sync with server
      await this.client.syncChanges(changes);
      
      this.syncStatusBarItem.text = 'Myl.Zip ✓';
      vscode.window.showInformationMessage('Sync completed successfully');
    } catch (error) {
      this.syncStatusBarItem.text = 'Myl.Zip ✗';
      vscode.window.showErrorMessage('Sync failed: ' + error.message);
    }
  }

  private async getWorkspaceChanges() {
    const changes = [];
    const files = await vscode.workspace.findFiles('**/*.md');
    
    for (const file of files) {
      const content = await vscode.workspace.fs.readFile(file);
      changes.push({
        type: 'file_change',
        path: file.fsPath,
        content: content.toString(),
        timestamp: new Date().toISOString()
      });
    }
    
    return changes;
  }

  private handleFileChange(uri: vscode.Uri) {
    // Handle individual file changes
    this.client.queueChange({
      type: 'file_change',
      path: uri.fsPath,
      timestamp: new Date().toISOString()
    });
  }

  private async showWorkspaceInfo() {
    try {
      const workspaces = await this.client.getWorkspaces();
      const workspaceList = workspaces.map(w => `- ${w.name}: ${w.description}`).join('\n');
      
      vscode.window.showInformationMessage(`Workspaces:\n${workspaceList}`);
    } catch (error) {
      vscode.window.showErrorMessage('Failed to get workspace info: ' + error.message);
    }
  }

  private handleWebSocketMessage(message: any) {
    switch (message.type) {
      case 'sync_request':
        this.performSync();
        break;
      case 'workspace_update':
        this.handleWorkspaceUpdate(message.data);
        break;
      case 'plugin_event':
        this.handlePluginEvent(message.data);
        break;
    }
  }

  private handleWorkspaceUpdate(data: any) {
    // Handle workspace updates from other clients
    vscode.window.showInformationMessage(`Workspace updated: ${data.workspaceName}`);
  }

  private handlePluginEvent(data: any) {
    // Handle plugin events
    console.log('Plugin event:', data);
  }
}

class MylZipDevClient {
  deviceId: string;
  private baseUrl = 'https://api.myl.zip';
  private platform = 'development';
  private changeQueue: any[] = [];

  constructor() {
    this.deviceId = this.generateDeviceId();
  }

  async registerDevice(deviceInfo: any) {
    const response = await fetch(`${this.baseUrl}/api/v2/auth/device/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-client-platform': this.platform,
        'x-device-id': this.deviceId
      },
      body: JSON.stringify({
        deviceId: this.deviceId,
        deviceType: deviceInfo.deviceType,
        deviceVersion: deviceInfo.deviceVersion,
        capabilities: deviceInfo.capabilities
      })
    });

    return response.json();
  }

  async syncChanges(changes: any[]) {
    const response = await fetch(`${this.baseUrl}/api/v2/sync/push`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-client-platform': this.platform,
        'x-device-id': this.deviceId
      },
      body: JSON.stringify({
        changes,
        deviceId: this.deviceId,
        timestamp: new Date().toISOString()
      })
    });

    return response.json();
  }

  async getWorkspaces() {
    const response = await fetch(`${this.baseUrl}/api/v2/workspaces`, {
      headers: {
        'x-client-platform': this.platform,
        'x-device-id': this.deviceId
      }
    });

    return response.json();
  }

  queueChange(change: any) {
    this.changeQueue.push(change);
    
    // Auto-sync after 5 seconds of inactivity
    clearTimeout(this.syncTimeout);
    this.syncTimeout = setTimeout(() => {
      this.syncQueuedChanges();
    }, 5000);
  }

  private async syncQueuedChanges() {
    if (this.changeQueue.length > 0) {
      const changes = [...this.changeQueue];
      this.changeQueue = [];
      
      try {
        await this.syncChanges(changes);
      } catch (error) {
        console.error('Failed to sync queued changes:', error);
        // Re-queue failed changes
        this.changeQueue.unshift(...changes);
      }
    }
  }

  private generateDeviceId(): string {
    return 'dev-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  }
}
```

## 🏢 Enterprise Tools (Slack, Discord, Teams)

### Slack Bot Example
```typescript
import { App } from '@slack/bolt';
import { MylZipEnterpriseClient } from './mylzip-enterprise-client';

export class MylZipSlackBot {
  private app: App;
  private client: MylZipEnterpriseClient;

  constructor() {
    this.app = new App({
      token: process.env.SLACK_BOT_TOKEN,
      signingSecret: process.env.SLACK_SIGNING_SECRET
    });

    this.client = new MylZipEnterpriseClient();
    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    // Handle mentions
    this.app.event('app_mention', async ({ event, say }) => {
      const text = event.text.toLowerCase();
      
      if (text.includes('sync')) {
        await this.handleSyncRequest(event, say);
      } else if (text.includes('workspace')) {
        await this.handleWorkspaceRequest(event, say);
      } else if (text.includes('help')) {
        await this.showHelp(event, say);
      } else {
        await say('Hi! I can help you with Myl.Zip operations. Type "help" for more info.');
      }
    });

    // Handle slash commands
    this.app.command('/mylzip-sync', async ({ command, ack, respond }) => {
      await ack();
      await this.handleSlashSync(command, respond);
    });

    this.app.command('/mylzip-workspace', async ({ command, ack, respond }) => {
      await ack();
      await this.handleSlashWorkspace(command, respond);
    });
  }

  private async handleSyncRequest(event: any, say: any) {
    try {
      await say('🔄 Starting sync...');
      
      const result = await this.client.performSync();
      
      await say({
        text: '✅ Sync completed successfully!',
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Sync Results*\n• Files processed: ${result.processed}\n• Conflicts resolved: ${result.conflicts}\n• Duration: ${result.duration}ms`
            }
          }
        ]
      });
    } catch (error) {
      await say(`❌ Sync failed: ${error.message}`);
    }
  }

  private async handleWorkspaceRequest(event: any, say: any) {
    try {
      const workspaces = await this.client.getWorkspaces();
      
      const workspaceBlocks = workspaces.map(ws => ({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${ws.name}*\n${ws.description}\nType: ${ws.type}`
        }
      }));

      await say({
        text: '📁 Available Workspaces',
        blocks: workspaceBlocks
      });
    } catch (error) {
      await say(`❌ Failed to get workspaces: ${error.message}`);
    }
  }

  private async showHelp(event: any, say: any) {
    await say({
      text: '🤖 Myl.Zip Bot Help',
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '*Available Commands:*\n• `sync` - Sync your workspace\n• `workspace` - Show workspace info\n• `/mylzip-sync` - Slash command for sync\n• `/mylzip-workspace` - Slash command for workspace info'
          }
        }
      ]
    });
  }

  private async handleSlashSync(command: any, respond: any) {
    try {
      await respond('🔄 Starting sync...');
      
      const result = await this.client.performSync();
      
      await respond({
        text: '✅ Sync completed successfully!',
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Sync Results*\n• Files processed: ${result.processed}\n• Conflicts resolved: ${result.conflicts}\n• Duration: ${result.duration}ms`
            }
          }
        ]
      });
    } catch (error) {
      await respond(`❌ Sync failed: ${error.message}`);
    }
  }

  private async handleSlashWorkspace(command: any, respond: any) {
    try {
      const workspaces = await this.client.getWorkspaces();
      
      const workspaceBlocks = workspaces.map(ws => ({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${ws.name}*\n${ws.description}\nType: ${ws.type}`
        }
      }));

      await respond({
        text: '📁 Available Workspaces',
        blocks: workspaceBlocks
      });
    } catch (error) {
      await respond(`❌ Failed to get workspaces: ${error.message}`);
    }
  }

  async start() {
    await this.app.start(process.env.PORT || 3000);
    console.log('⚡️ Myl.Zip Slack bot is running!');
  }
}

class MylZipEnterpriseClient {
  private baseUrl = 'https://api.myl.zip';
  private deviceId: string;
  private platform = 'enterprise';
  private apiKey: string;

  constructor() {
    this.deviceId = this.generateDeviceId();
    this.apiKey = process.env.MYLZIP_API_KEY || '';
  }

  async performSync() {
    const startTime = Date.now();
    
    const response = await fetch(`${this.baseUrl}/api/v2/sync/full-sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-client-platform': this.platform,
        'x-device-id': this.deviceId,
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        deviceId: this.deviceId,
        force: false
      })
    });

    const result = await response.json();
    
    return {
      processed: result.data.processed || 0,
      conflicts: result.data.conflicts || 0,
      duration: Date.now() - startTime
    };
  }

  async getWorkspaces() {
    const response = await fetch(`${this.baseUrl}/api/v2/workspaces`, {
      headers: {
        'x-client-platform': this.platform,
        'x-device-id': this.deviceId,
        'Authorization': `Bearer ${this.apiKey}`
      }
    });

    const result = await response.json();
    return result.data.workspaces || [];
  }

  private generateDeviceId(): string {
    return 'enterprise-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  }
}

// Start the bot
if (require.main === module) {
  const bot = new MylZipSlackBot();
  bot.start().catch(console.error);
}
```

## 🔧 Testing and Integration

### Test Client for Development
```typescript
import { MylZipTestClient } from './mylzip-test-client';

class MylZipIntegrationTest {
  private client: MylZipTestClient;

  constructor() {
    this.client = new MylZipTestClient();
  }

  async runAllTests() {
    console.log('🧪 Starting Myl.Zip Integration Tests...\n');

    try {
      await this.testDeviceRegistration();
      await this.testAuthentication();
      await this.testSyncOperations();
      await this.testWebSocketConnection();
      await this.testWorkspaceOperations();
      await this.testPluginSystem();
      
      console.log('✅ All tests passed!');
    } catch (error) {
      console.error('❌ Test failed:', error);
      process.exit(1);
    }
  }

  private async testDeviceRegistration() {
    console.log('Testing device registration...');
    
    const result = await this.client.registerDevice({
      deviceType: 'test-client',
      deviceVersion: '1.0.0',
      capabilities: ['testing', 'integration']
    });

    if (!result.success) {
      throw new Error('Device registration failed');
    }
    
    console.log('✅ Device registration passed');
  }

  private async testAuthentication() {
    console.log('Testing authentication...');
    
    const result = await this.client.authenticate();
    
    if (!result.success) {
      throw new Error('Authentication failed');
    }
    
    console.log('✅ Authentication passed');
  }

  private async testSyncOperations() {
    console.log('Testing sync operations...');
    
    // Test sync push
    const pushResult = await this.client.syncChanges([
      { type: 'test', data: 'test-data', timestamp: new Date().toISOString() }
    ]);
    
    if (!pushResult.success) {
      throw new Error('Sync push failed');
    }
    
    // Test sync pull
    const pullResult = await this.client.getChanges(new Date().toISOString());
    
    if (!pullResult.success) {
      throw new Error('Sync pull failed');
    }
    
    console.log('✅ Sync operations passed');
  }

  private async testWebSocketConnection() {
    console.log('Testing WebSocket connection...');
    
    const ws = await this.client.connectWebSocket();
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('WebSocket connection timeout'));
      }, 5000);
      
      ws.on('open', () => {
        clearTimeout(timeout);
        ws.close();
        console.log('✅ WebSocket connection passed');
        resolve();
      });
      
      ws.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  private async testWorkspaceOperations() {
    console.log('Testing workspace operations...');
    
    // Test workspace creation
    const createResult = await this.client.createWorkspace({
      name: 'Test Workspace',
      description: 'Test workspace for integration testing',
      type: 'test'
    });
    
    if (!createResult.success) {
      throw new Error('Workspace creation failed');
    }
    
    // Test workspace retrieval
    const getResult = await this.client.getWorkspace(createResult.data.id);
    
    if (!getResult.success) {
      throw new Error('Workspace retrieval failed');
    }
    
    console.log('✅ Workspace operations passed');
  }

  private async testPluginSystem() {
    console.log('Testing plugin system...');
    
    // Test plugin discovery
    const pluginsResult = await this.client.getPlugins();
    
    if (!pluginsResult.success) {
      throw new Error('Plugin discovery failed');
    }
    
    // Test plugin installation
    if (pluginsResult.data.plugins.length > 0) {
      const pluginId = pluginsResult.data.plugins[0].id;
      const installResult = await this.client.installPlugin(pluginId);
      
      if (!installResult.success) {
        throw new Error('Plugin installation failed');
      }
    }
    
    console.log('✅ Plugin system passed');
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const test = new MylZipIntegrationTest();
  test.runAllTests().catch(console.error);
}
```

## 📚 Next Steps

1. **Install Dependencies**: Add the required packages for your platform
2. **Configure Environment**: Set up API endpoints and authentication
3. **Implement Core Features**: Start with basic sync and workspace operations
4. **Add Platform-Specific Features**: Implement platform-specific integrations
5. **Test Integration**: Use the test client to verify functionality
6. **Deploy and Monitor**: Deploy to production and monitor performance

For more information, see the [API Documentation](https://api.myl.zip/docs) and [Developer Guide](https://github.com/XDM-ZSBW/zip-myl-backend#developer-guide).
