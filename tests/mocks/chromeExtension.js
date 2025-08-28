/**
 * Chrome Extension Mock Environment
 * Provides realistic Chrome extension APIs for testing
 */

// Mock Chrome extension runtime
const mockRuntime = {
  id: 'test-extension-id-1234567890abcdef',
  getManifest: jest.fn(() => ({
    name: 'Myl.Zip Extension',
    version: '2.0.0',
    permissions: ['https://api.myl.zip/*'],
    host_permissions: ['https://api.myl.zip/*'],
  })),
  sendMessage: jest.fn(),
  onMessage: {
    addListener: jest.fn(),
    removeListener: jest.fn(),
  },
  onConnect: {
    addListener: jest.fn(),
    removeListener: jest.fn(),
  },
  connect: jest.fn(() => ({
    postMessage: jest.fn(),
    onMessage: { addListener: jest.fn() },
    onDisconnect: { addListener: jest.fn() },
    disconnect: jest.fn(),
  })),
};

// Mock Chrome extension tabs
const mockTabs = {
  query: jest.fn((queryInfo, callback) => {
    const mockTabs = [
      {
        id: 1,
        url: 'https://github.com',
        title: 'GitHub',
        active: true,
        windowId: 1,
      },
      {
        id: 2,
        url: 'https://google.com',
        title: 'Google',
        active: false,
        windowId: 1,
      },
    ];

    if (callback) {
      callback(mockTabs);
    }
    return Promise.resolve(mockTabs);
  }),
  get: jest.fn((tabId, callback) => {
    const mockTab = {
      id: tabId,
      url: 'https://example.com',
      title: 'Example Page',
      active: true,
    };

    if (callback) {
      callback(mockTab);
    }
    return Promise.resolve(mockTab);
  }),
  update: jest.fn(),
  create: jest.fn(),
  remove: jest.fn(),
};

// Mock Chrome extension storage
const mockStorage = {
  local: {
    get: jest.fn((keys, callback) => {
      const mockData = {
        deviceId: 'test-device-123',
        extensionSettings: {
          theme: 'dark',
          autoSync: true,
          nftFormat: 'uuid',
        },
        pairingCodes: [],
        trustedDevices: [],
      };

      if (callback) {
        callback(mockData);
      }
      return Promise.resolve(mockData);
    }),
    set: jest.fn((data, callback) => {
      if (callback) {
        callback();
      }
      return Promise.resolve();
    }),
    remove: jest.fn((keys, callback) => {
      if (callback) {
        callback();
      }
      return Promise.resolve();
    }),
    clear: jest.fn((callback) => {
      if (callback) {
        callback();
      }
      return Promise.resolve();
    }),
  },
  sync: {
    get: jest.fn(),
    set: jest.fn(),
    remove: jest.fn(),
    clear: jest.fn(),
  },
};

// Mock Chrome extension permissions
const mockPermissions = {
  contains: jest.fn((permissions, callback) => {
    const hasPermission = permissions.every(permission =>
      permission.includes('https://api.myl.zip/*'),
    );

    if (callback) {
      callback(hasPermission);
    }
    return Promise.resolve(hasPermission);
  }),
  request: jest.fn((permissions, callback) => {
    if (callback) {
      callback(true);
    }
    return Promise.resolve(true);
  }),
  getAll: jest.fn((callback) => {
    const allPermissions = [
      'https://api.myl.zip/*',
      'storage',
      'activeTab',
    ];

    if (callback) {
      callback(allPermissions);
    }
    return Promise.resolve(allPermissions);
  }),
};

// Mock Chrome extension webNavigation
const mockWebNavigation = {
  onCompleted: {
    addListener: jest.fn(),
    removeListener: jest.fn(),
  },
  onBeforeNavigate: {
    addListener: jest.fn(),
    removeListener: jest.fn(),
  },
  getFrame: jest.fn(),
};

// Mock Chrome extension contextMenus
const mockContextMenus = {
  create: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
  removeAll: jest.fn(),
  onClicked: {
    addListener: jest.fn(),
    removeListener: jest.fn(),
  },
};

// Mock Chrome extension notifications
const mockNotifications = {
  create: jest.fn((options, callback) => {
    const notificationId = `notification_${Date.now()}`;
    if (callback) {
      callback(notificationId);
    }
    return Promise.resolve(notificationId);
  }),
  update: jest.fn(),
  clear: jest.fn(),
  getAll: jest.fn(),
  getPermissionLevel: jest.fn(() => Promise.resolve('granted')),
};

// Mock Chrome extension alarms
const mockAlarms = {
  create: jest.fn(),
  get: jest.fn(),
  getAll: jest.fn(),
  clear: jest.fn(),
  clearAll: jest.fn(),
  onAlarm: {
    addListener: jest.fn(),
    removeListener: jest.fn(),
  },
};

// Mock Chrome extension i18n
const mockI18n = {
  getMessage: jest.fn((messageName, substitutions) => {
    const messages = {
      'extensionName': 'Myl.Zip Extension',
      'pairingCodeGenerated': 'Pairing code generated successfully',
      'deviceRegistered': 'Device registered successfully',
      'errorOccurred': 'An error occurred',
    };

    return messages[messageName] || messageName;
  }),
  getUILanguage: jest.fn(() => 'en'),
  detectLanguage: jest.fn(() => Promise.resolve(['en'])),
};

// Main Chrome mock object
const mockChrome = {
  runtime: mockRuntime,
  tabs: mockTabs,
  storage: mockStorage,
  permissions: mockPermissions,
  webNavigation: mockWebNavigation,
  contextMenus: mockContextMenus,
  notifications: mockNotifications,
  alarms: mockAlarms,
  i18n: mockI18n,
};

// Extension-specific test utilities
const extensionTestUtils = {
  /**
   * Create a mock extension request
   */
  createExtensionRequest: (extensionId = mockRuntime.id, endpoint, data = {}) => ({
    headers: {
      'x-extension-id': extensionId,
      'x-extension-version': '2.0.0',
      'x-client-type': 'chrome-extension',
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
    body: data,
    url: endpoint,
  }),

  /**
   * Create a mock extension context
   */
  createExtensionContext: (overrides = {}) => ({
    extensionId: mockRuntime.id,
    version: '2.0.0',
    permissions: ['https://api.myl.zip/*'],
    storage: mockStorage.local,
    ...overrides,
  }),

  /**
   * Mock extension storage data
   */
  mockStorageData: (data = {}) => {
    const defaultData = {
      deviceId: 'test-device-123',
      extensionSettings: {
        theme: 'dark',
        autoSync: true,
        nftFormat: 'uuid',
        pairingCodeFormat: 'uuid',
      },
      pairingCodes: [],
      trustedDevices: [],
      nftCollection: [],
    };

    mockStorage.local.get.mockResolvedValue({ ...defaultData, ...data });
    return { ...defaultData, ...data };
  },

  /**
   * Reset all mocks
   */
  resetMocks: () => {
    jest.clearAllMocks();
    mockStorage.local.get.mockClear();
    mockStorage.local.set.mockClear();
    mockTabs.query.mockClear();
    mockRuntime.sendMessage.mockClear();
  },

  /**
   * Verify extension permissions
   */
  verifyPermissions: (requiredPermissions) => {
    return mockPermissions.contains(requiredPermissions);
  },

  /**
   * Simulate extension message
   */
  simulateMessage: (message, sender, sendResponse) => {
    const listeners = mockRuntime.onMessage.addListener.mock.calls;
    listeners.forEach(([listener]) => {
      if (typeof listener === 'function') {
        listener(message, sender, sendResponse);
      }
    });
  },
};

// Set up global Chrome mock
if (typeof global !== 'undefined') {
  global.chrome = mockChrome;
}

// Export for use in tests
module.exports = {
  mockChrome,
  mockRuntime,
  mockTabs,
  mockStorage,
  mockPermissions,
  mockWebNavigation,
  mockContextMenus,
  mockNotifications,
  mockAlarms,
  mockI18n,
  extensionTestUtils,
};
