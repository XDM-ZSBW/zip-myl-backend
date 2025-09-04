const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');

// Serve the minimal chat interface for Chrome extension popup
router.get('/', (req, res) => {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>XDMIQ Chat</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            height: 100vh;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }
        
        .chat-container {
            flex: 1;
            display: flex;
            flex-direction: column;
            max-width: 100%;
            margin: 0;
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            border-radius: 0;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
        }
        
        .chat-header {
            background: linear-gradient(45deg, #3498db, #2980b9);
            color: white;
            padding: 15px 20px;
            text-align: center;
            font-size: 18px;
            font-weight: bold;
            border-bottom: 1px solid rgba(255, 255, 255, 0.2);
        }
        
        .chat-messages {
            flex: 1;
            overflow-y: auto;
            padding: 20px;
            background: #f8f9fa;
        }
        
        .message {
            margin-bottom: 15px;
            display: flex;
            align-items: flex-start;
        }
        
        .message.user {
            justify-content: flex-end;
        }
        
        .message.bot {
            justify-content: flex-start;
        }
        
        .message-content {
            max-width: 80%;
            padding: 12px 16px;
            border-radius: 18px;
            font-size: 14px;
            line-height: 1.4;
            word-wrap: break-word;
        }
        
        .message.user .message-content {
            background: linear-gradient(45deg, #3498db, #2980b9);
            color: white;
            border-bottom-right-radius: 4px;
        }
        
        .message.bot .message-content {
            background: white;
            color: #333;
            border: 1px solid #e1e5e9;
            border-bottom-left-radius: 4px;
        }
        
        .message-time {
            font-size: 11px;
            color: #999;
            margin-top: 4px;
            text-align: center;
        }
        
        .chat-input-container {
            padding: 15px 20px;
            background: white;
            border-top: 1px solid #e1e5e9;
        }
        
        .chat-input-wrapper {
            display: flex;
            gap: 10px;
            align-items: flex-end;
        }
        
        .chat-input {
            flex: 1;
            padding: 12px 16px;
            border: 2px solid #e1e5e9;
            border-radius: 25px;
            font-size: 14px;
            outline: none;
            transition: border-color 0.3s ease;
            resize: none;
            min-height: 44px;
            max-height: 100px;
        }
        
        .chat-input:focus {
            border-color: #3498db;
        }
        
        .send-button {
            background: linear-gradient(45deg, #3498db, #2980b9);
            color: white;
            border: none;
            border-radius: 50%;
            width: 44px;
            height: 44px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: transform 0.2s ease;
            font-size: 18px;
        }
        
        .send-button:hover {
            transform: scale(1.05);
        }
        
        .send-button:active {
            transform: scale(0.95);
        }
        
        .typing-indicator {
            display: none;
            padding: 12px 16px;
            background: white;
            border: 1px solid #e1e5e9;
            border-radius: 18px;
            border-bottom-left-radius: 4px;
            font-size: 14px;
            color: #666;
            margin-bottom: 15px;
        }
        
        .typing-indicator.show {
            display: block;
        }
        
        .typing-dots {
            display: inline-block;
        }
        
        .typing-dots::after {
            content: '';
            animation: typing 1.5s infinite;
        }
        
        @keyframes typing {
            0%, 20% { content: ''; }
            40% { content: '.'; }
            60% { content: '..'; }
            80%, 100% { content: '...'; }
        }
        
        .welcome-message {
            text-align: center;
            color: #666;
            font-size: 14px;
            margin-bottom: 20px;
        }
        
        .status-indicator {
            position: fixed;
            top: 10px;
            right: 10px;
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background: #27ae60;
            box-shadow: 0 0 10px rgba(39, 174, 96, 0.5);
        }
        
        .status-indicator.offline {
            background: #e74c3c;
            box-shadow: 0 0 10px rgba(231, 76, 60, 0.5);
        }
    </style>
</head>
<body>
    <div class="status-indicator" id="statusIndicator"></div>
    
    <div class="chat-container">
        <div class="chat-header">
            🛒 XDMIQ Chat
        </div>
        
        <div class="chat-messages" id="chatMessages">
            <div class="welcome-message">
                Welcome to XDMIQ! I'm here to help you with SSL certificates, API keys, 
                security features, and more. How can I assist you today?
            </div>
        </div>
        
        <div class="typing-indicator" id="typingIndicator">
            <span class="typing-dots">XDMIQ is typing</span>
        </div>
        
        <div class="chat-input-container">
            <div class="chat-input-wrapper">
                <textarea 
                    class="chat-input" 
                    id="chatInput" 
                    placeholder="Type your message here..."
                    rows="1"
                ></textarea>
                <button class="send-button" id="sendButton">
                    ➤
                </button>
            </div>
        </div>
    </div>

    <script>
        class XDMIQChat {
            constructor() {
                this.messages = [];
                this.isTyping = false;
                this.deviceId = this.generateDeviceId();
                
                this.chatMessages = document.getElementById('chatMessages');
                this.chatInput = document.getElementById('chatInput');
                this.sendButton = document.getElementById('sendButton');
                this.typingIndicator = document.getElementById('typingIndicator');
                this.statusIndicator = document.getElementById('statusIndicator');
                
                this.initializeEventListeners();
                this.checkConnection();
            }
            
            generateDeviceId() {
                let deviceId = localStorage.getItem('xdmiq_device_id');
                if (!deviceId) {
                    deviceId = 'ext_' + Math.random().toString(36).substr(2, 9);
                    localStorage.setItem('xdmiq_device_id', deviceId);
                }
                return deviceId;
            }
            
            initializeEventListeners() {
                this.sendButton.addEventListener('click', () => this.sendMessage());
                this.chatInput.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        this.sendMessage();
                    }
                });
                
                this.chatInput.addEventListener('input', () => {
                    this.adjustTextareaHeight();
                });
            }
            
            adjustTextareaHeight() {
                this.chatInput.style.height = 'auto';
                this.chatInput.style.height = Math.min(this.chatInput.scrollHeight, 100) + 'px';
            }
            
            async checkConnection() {
                try {
                    const response = await fetch('/chat-popup/api/status', {
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-Device-ID': this.deviceId,
                        },
                    });
                    
                    if (response.ok) {
                        this.statusIndicator.classList.remove('offline');
                        this.addBotMessage('Connected to XDMIQ! How can I help you today?');
                    } else {
                        this.statusIndicator.classList.add('offline');
                        this.addBotMessage('Connection issue detected. Some features may be limited.');
                    }
                } catch (error) {
                    this.statusIndicator.classList.add('offline');
                    this.addBotMessage('Welcome to XDMIQ Chat! I\'m here to help with SSL certificates, ' +
                        'API keys, security features, and more.');
                }
            }
            
            async sendMessage() {
                const message = this.chatInput.value.trim();
                if (!message || this.isTyping) return;
                
                this.addUserMessage(message);
                this.chatInput.value = '';
                this.adjustTextareaHeight();
                
                this.showTyping();
                
                try {
                    const response = await fetch('/chat-popup/api/message', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-Device-ID': this.deviceId,
                        },
                        body: JSON.stringify({
                            message: message,
                            deviceId: this.deviceId,
                            context: this.messages.slice(-5).map(m => m.content),
                        }),
                    });
                    
                    if (response.ok) {
                        const data = await response.json();
                        this.hideTyping();
                        this.addBotMessage(data.response || 'I understand! How can I help you further?');
                    } else {
                        throw new Error('Failed to get response');
                    }
                } catch (error) {
                    this.hideTyping();
                    this.addBotMessage('I apologize, but I\'m having trouble connecting right now. ' +
                        'I can still help you with general information about XDMIQ services like SSL ' +
                        'certificates, API key generation, security features, and setup processes.');
                }
            }
            
            addUserMessage(content) {
                const message = {
                    type: 'user',
                    content: content,
                    timestamp: new Date(),
                };
                this.messages.push(message);
                this.displayMessage(message);
            }
            
            addBotMessage(content) {
                const message = {
                    type: 'bot',
                    content: content,
                    timestamp: new Date(),
                };
                this.messages.push(message);
                this.displayMessage(message);
            }
            
            displayMessage(message) {
                const messageDiv = document.createElement('div');
                messageDiv.className = \`message \${message.type}\`;
                
                const contentDiv = document.createElement('div');
                contentDiv.className = 'message-content';
                contentDiv.textContent = message.content;
                
                const timeDiv = document.createElement('div');
                timeDiv.className = 'message-time';
                timeDiv.textContent = message.timestamp.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                });
                
                messageDiv.appendChild(contentDiv);
                messageDiv.appendChild(timeDiv);
                
                this.chatMessages.appendChild(messageDiv);
                this.scrollToBottom();
            }
            
            showTyping() {
                this.isTyping = true;
                this.typingIndicator.classList.add('show');
                this.scrollToBottom();
            }
            
            hideTyping() {
                this.isTyping = false;
                this.typingIndicator.classList.remove('show');
            }
            
            scrollToBottom() {
                setTimeout(() => {
                    this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
                }, 100);
            }
        }
        
        // Initialize chat when page loads
        document.addEventListener('DOMContentLoaded', () => {
            new XDMIQChat();
        });
    </script>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html');
  res.send(html);
});

// API endpoint for chat messages
router.post('/api/message', async (req, res) => {
  try {
    const { message, deviceId } = req.body;
    
    if (!message) {
      return res.status(400).json({ 
        success: false, 
        error: 'Message is required', 
      });
    }

    // Simple response logic for the popup version
    const responses = {
      greeting: [
        'Hello! I\'m here to help you with XDMIQ services.',
        'Hi there! How can I assist you with SSL certificates, API keys, or security features?',
        'Welcome! I can help you with setup processes and technical questions.',
      ],
      ssl: [
        'I can help you with SSL certificates! XDMIQ offers secure certificate management and validation.',
        'SSL certificates are essential for security. I can guide you through the setup process.',
        'For SSL certificate questions, I\'m here to help with configuration and troubleshooting.',
      ],
      api: [
        'API key generation is straightforward with XDMIQ. I can help you set up secure API access.',
        'I can assist you with API key management and security best practices.',
        'For API-related questions, I\'m here to provide guidance and support.',
      ],
      help: [
        'I can help you with SSL certificates, API key generation, security features, setup processes, and more!',
        'How can I assist you today? I\'m knowledgeable about all XDMIQ services.',
        'I\'m here to help with any questions about XDMIQ features and services.',
      ],
    };

    const lowerMessage = message.toLowerCase();
    let responseType = 'help';

    if (lowerMessage.includes('hi') || lowerMessage.includes('hello') || lowerMessage.includes('hey')) {
      responseType = 'greeting';
    } else if (lowerMessage.includes('ssl') || lowerMessage.includes('certificate') || lowerMessage.includes('security')) {
      responseType = 'ssl';
    } else if (lowerMessage.includes('api') || lowerMessage.includes('key') || lowerMessage.includes('token')) {
      responseType = 'api';
    }

    const responseArray = responses[responseType];
    const response = responseArray[Math.floor(Math.random() * responseArray.length)];

    res.json({
      success: true,
      response: response,
      deviceId: deviceId,
    });

  } catch (error) {
    logger.error('Chat API error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

// Status endpoint
router.get('/api/status', (req, res) => {
  res.json({
    success: true,
    status: 'online',
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
