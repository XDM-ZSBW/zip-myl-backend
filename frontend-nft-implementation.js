/**
 * NFT Pairing System Front-End Implementation
 * For Myl.Zip Ecosystem Integration
 * 
 * This file provides a complete implementation of the NFT pairing system
 * that can be integrated into Chrome extensions, Obsidian plugins, and VS Code extensions.
 */

class NFTPairingSystem {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.currentNFTs = [];
    this.userInitials = '';
    this.deviceId = '';
    this.pairingToken = null;
    this.validNFTIndex = 0;
    
    // Geometric shape configurations
    this.shapes = {
      4: { name: 'Square', sides: 4, angleOffset: 0 },
      5: { name: 'Pentagon', sides: 5, angleOffset: -Math.PI / 2 },
      6: { name: 'Hexagon', sides: 6, angleOffset: -Math.PI / 6 },
      8: { name: 'Octagon', sides: 8, angleOffset: -Math.PI / 8 },
      10: { name: 'Decagon', sides: 10, angleOffset: -Math.PI / 10 },
      12: { name: 'Dodecagon', sides: 12, angleOffset: -Math.PI / 12 }
    };
    
    // Color palettes (accessible)
    this.colorPalettes = {
      primary: ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b'],
      highContrast: ['#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff', '#ffff00'],
      colorblind: ['#e69f00', '#56b4e9', '#009e73', '#f0e442', '#0072b2', '#cc79a7']
    };
  }

  /**
   * Initialize the NFT system
   */
  async initialize(containerId, userInitials, deviceId) {
    try {
      this.userInitials = userInitials || '';
      this.deviceId = deviceId || this.generateDeviceId();
      
      if (!this.userInitials) {
        throw new Error('User initials are required');
      }

      // Create canvas
      this.createCanvas(containerId);
      
      // Generate NFT collection
      await this.generateNFTCollection();
      
      // Display NFTs
      this.displayNFTs();
      
      return {
        success: true,
        deviceId: this.deviceId,
        nftCount: this.currentNFTs.length,
        validNFTIndex: this.validNFTIndex
      };
    } catch (error) {
      console.error('NFT system initialization failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Create canvas for NFT rendering
   */
  createCanvas(containerId) {
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Container with ID '${containerId}' not found`);
    }

    // Create canvas
    this.canvas = document.createElement('canvas');
    this.canvas.width = 100;
    this.canvas.height = 100;
    this.canvas.style.border = '1px solid #ccc';
    this.canvas.style.margin = '10px';
    this.canvas.style.display = 'inline-block';
    
    this.ctx = this.canvas.getContext('2d');
    container.appendChild(this.canvas);
  }

  /**
   * Generate a collection of unique NFTs
   */
  async generateNFTCollection() {
    this.currentNFTs = [];
    this.validNFTIndex = Math.floor(Math.random() * 6); // Random valid NFT
    
    // Generate 6 NFTs
    for (let i = 0; i < 6; i++) {
      const nft = await this.generateSingleNFT(i);
      this.currentNFTs.push(nft);
    }
  }

  /**
   * Generate a single NFT
   */
  async generateSingleNFT(index) {
    const shapeKeys = Object.keys(this.shapes);
    const randomShape = this.shapes[shapeKeys[Math.floor(Math.random() * shapeKeys.length)]];
    
    const nft = {
      id: this.generateUUID(),
      index: index,
      shape: randomShape,
      color: this.getRandomColor(),
      segments: this.generateSegments(randomShape.sides),
      connectionPoints: this.generateConnectionPoints(randomShape.sides),
      isPairingToken: index === this.validNFTIndex,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      userInitials: this.userInitials,
      deviceId: this.deviceId
    };

    return nft;
  }

  /**
   * Generate geometric segments for the shape
   */
  generateSegments(sides) {
    const segments = [];
    const centerX = 50;
    const centerY = 50;
    const radius = 35;
    
    for (let i = 0; i < sides; i++) {
      const angle = (i * 2 * Math.PI / sides) - Math.PI / 2;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      
      segments.push({
        x: x,
        y: y,
        angle: angle,
        isHighlighted: Math.random() > 0.7 // Random highlighting
      });
    }
    
    return segments;
  }

  /**
   * Generate connection points between segments
   */
  generateConnectionPoints(sides) {
    const points = [];
    const centerX = 50;
    const centerY = 50;
    const innerRadius = 25;
    
    for (let i = 0; i < sides; i++) {
      const angle = (i * 2 * Math.PI / sides) - Math.PI / 2;
      const x = centerX + innerRadius * Math.cos(angle);
      const y = centerY + innerRadius * Math.sin(angle);
      
      points.push({
        x: x,
        y: y,
        angle: angle,
        isConnected: Math.random() > 0.5 // Random connections
      });
    }
    
    return points;
  }

  /**
   * Display all generated NFTs
   */
  displayNFTs() {
    const container = this.canvas.parentElement;
    
    // Clear existing NFTs
    while (container.children.length > 1) {
      container.removeChild(container.lastChild);
    }
    
    // Display each NFT
    this.currentNFTs.forEach((nft, index) => {
      const nftCanvas = this.renderNFT(nft);
      nftCanvas.style.cursor = 'pointer';
      
      // Add click handler
      nftCanvas.addEventListener('click', () => this.handleNFTClick(nft, index));
      
      // Add label
      const label = document.createElement('div');
      label.textContent = nft.isPairingToken ? 'Pairing Token' : `Profile ${index + 1}`;
      label.style.textAlign = 'center';
      label.style.fontSize = '12px';
      label.style.marginTop = '5px';
      
      const wrapper = document.createElement('div');
      wrapper.style.display = 'inline-block';
      wrapper.style.margin = '10px';
      wrapper.appendChild(nftCanvas);
      wrapper.appendChild(label);
      
      container.appendChild(wrapper);
    });
  }

  /**
   * Render a single NFT to canvas
   */
  renderNFT(nft) {
    const canvas = document.createElement('canvas');
    canvas.width = 100;
    canvas.height = 100;
    const ctx = canvas.getContext('2d');
    
    // Clear canvas
    ctx.clearRect(0, 0, 100, 100);
    
    // Draw background
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, 100, 100);
    
    // Draw shape outline
    this.drawShapeOutline(ctx, nft);
    
    // Draw segments
    this.drawSegments(ctx, nft);
    
    // Draw connection points
    this.drawConnectionPoints(ctx, nft);
    
    // Draw center area (profile picture or initials)
    this.drawCenterArea(ctx, nft);
    
    // Add pairing token indicator
    if (nft.isPairingToken) {
      this.drawPairingIndicator(ctx);
    }
    
    return canvas;
  }

  /**
   * Draw the geometric shape outline
   */
  drawShapeOutline(ctx, nft) {
    const { sides } = nft.shape;
    const centerX = 50;
    const centerY = 50;
    const radius = 40;
    
    ctx.beginPath();
    ctx.strokeStyle = nft.color;
    ctx.lineWidth = 2;
    
    for (let i = 0; i <= sides; i++) {
      const angle = (i * 2 * Math.PI / sides) - Math.PI / 2;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    
    ctx.stroke();
  }

  /**
   * Draw the segments
   */
  drawSegments(ctx, nft) {
    nft.segments.forEach(segment => {
      ctx.beginPath();
      ctx.arc(segment.x, segment.y, 3, 0, 2 * Math.PI);
      ctx.fillStyle = segment.isHighlighted ? '#ff6b6b' : nft.color;
      ctx.fill();
    });
  }

  /**
   * Draw connection points
   */
  drawConnectionPoints(ctx, nft) {
    nft.connectionPoints.forEach(point => {
      if (point.isConnected) {
        ctx.beginPath();
        ctx.arc(point.x, point.y, 2, 0, 2 * Math.PI);
        ctx.fillStyle = '#333';
        ctx.fill();
      }
    });
  }

  /**
   * Draw center area (initials or profile picture)
   */
  drawCenterArea(ctx, nft) {
    const centerX = 50;
    const centerY = 50;
    const size = 30;
    
    // Draw background circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, size, 0, 2 * Math.PI);
    ctx.fillStyle = '#e9ecef';
    ctx.fill();
    ctx.strokeStyle = nft.color;
    ctx.lineWidth = 1;
    ctx.stroke();
    
    // Draw initials
    ctx.fillStyle = '#495057';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(nft.userInitials, centerX, centerY);
  }

  /**
   * Draw pairing token indicator
   */
  drawPairingIndicator(ctx) {
    // Draw a small badge in the top-right corner
    ctx.beginPath();
    ctx.arc(85, 15, 8, 0, 2 * Math.PI);
    ctx.fillStyle = '#28a745';
    ctx.fill();
    
    ctx.fillStyle = 'white';
    ctx.font = 'bold 10px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('✓', 85, 15);
  }

  /**
   * Handle NFT click events
   */
  handleNFTClick(nft, index) {
    if (nft.isPairingToken) {
      this.handlePairingTokenClick(nft);
    } else {
      this.handleProfileNFTClick(nft, index);
    }
  }

  /**
   * Handle pairing token click
   */
  handlePairingTokenClick(nft) {
    // Generate pairing token for backend
    this.pairingToken = {
      nftId: nft.id,
      deviceId: this.deviceId,
      userInitials: this.userInitials,
      expiresAt: nft.expiresAt,
      token: this.generatePairingCode()
    };
    
    // Show pairing information
    this.showPairingInfo(this.pairingToken);
    
    // Send to backend
    this.sendPairingTokenToBackend(this.pairingToken);
  }

  /**
   * Handle profile NFT click
   */
  handleProfileNFTClick(nft, index) {
    // Allow user to set this as their profile picture
    this.setAsProfilePicture(nft, index);
  }

  /**
   * Show pairing information
   */
  showPairingInfo(pairingToken) {
    const info = document.createElement('div');
    info.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      border: 2px solid #28a745;
      border-radius: 10px;
      padding: 20px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      z-index: 1000;
      text-align: center;
    `;
    
    info.innerHTML = `
      <h3>🎯 Pairing Token Generated!</h3>
      <p><strong>Token:</strong> ${pairingToken.token}</p>
      <p><strong>Device ID:</strong> ${pairingToken.deviceId}</p>
      <p><strong>Expires:</strong> ${pairingToken.expiresAt.toLocaleString()}</p>
      <p><em>Share this token with the device you want to pair with.</em></p>
      <button onclick="this.parentElement.remove()" style="
        background: #28a745;
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 5px;
        cursor: pointer;
      ">Close</button>
    `;
    
    document.body.appendChild(info);
  }

  /**
   * Set NFT as profile picture
   */
  setAsProfilePicture(nft, index) {
    // Store in local storage
    const profileData = {
      nftId: nft.id,
      index: index,
      userInitials: nft.userInitials,
      deviceId: nft.deviceId,
      setAt: new Date()
    };
    
    localStorage.setItem('mylZipProfilePicture', JSON.stringify(profileData));
    
    // Show confirmation
    alert(`NFT ${index + 1} set as profile picture!`);
  }

  /**
   * Send pairing token to backend
   */
  async sendPairingTokenToBackend(pairingToken) {
    try {
      const response = await fetch('/api/v1/nft/generate-pairing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          platform: 'web',
          collectionName: `Collection-${this.deviceId}`,
          nftData: pairingToken
        })
      });
      
      if (response.ok) {
        console.log('Pairing token sent to backend successfully');
      } else {
        console.error('Failed to send pairing token to backend');
      }
    } catch (error) {
      console.error('Error sending pairing token to backend:', error);
    }
  }

  /**
   * Export NFT as SVG
   */
  exportNFTAsSVG(nft) {
    const svg = `
      <svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
        <rect width="100" height="100" fill="#f8f9fa"/>
        <circle cx="50" cy="50" r="40" fill="none" stroke="${nft.color}" stroke-width="2"/>
        <text x="50" y="50" text-anchor="middle" dy=".3em" font-family="Arial" font-size="14" fill="#495057">${nft.userInitials}</text>
      </svg>
    `;
    
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `nft-${nft.id}.svg`;
    a.click();
    
    URL.revokeObjectURL(url);
  }

  /**
   * Export NFT as PNG
   */
  exportNFTAsPNG(nft) {
    const canvas = document.createElement('canvas');
    canvas.width = 100;
    canvas.height = 100;
    const ctx = canvas.getContext('2d');
    
    // Render NFT to temporary canvas
    const tempCanvas = this.renderNFT(nft);
    ctx.drawImage(tempCanvas, 0, 0);
    
    // Export as PNG
    const dataURL = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataURL;
    a.download = `nft-${nft.id}.png`;
    a.click();
  }

  /**
   * Generate UUID for NFT
   */
  generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * Generate device ID
   */
  generateDeviceId() {
    return 'device-' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Generate pairing code
   */
  generatePairingCode() {
    return Math.random().toString(36).substr(2, 8).toUpperCase();
  }

  /**
   * Get random color from palette
   */
  getRandomColor() {
    const palette = this.colorPalettes.primary;
    return palette[Math.floor(Math.random() * palette.length)];
  }

  /**
   * Get NFT collection
   */
  getNFTCollection() {
    return this.currentNFTs;
  }

  /**
   * Get pairing token
   */
  getPairingToken() {
    return this.pairingToken;
  }

  /**
   * Check if NFT is expired
   */
  isNFTExpired(nft) {
    return new Date() > nft.expiresAt;
  }

  /**
   * Cleanup expired NFTs
   */
  cleanupExpiredNFTs() {
    this.currentNFTs = this.currentNFTs.filter(nft => !this.isNFTExpired(nft));
    this.displayNFTs();
  }

  /**
   * Destroy the NFT system
   */
  destroy() {
    if (this.canvas && this.canvas.parentElement) {
      this.canvas.parentElement.removeChild(this.canvas);
    }
    this.currentNFTs = [];
    this.pairingToken = null;
  }
}

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = NFTPairingSystem;
} else if (typeof define === 'function' && define.amd) {
  define([], function() { return NFTPairingSystem; });
} else {
  window.NFTPairingSystem = NFTPairingSystem;
}

// Example usage and integration guide
const NFTIntegrationGuide = {
  /**
   * Chrome Extension Integration
   */
  chromeExtension: `
    // In your Chrome extension popup or content script
    const nftSystem = new NFTPairingSystem();
    
    // Initialize when popup opens
    document.addEventListener('DOMContentLoaded', async () => {
      const result = await nftSystem.initialize('nft-container', 'JD', 'chrome-extension-001');
      if (result.success) {
        console.log('NFT system ready for Chrome extension');
      }
    });
  `,

  /**
   * Obsidian Plugin Integration
   */
  obsidianPlugin: `
    // In your Obsidian plugin
    import { NFTPairingSystem } from './nft-pairing-system';
    
    export default class NFTPairingPlugin extends Plugin {
      async onload() {
        const nftSystem = new NFTPairingSystem();
        
        // Add command to generate NFTs
        this.addCommand({
          id: 'generate-nft-pairing',
          name: 'Generate NFT Pairing',
          callback: async () => {
            const modal = new NFTModal(this.app, nftSystem);
            modal.open();
          }
        });
      }
    }
  `,

  /**
   * VS Code Extension Integration
   */
  vscodeExtension: `
    // In your VS Code extension
    import * as vscode from 'vscode';
    import { NFTPairingSystem } from './nft-pairing-system';
    
    export function activate(context: vscode.ExtensionContext) {
      const nftSystem = new NFTPairingSystem();
      
      // Register command
      let disposable = vscode.commands.registerCommand('nft-pairing.generate', async () => {
        const result = await nftSystem.initialize('nft-container', 'VS', 'vscode-extension-001');
        if (result.success) {
          vscode.window.showInformationMessage('NFT pairing system ready!');
        }
      });
      
      context.subscriptions.push(disposable);
    }
  `,

  /**
   * Web Application Integration
   */
  webApp: `
    // In your web application
    <!DOCTYPE html>
    <html>
    <head>
        <title>NFT Pairing System</title>
        <style>
            #nft-container { text-align: center; padding: 20px; }
            .nft-item { display: inline-block; margin: 10px; }
        </style>
    </head>
    <body>
        <div id="nft-container">
            <h2>NFT Pairing System</h2>
            <p>Click on an NFT to use it for pairing or as a profile picture.</p>
        </div>
        
        <script src="nft-pairing-system.js"></script>
        <script>
            const nftSystem = new NFTPairingSystem();
            
            // Initialize when page loads
            window.addEventListener('load', async () => {
                const result = await nftSystem.initialize('nft-container', 'WEB', 'web-app-001');
                if (result.success) {
                    console.log('NFT system ready for web application');
                }
            });
        </script>
    </body>
    </html>
  `
};

// Make integration guide available globally
if (typeof window !== 'undefined') {
  window.NFTIntegrationGuide = NFTIntegrationGuide;
}
