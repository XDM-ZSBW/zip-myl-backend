// Myl.Zip Chromium Extension - Content Script
// Intelligent thought tracking and typing-aware assistance for web pages

class MylZipContentScript {
  constructor() {
    this.settings = null;
    this.currentThought = '';
    this.typingCount = 0;
    this.lastTypingTime = 0;
    this.typingTimer = null;
    this.analysisTimer = null;
    this.visualIndicator = null;
    this.popupOverlay = null;
    this.cursorIndicator = null;
    this.mousePosition = { x: 0, y: 0 };
    this.focusedElement = null;
    this.isTyping = false;
    this.thoughtBuffer = '';
    this.runOnThoughtScore = 0;
    this.fab = null;
    this.fabContextMenu = null;
    this.serviceEnabled = true;
    
    this.init();
  }

  async init() {
    console.log('Myl.Zip Content Script: Initializing...');
    
    // Load settings
    await this.loadSettings();
    
    // Setup event listeners
    this.setupEventListeners();
    
    // Setup visual indicators
    this.setupVisualIndicators();
    
    // Setup FAB (Floating Action Button)
    this.setupFAB();
    
    // Setup sensor tracking
    this.setupSensorTracking();
    
    // Initialize thought tracking
    this.initializeThoughtTracking();
    
    console.log('Myl.Zip Content Script: Ready');
  }

  async loadSettings() {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' });
      this.settings = response.settings;
      console.log('Settings loaded:', this.settings);
    } catch (error) {
      console.error('Error loading settings:', error);
      this.settings = this.getDefaultSettings();
    }
  }

  getDefaultSettings() {
    return {
      typingThreshold: 100,
      enableTypingIndicator: true,
      enableTypingAwareService: true,
      typingAnalysisDelay: 500,
      enablePopupOverlay: true,
      enableVisualFeedback: true,
      enableSoundFeedback: false,
      enableRunOnThoughtDetection: true,
      runOnThoughtThreshold: 50,
      enableCursorProximityIndicators: true,
      proximityIndicatorStyle: 'pulse',
      responseTriggerKeywords: ['help', 'assist', 'guide', 'suggest', 'recommend'],
      enableThoughtTracking: true,
      maxThoughtLength: 1000
    };
  }

  setupEventListeners() {
    // Input events for thought tracking
    document.addEventListener('input', (event) => {
      this.handleInput(event);
    }, true);

    document.addEventListener('keydown', (event) => {
      this.handleKeyDown(event);
    }, true);

    document.addEventListener('keyup', (event) => {
      this.handleKeyUp(event);
    }, true);

    // Focus events
    document.addEventListener('focusin', (event) => {
      this.handleFocusIn(event);
    }, true);

    document.addEventListener('focusout', (event) => {
      this.handleFocusOut(event);
    }, true);

    // Mouse events for sensor tracking
    document.addEventListener('mousemove', (event) => {
      this.handleMouseMove(event);
    }, true);

    // Scroll events
    document.addEventListener('scroll', (event) => {
      this.handleScroll(event);
    }, true);

    // Page visibility changes
    document.addEventListener('visibilitychange', () => {
      this.handleVisibilityChange();
    });

    // Before page unload - save current thought
    window.addEventListener('beforeunload', () => {
      this.saveCurrentThought();
    });

    // Message handling from background script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true;
    });
  }

  setupVisualIndicators() {
    // Create visual indicator container
    this.visualIndicator = document.createElement('div');
    this.visualIndicator.id = 'myl-zip-visual-indicator';
    this.visualIndicator.className = 'myl-zip-indicator';
    document.body.appendChild(this.visualIndicator);

    // Create popup overlay container
    this.popupOverlay = document.createElement('div');
    this.popupOverlay.id = 'myl-zip-popup-overlay';
    this.popupOverlay.className = 'myl-zip-overlay';
    document.body.appendChild(this.popupOverlay);

    // Create cursor proximity indicator
    this.cursorIndicator = document.createElement('div');
    this.cursorIndicator.id = 'myl-zip-cursor-indicator';
    this.cursorIndicator.className = 'myl-zip-cursor-indicator';
    document.body.appendChild(this.cursorIndicator);
  }

  setupFAB() {
    // Create FAB (Floating Action Button)
    this.fab = document.createElement('button');
    this.fab.id = 'myl-zip-fab';
    this.fab.className = 'myl-zip-fab enabled';
    this.fab.setAttribute('aria-label', 'Myl.Zip Service Control');
    this.fab.setAttribute('title', 'Click to pause/enable service, right-click for options');
    
    // Create FAB icon
    const fabIcon = document.createElement('span');
    fabIcon.className = 'myl-zip-fab-icon';
    this.fab.appendChild(fabIcon);
    
    // Create FAB tooltip
    const fabTooltip = document.createElement('div');
    fabTooltip.className = 'myl-zip-fab-tooltip';
    fabTooltip.textContent = 'Service Active - Click to pause';
    this.fab.appendChild(fabTooltip);
    
    // Create FAB context menu
    this.fabContextMenu = document.createElement('div');
    this.fabContextMenu.id = 'myl-zip-fab-context-menu';
    this.fabContextMenu.className = 'myl-zip-fab-context-menu';
    this.fabContextMenu.innerHTML = `
      <div class="myl-zip-fab-context-item" data-action="toggle-service">
        <span class="myl-zip-fab-context-icon">⏸</span>
        <span class="myl-zip-fab-context-label">Toggle Service</span>
        <span class="myl-zip-fab-context-shortcut">Ctrl+Shift+Z</span>
      </div>
      <div class="myl-zip-fab-context-item" data-action="open-settings">
        <span class="myl-zip-fab-context-icon">⚙️</span>
        <span class="myl-zip-fab-context-label">Settings</span>
        <span class="myl-zip-fab-context-shortcut">Ctrl+Shift+S</span>
      </div>
      <div class="myl-zip-fab-context-item" data-action="reset-counter">
        <span class="myl-zip-fab-context-icon">🔄</span>
        <span class="myl-zip-fab-context-label">Reset Counter</span>
        <span class="myl-zip-fab-context-shortcut">Ctrl+Shift+R</span>
      </div>
      <div class="myl-zip-fab-context-item" data-action="show-help">
        <span class="myl-zip-fab-context-icon">❓</span>
        <span class="myl-zip-fab-context-label">Help</span>
      </div>
    `;
    
    document.body.appendChild(this.fab);
    document.body.appendChild(this.fabContextMenu);
    
    // Setup FAB event listeners
    this.setupFABEventListeners();
    
    // Update FAB state
    this.updateFABState();
  }

  setupFABEventListeners() {
    // Left click - toggle service
    this.fab.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.toggleService();
    });
    
    // Right click - show context menu
    this.fab.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.showFABContextMenu(e);
    });
    
    // Context menu item clicks
    this.fabContextMenu.addEventListener('click', (e) => {
      const action = e.target.closest('.myl-zip-fab-context-item')?.dataset.action;
      if (action) {
        this.handleFABContextAction(action);
        this.hideFABContextMenu();
      }
    });
    
    // Hide context menu when clicking outside
    document.addEventListener('click', (e) => {
      if (!this.fab.contains(e.target) && !this.fabContextMenu.contains(e.target)) {
        this.hideFABContextMenu();
      }
    });
    
    // Hide context menu on escape key, center on Ctrl+Shift+C
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.hideFABContextMenu();
      } else if (e.ctrlKey && e.shiftKey && e.key === 'C') {
        // Manual center command for debugging
        if (this.fabContextMenu.classList.contains('show')) {
          this.centerFABContextMenu();
        }
      }
    });
  }

  toggleService() {
    this.serviceEnabled = !this.serviceEnabled;
    this.updateFABState();
    
    // Send message to background script
    chrome.runtime.sendMessage({ 
      type: 'TOGGLE_SERVICE' 
    }).catch(error => {
      console.log('Could not toggle service:', error);
    });
    
    // Show notification
    this.showNotification(
      this.serviceEnabled ? 'Service Enabled' : 'Service Paused',
      this.serviceEnabled ? 'Myl.Zip is now active' : 'Myl.Zip is paused'
    );
  }

  showFABContextMenu(event) {
    // Position context menu
    const fabRect = this.fab.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Show menu first to get proper dimensions
    this.fabContextMenu.style.visibility = 'hidden';
    this.fabContextMenu.style.display = 'block';
    this.fabContextMenu.classList.add('show');
    
    // Get actual menu dimensions
    const menuRect = this.fabContextMenu.getBoundingClientRect();
    const menuWidth = menuRect.width || 200; // fallback width
    const menuHeight = menuRect.height || 150; // fallback height
    
    // Calculate initial position (above FAB, right-aligned)
    let top = fabRect.top - menuHeight - 8;
    let left = fabRect.right - menuWidth;
    
    // Adjust if menu would go off screen
    if (top < 0) {
      // Position below FAB instead
      top = fabRect.bottom + 8;
    }
    
    if (left < 0) {
      // Align to left edge of FAB
      left = fabRect.left;
    }
    
    // Ensure menu doesn't go off right edge
    if (left + menuWidth > viewportWidth) {
      left = viewportWidth - menuWidth - 8;
    }
    
    // Ensure menu doesn't go off bottom edge
    if (top + menuHeight > viewportHeight) {
      top = viewportHeight - menuHeight - 8;
    }
    
    // Apply final position with safety margins
    const finalTop = Math.max(8, Math.min(top, viewportHeight - menuHeight - 8));
    const finalLeft = Math.max(8, Math.min(left, viewportWidth - menuWidth - 8));
    
    this.fabContextMenu.style.top = `${finalTop}px`;
    this.fabContextMenu.style.left = `${finalLeft}px`;
    this.fabContextMenu.style.visibility = 'visible';
    
    // Debug logging
    console.log('FAB Context Menu positioned:', {
      fabRect,
      menuWidth,
      menuHeight,
      viewportWidth,
      viewportHeight,
      finalTop,
      finalLeft
    });
  }

  hideFABContextMenu() {
    this.fabContextMenu.classList.remove('show');
  }

  // Fallback method to center menu on screen if positioning fails
  centerFABContextMenu() {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const menuWidth = 200; // fallback width
    const menuHeight = 150; // fallback height
    
    const centerTop = (viewportHeight - menuHeight) / 2;
    const centerLeft = (viewportWidth - menuWidth) / 2;
    
    this.fabContextMenu.style.top = `${Math.max(8, centerTop)}px`;
    this.fabContextMenu.style.left = `${Math.max(8, centerLeft)}px`;
    this.fabContextMenu.style.visibility = 'visible';
    
    console.log('FAB Context Menu centered on screen as fallback');
  }

  handleFABContextAction(action) {
    switch (action) {
      case 'toggle-service':
        this.toggleService();
        break;
      case 'open-settings':
        this.openQuickSettings();
        break;
      case 'reset-counter':
        this.resetThoughtCounter();
        break;
      case 'show-help':
        this.showHelp();
        break;
    }
  }

  updateFABState() {
    // Remove all state classes
    this.fab.classList.remove('enabled', 'disabled', 'paused');
    
    // Add appropriate state class
    if (this.serviceEnabled) {
      this.fab.classList.add('enabled');
      this.fab.querySelector('.myl-zip-fab-tooltip').textContent = 'Service Active - Click to pause';
    } else {
      this.fab.classList.add('paused');
      this.fab.querySelector('.myl-zip-fab-tooltip').textContent = 'Service Paused - Click to enable';
    }
    
    // Update context menu toggle text
    const toggleItem = this.fabContextMenu.querySelector('[data-action="toggle-service"] .myl-zip-fab-context-label');
    if (toggleItem) {
      toggleItem.textContent = this.serviceEnabled ? 'Pause Service' : 'Enable Service';
    }
  }

  showNotification(title, message) {
    // Create temporary notification
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(135deg, #4a9eff 0%, #357abd 100%);
      color: white;
      padding: 16px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 16px rgba(74, 158, 255, 0.3);
      z-index: 2147483649;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      max-width: 300px;
      animation: slideInRight 0.3s ease-out;
    `;
    
    notification.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 4px;">${title}</div>
      <div>${message}</div>
    `;
    
    // Add animation keyframes
    if (!document.querySelector('#myl-zip-notification-styles')) {
      const style = document.createElement('style');
      style.id = 'myl-zip-notification-styles';
      style.textContent = `
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOutRight {
          from { transform: translateX(0); opacity: 1; }
          to { transform: translateX(100%); opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }
    
    document.body.appendChild(notification);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
      notification.style.animation = 'slideOutRight 0.3s ease-in';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 3000);
  }

  showHelp() {
    // Create help overlay
    const helpOverlay = document.createElement('div');
    helpOverlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      z-index: 2147483650;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;
    
    helpOverlay.innerHTML = `
      <div style="
        background: white;
        border-radius: 12px;
        padding: 24px;
        max-width: 500px;
        max-height: 80vh;
        overflow-y: auto;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
      ">
        <h2 style="margin: 0 0 16px 0; color: #4a9eff;">Myl.Zip Help</h2>
        <div style="line-height: 1.6; color: #333;">
          <h3>Floating Action Button (FAB)</h3>
          <ul>
            <li><strong>Left Click:</strong> Toggle service on/off</li>
            <li><strong>Right Click:</strong> Show context menu with all options</li>
          </ul>
          
          <h3>Keyboard Shortcuts</h3>
          <ul>
            <li><strong>Ctrl+Shift+Z:</strong> Toggle service</li>
            <li><strong>Ctrl+Shift+S:</strong> Open settings</li>
            <li><strong>Ctrl+Shift+R:</strong> Reset thought counter</li>
          </ul>
          
          <h3>Visual Indicators</h3>
          <ul>
            <li><strong>Green:</strong> Service active, low activity</li>
            <li><strong>Orange:</strong> Service active, medium activity</li>
            <li><strong>Red:</strong> Service active, high activity</li>
            <li><strong>Gray:</strong> Service paused</li>
          </ul>
        </div>
        <button onclick="this.closest('.myl-zip-help-overlay').remove()" style="
          margin-top: 16px;
          padding: 8px 16px;
          background: #4a9eff;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
        ">Close</button>
      </div>
    `;
    
    helpOverlay.className = 'myl-zip-help-overlay';
    document.body.appendChild(helpOverlay);
    
    // Close on background click
    helpOverlay.addEventListener('click', (e) => {
      if (e.target === helpOverlay) {
        helpOverlay.remove();
      }
    });
  }

  setupSensorTracking() {
    if (!this.settings.enableMouseTracking) return;

    // Track mouse movement for attention detection
    let mouseIdleTimer = null;
    
    document.addEventListener('mousemove', () => {
      clearTimeout(mouseIdleTimer);
      mouseIdleTimer = setTimeout(() => {
        this.handleMouseIdle();
      }, 5000); // 5 seconds of inactivity
    });
  }

  initializeThoughtTracking() {
    // Find all text input elements
    const textInputs = document.querySelectorAll('input[type="text"], input[type="email"], input[type="password"], textarea, [contenteditable="true"]');
    
    textInputs.forEach(input => {
      this.setupInputTracking(input);
    });

    // Monitor for dynamically added inputs
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const inputs = node.querySelectorAll ? node.querySelectorAll('input[type="text"], input[type="email"], input[type="password"], textarea, [contenteditable="true"]') : [];
            inputs.forEach(input => this.setupInputTracking(input));
          }
        });
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  setupInputTracking(input) {
    // Add data attribute to track if already processed
    if (input.dataset.mylZipTracked) return;
    input.dataset.mylZipTracked = 'true';

    // Add visual feedback class
    input.classList.add('myl-zip-tracked-input');
  }

  handleInput(event) {
    if (!this.settings.enableThoughtTracking || !this.serviceEnabled) return;

    const target = event.target;
    if (!this.isTextInput(target)) return;

    this.isTyping = true;
    this.typingCount++;
    this.lastTypingTime = Date.now();

    // Update current thought
    this.currentThought = target.value || target.textContent || '';
    this.thoughtBuffer += event.data || '';

    // Update visual indicator
    this.updateVisualIndicator();

    // Clear existing timers
    if (this.typingTimer) {
      clearTimeout(this.typingTimer);
    }

    if (this.analysisTimer) {
      clearTimeout(this.analysisTimer);
    }

    // Set timer to stop typing detection
    this.typingTimer = setTimeout(() => {
      this.isTyping = false;
      this.saveCurrentThought();
    }, 2000);

    // Set timer for typing analysis
    this.analysisTimer = setTimeout(() => {
      this.analyzeTypingActivity(target);
    }, this.settings.typingAnalysisDelay);

    // Send typing activity to background
    this.sendTypingActivity(target);
  }

  handleKeyDown(event) {
    // Handle special key combinations
    if (event.ctrlKey && event.shiftKey) {
      switch (event.key) {
        case 'Z':
          event.preventDefault();
          this.handleLeftHandAction();
          break;
        case 'M':
          event.preventDefault();
          this.handleRightHandAction();
          break;
        case 'S':
          event.preventDefault();
          this.openQuickSettings();
          break;
        case 'R':
          event.preventDefault();
          this.resetThoughtCounter();
          break;
      }
    }
  }

  handleKeyUp(event) {
    // Update visual indicator on key release
    if (this.isTextInput(event.target)) {
      this.updateVisualIndicator();
    }
  }

  handleFocusIn(event) {
    this.focusedElement = event.target;
    
    if (this.isTextInput(event.target)) {
      // Load previous thought for this element
      this.loadThoughtForElement(event.target);
    }
  }

  handleFocusOut(event) {
    if (this.isTextInput(event.target)) {
      // Save current thought
      this.saveCurrentThought();
    }
    
    this.focusedElement = null;
  }

  handleMouseMove(event) {
    this.mousePosition = { x: event.clientX, y: event.clientY };
    
    // Update cursor proximity indicator position
    if (this.cursorIndicator && this.cursorIndicator.style.display !== 'none') {
      this.updateCursorIndicatorPosition();
    }
  }

  handleScroll(event) {
    // Update visual indicators position on scroll
    this.updateVisualIndicatorPosition();
  }

  handleVisibilityChange() {
    if (document.hidden) {
      // Save current thought when page becomes hidden
      this.saveCurrentThought();
    }
  }

  handleMouseIdle() {
    // Handle mouse idle state
    if (this.isTyping) {
      this.saveCurrentThought();
    }
  }

  isTextInput(element) {
    if (!element) return false;
    
    const tagName = element.tagName.toLowerCase();
    const type = element.type ? element.type.toLowerCase() : '';
    
    return (
      tagName === 'textarea' ||
      tagName === 'input' && ['text', 'email', 'password', 'search', 'url'].includes(type) ||
      element.contentEditable === 'true' ||
      element.classList.contains('myl-zip-tracked-input')
    );
  }

  updateVisualIndicator() {
    if (!this.settings.enableVisualFeedback || !this.visualIndicator) return;

    const length = this.currentThought.length;
    let indicatorClass = 'myl-zip-indicator-low';
    let pulseIntensity = 1;

    // If service is disabled, show disabled state
    if (!this.serviceEnabled) {
      indicatorClass = 'myl-zip-indicator-disabled';
      pulseIntensity = 0;
    } else if (length > 0) {
      if (length < 100) {
        indicatorClass = 'myl-zip-indicator-low';
        pulseIntensity = 1;
      } else if (length < 500) {
        indicatorClass = 'myl-zip-indicator-medium';
        pulseIntensity = 2;
      } else {
        indicatorClass = 'myl-zip-indicator-high';
        pulseIntensity = 3;
      }
    }

    // Update indicator class and position
    this.visualIndicator.className = `myl-zip-indicator ${indicatorClass}`;
    this.visualIndicator.style.setProperty('--pulse-intensity', pulseIntensity);
    
    // Show indicator if there's content or service is disabled
    if (length > 0 || !this.serviceEnabled) {
      this.visualIndicator.style.display = 'block';
      this.updateVisualIndicatorPosition();
    } else {
      this.visualIndicator.style.display = 'none';
    }
  }

  updateVisualIndicatorPosition() {
    if (!this.visualIndicator || this.visualIndicator.style.display === 'none') return;

    // Position indicator near focused element or cursor
    let x = this.mousePosition.x;
    let y = this.mousePosition.y;

    if (this.focusedElement) {
      const rect = this.focusedElement.getBoundingClientRect();
      x = rect.right + 10;
      y = rect.top;
    }

    // Ensure indicator stays within viewport
    const indicatorRect = this.visualIndicator.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    if (x + indicatorRect.width > viewportWidth) {
      x = viewportWidth - indicatorRect.width - 10;
    }
    if (y + indicatorRect.height > viewportHeight) {
      y = viewportHeight - indicatorRect.height - 10;
    }
    if (x < 10) x = 10;
    if (y < 10) y = 10;

    this.visualIndicator.style.left = `${x}px`;
    this.visualIndicator.style.top = `${y}px`;
  }

  async analyzeTypingActivity(target) {
    if (!this.settings.enableTypingAwareService) return;

    const text = target.value || target.textContent || '';
    const analysis = this.performTypingAnalysis(text, target);

    if (analysis.needsAttention) {
      await this.triggerAttentionResponse(analysis);
    }

    // Check for run-on thoughts
    if (this.settings.enableRunOnThoughtDetection) {
      this.checkRunOnThoughts(text, target);
    }
  }

  performTypingAnalysis(text, target) {
    const textLower = text.toLowerCase();
    const hasTriggerKeywords = this.settings.responseTriggerKeywords.some(keyword => 
      textLower.includes(keyword.toLowerCase())
    );

    const wordCount = text.trim().split(/\s+/).filter(word => word.length > 0).length;
    const characterCount = text.length;

    const needsAttention = hasTriggerKeywords || 
      wordCount > 20 || 
      characterCount > 100 ||
      textLower.includes('?') ||
      textLower.includes('!');

    return {
      hasTriggerKeywords,
      needsAttention,
      wordCount,
      characterCount,
      confidence: hasTriggerKeywords ? 0.8 : 0.6,
      context: hasTriggerKeywords ? 'keyword-trigger' : 'long-text',
      suggestedResponse: this.generateSuggestedResponse(text, hasTriggerKeywords)
    };
  }

  generateSuggestedResponse(text, hasTriggerKeywords) {
    if (hasTriggerKeywords) {
      if (text.toLowerCase().includes('help')) {
        return 'I can help you with that! What specific assistance do you need?';
      } else if (text.toLowerCase().includes('assist')) {
        return 'I\'m here to assist you. Let me know what you\'d like to work on.';
      } else if (text.toLowerCase().includes('guide')) {
        return 'I can guide you through this process. What would you like to accomplish?';
      } else if (text.toLowerCase().includes('suggest')) {
        return 'I have some suggestions for you. Would you like to hear them?';
      } else if (text.toLowerCase().includes('recommend')) {
        return 'I can recommend some approaches. What are you trying to achieve?';
      }
      return 'I noticed you might need some help. How can I assist you?';
    } else if (text.length > 100) {
      return 'Consider breaking this into smaller, focused sections.';
    } else if (text.includes('?')) {
      return 'This looks like a question. Would you like me to help you find an answer?';
    }
    return 'Keep up the great work!';
  }

  checkRunOnThoughts(text, target) {
    this.runOnThoughtScore = this.calculateRunOnThoughtScore(text);
    
    if (this.runOnThoughtScore > this.settings.runOnThoughtThreshold) {
      this.showCursorProximityIndicator(target);
    }
  }

  calculateRunOnThoughtScore(text) {
    let score = 0;
    
    // Long sentences (more than 20 words)
    const words = text.trim().split(/\s+/).filter(word => word.length > 0);
    if (words.length > 20) score += 30;
    
    // Very long lines (more than 100 characters)
    if (text.length > 100) score += 25;
    
    // Multiple clauses without proper punctuation
    const clauses = text.split(/[.!?]/).filter(clause => clause.trim().length > 0);
    if (clauses.length > 3) score += 20;
    
    // Excessive use of conjunctions
    const conjunctions = (text.match(/\b(and|or|but|however|therefore|furthermore|moreover|additionally)\b/gi) || []).length;
    if (conjunctions > 2) score += 15;
    
    // Lack of paragraph breaks (very long continuous text)
    if (this.thoughtBuffer.length > 200) score += 20;
    
    return Math.min(score, 100); // Cap at 100
  }

  showCursorProximityIndicator(target) {
    if (!this.settings.enableCursorProximityIndicators || !this.cursorIndicator) return;

    const severity = this.runOnThoughtScore > 70 ? 'high' : this.runOnThoughtScore > 40 ? 'medium' : 'low';
    
    this.cursorIndicator.className = `myl-zip-cursor-indicator myl-zip-severity-${severity} myl-zip-indicator-${this.settings.proximityIndicatorStyle}`;
    this.cursorIndicator.innerHTML = `
      <div class="myl-zip-indicator-content">
        <div class="myl-zip-indicator-icon">⚠️</div>
        <div class="myl-zip-indicator-text">Run-on Thought Detected</div>
        <div class="myl-zip-indicator-score">${this.runOnThoughtScore}%</div>
      </div>
    `;

    // Position indicator near target element
    const rect = target.getBoundingClientRect();
    this.cursorIndicator.style.left = `${rect.right + 10}px`;
    this.cursorIndicator.style.top = `${rect.top}px`;
    this.cursorIndicator.style.display = 'block';

    // Auto-hide after 3 seconds
    setTimeout(() => {
      this.cursorIndicator.style.display = 'none';
    }, 3000);
  }

  async triggerAttentionResponse(analysis) {
    if (this.settings.enablePopupOverlay) {
      await this.showPopupOverlay(analysis);
    }

    if (this.settings.enableSoundFeedback) {
      this.playAttentionSound();
    }
  }

  async showPopupOverlay(analysis) {
    if (!this.popupOverlay) return;

    const confidenceColor = analysis.confidence > 0.7 ? '#4CAF50' : 
                           analysis.confidence > 0.5 ? '#FF9800' : '#F44336';

    this.popupOverlay.innerHTML = `
      <div class="myl-zip-overlay-header">
        <div class="myl-zip-overlay-icon">🎯</div>
        <div class="myl-zip-overlay-title">Myl.Zip Assistant</div>
        <div class="myl-zip-overlay-close" onclick="this.parentElement.parentElement.style.display='none'">×</div>
      </div>
      <div class="myl-zip-overlay-content">
        <div class="myl-zip-overlay-context">
          <strong>Context:</strong> ${analysis.context}
        </div>
        <div class="myl-zip-overlay-confidence">
          <strong>Confidence:</strong> 
          <span style="color: ${confidenceColor}">${Math.round(analysis.confidence * 100)}%</span>
        </div>
        <div class="myl-zip-overlay-suggestion">
          <strong>Suggestion:</strong><br>
          ${analysis.suggestedResponse}
        </div>
      </div>
      <div class="myl-zip-overlay-actions">
        <button class="myl-zip-overlay-btn myl-zip-overlay-btn-primary" onclick="this.closest('.myl-zip-overlay').style.display='none'">
          Got it!
        </button>
        <button class="myl-zip-overlay-btn myl-zip-overlay-btn-secondary" onclick="this.closest('.myl-zip-overlay').style.display='none'">
          Ignore
        </button>
      </div>
    `;

    // Position overlay near focused element
    if (this.focusedElement) {
      const rect = this.focusedElement.getBoundingClientRect();
      this.popupOverlay.style.left = `${rect.left}px`;
      this.popupOverlay.style.top = `${rect.bottom + 10}px`;
    } else {
      this.popupOverlay.style.left = `${this.mousePosition.x}px`;
      this.popupOverlay.style.top = `${this.mousePosition.y}px`;
    }

    this.popupOverlay.style.display = 'block';

    // Auto-hide after duration
    setTimeout(() => {
      this.popupOverlay.style.display = 'none';
    }, this.settings.overlayAnimationDuration || 3000);
  }

  playAttentionSound() {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.2);
    } catch (error) {
      console.log('Could not play attention sound:', error);
    }
  }

  async sendTypingActivity(target) {
    try {
      await chrome.runtime.sendMessage({
        type: 'TYPING_ACTIVITY',
        data: {
          text: target.value || target.textContent || '',
          wordCount: (target.value || target.textContent || '').trim().split(/\s+/).filter(word => word.length > 0).length,
          characterCount: (target.value || target.textContent || '').length,
          url: window.location.href,
          title: document.title,
          timestamp: Date.now()
        }
      });
    } catch (error) {
      console.log('Could not send typing activity:', error);
    }
  }

  async saveCurrentThought() {
    if (!this.currentThought || !this.settings.enableThoughtTracking) return;

    try {
      await chrome.runtime.sendMessage({
        type: 'SAVE_THOUGHT',
        thought: {
          text: this.currentThought,
          url: window.location.href,
          title: document.title,
          timestamp: Date.now()
        }
      });
    } catch (error) {
      console.log('Could not save thought:', error);
    }
  }

  async loadThoughtForElement(element) {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_THOUGHT' });
      if (response.thought && response.thought.text) {
        // Restore thought to element if it's empty
        if (!element.value && !element.textContent) {
          if (element.tagName.toLowerCase() === 'textarea' || element.type === 'text') {
            element.value = response.thought.text;
          } else if (element.contentEditable === 'true') {
            element.textContent = response.thought.text;
          }
        }
      }
    } catch (error) {
      console.log('Could not load thought:', error);
    }
  }

  async handleMessage(message, sender, sendResponse) {
    try {
      switch (message.type) {
        case 'GET_CURRENT_THOUGHT':
          sendResponse({ thought: { text: this.currentThought, url: window.location.href, title: document.title } });
          break;

        case 'LOAD_THOUGHT':
          if (message.thought && this.focusedElement) {
            this.loadThoughtForElement(this.focusedElement);
          }
          sendResponse({ success: true });
          break;

        case 'SHOW_ATTENTION_OVERLAY':
          await this.showPopupOverlay(message.analysis);
          sendResponse({ success: true });
          break;

        case 'SERVICE_TOGGLED':
          this.settings.enableTypingAwareService = message.enabled;
          this.serviceEnabled = message.enabled;
          this.updateFABState();
          sendResponse({ success: true });
          break;

        case 'SETTINGS_UPDATED':
          this.settings = { ...this.settings, ...message.settings };
          sendResponse({ success: true });
          break;

        default:
          sendResponse({ error: 'Unknown message type' });
      }
    } catch (error) {
      console.error('Error handling message:', error);
      sendResponse({ error: error.message });
    }
  }

  // Action handlers
  handleLeftHandAction() {
    console.log('Left Hand Action: Quick breather space activated');
    this.resetThoughtCounter();
  }

  handleRightHandAction() {
    console.log('Right Hand Action: Focus mode activated');
    this.updateVisualIndicator();
  }

  async openQuickSettings() {
    try {
      await chrome.runtime.sendMessage({ type: 'SHOW_NOTIFICATION', title: 'Myl.Zip', message: 'Opening quick settings...' });
    } catch (error) {
      console.log('Could not open quick settings:', error);
    }
  }

  async resetThoughtCounter() {
    this.currentThought = '';
    this.typingCount = 0;
    this.thoughtBuffer = '';
    this.updateVisualIndicator();
    
    try {
      await chrome.runtime.sendMessage({ type: 'SHOW_NOTIFICATION', title: 'Myl.Zip', message: 'Thought counter reset' });
    } catch (error) {
      console.log('Could not reset thought counter:', error);
    }
  }
}

// Initialize the content script
const mylZipContentScript = new MylZipContentScript();
