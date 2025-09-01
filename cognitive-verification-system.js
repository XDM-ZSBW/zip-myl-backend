/**
 * Cognitive Verification System
 * Replaces API keys with human-verifiable cognitive puzzles
 * Based on prior NFT pairing system but streamlined for verification
 */

class CognitiveVerificationSystem {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.currentPuzzle = null;
    this.puzzleId = null;
    this.difficulty = 'medium';
    this.timeLimit = 30; // seconds
    
    // Streamlined geometric shapes (reduced from 6 to 4 for efficiency)
    this.shapes = {
      4: { name: 'Square', sides: 4, angleOffset: 0, difficulty: 'easy' },
      6: { name: 'Hexagon', sides: 6, angleOffset: -Math.PI / 6, difficulty: 'medium' },
      8: { name: 'Octagon', sides: 8, angleOffset: -Math.PI / 8, difficulty: 'medium' },
      12: { name: 'Dodecagon', sides: 12, angleOffset: -Math.PI / 12, difficulty: 'hard' }
    };
    
    // Accessible color palettes
    this.colorPalettes = {
      primary: ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728'],
      highContrast: ['#000000', '#ffffff', '#ff0000', '#00ff00'],
      colorblind: ['#e69f00', '#56b4e9', '#009e73', '#f0e442']
    };
    
    // Puzzle types covering different cognitive abilities
    this.puzzleTypes = {
      'pattern_completion': {
        name: 'Pattern Completion',
        description: 'Which shape comes next in the sequence?',
        difficulty: 'medium',
        timeLimit: 25
      },
      'shape_recognition': {
        name: 'Shape Recognition', 
        description: 'Find the shape that matches the pattern',
        difficulty: 'easy',
        timeLimit: 20
      },
      'spatial_reasoning': {
        name: 'Spatial Reasoning',
        description: 'Which shape would fit in the empty space?',
        difficulty: 'hard',
        timeLimit: 35
      },
      'color_pattern': {
        name: 'Color Pattern',
        description: 'Complete the color sequence',
        difficulty: 'medium',
        timeLimit: 30
      }
    };
  }

  /**
   * Generate a cognitive puzzle for human verification
   */
  async generatePuzzle(containerId, difficulty = 'medium') {
    try {
      this.difficulty = difficulty;
      this.puzzleId = this.generateUUID();
      
      // Create canvas
      this.createCanvas(containerId);
      
      // Generate puzzle based on difficulty
      this.currentPuzzle = await this.generatePuzzleByDifficulty(difficulty);
      
      // Display puzzle
      this.displayPuzzle();
      
      // Start timer
      this.startTimer();
      
      return {
        success: true,
        puzzleId: this.puzzleId,
        type: this.currentPuzzle.type,
        difficulty: difficulty,
        timeLimit: this.currentPuzzle.timeLimit
      };
    } catch (error) {
      console.error('Puzzle generation failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Generate puzzle based on difficulty level
   */
  async generatePuzzleByDifficulty(difficulty) {
    const puzzleTypes = Object.keys(this.puzzleTypes);
    let availableTypes = [];
    
    switch (difficulty) {
      case 'easy':
        availableTypes = puzzleTypes.filter(type => 
          this.puzzleTypes[type].difficulty === 'easy'
        );
        break;
      case 'medium':
        availableTypes = puzzleTypes.filter(type => 
          this.puzzleTypes[type].difficulty === 'medium'
        );
        break;
      case 'hard':
        availableTypes = puzzleTypes.filter(type => 
          this.puzzleTypes[type].difficulty === 'hard'
        );
        break;
      default:
        availableTypes = puzzleTypes;
    }
    
    const selectedType = availableTypes[Math.floor(Math.random() * availableTypes.length)];
    const puzzleType = this.puzzleTypes[selectedType];
    
    return {
      id: this.puzzleId,
      type: selectedType,
      name: puzzleType.name,
      description: puzzleType.description,
      difficulty: difficulty,
      timeLimit: puzzleType.timeLimit,
      shapes: this.generatePuzzleShapes(selectedType),
      correctAnswer: this.generateCorrectAnswer(selectedType),
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + (puzzleType.timeLimit + 10) * 1000) // Extra 10 seconds buffer
    };
  }

  /**
   * Generate shapes for the puzzle
   */
  generatePuzzleShapes(puzzleType) {
    const shapes = [];
    
    switch (puzzleType) {
      case 'pattern_completion':
        // Generate sequence of 4 shapes with one missing
        for (let i = 0; i < 4; i++) {
          if (i === 2) { // Missing shape position
            shapes.push({ type: 'missing', index: i });
          } else {
            shapes.push(this.generateRandomShape());
          }
        }
        break;
        
      case 'shape_recognition':
        // Generate 4 shapes, one is the target pattern
        const targetShape = this.generateRandomShape();
        shapes.push({ ...targetShape, isTarget: true });
        
        for (let i = 1; i < 4; i++) {
          shapes.push(this.generateRandomShape());
        }
        break;
        
      case 'spatial_reasoning':
        // Generate 3 shapes forming a pattern with one empty space
        for (let i = 0; i < 4; i++) {
          if (i === 1) { // Empty space
            shapes.push({ type: 'empty', index: i });
          } else {
            shapes.push(this.generateRandomShape());
          }
        }
        break;
        
      case 'color_pattern':
        // Generate shapes with color patterns
        for (let i = 0; i < 4; i++) {
          if (i === 3) { // Missing color pattern
            shapes.push({ type: 'missing', index: i });
          } else {
            shapes.push(this.generateRandomShapeWithColor());
          }
        }
        break;
    }
    
    return shapes;
  }

  /**
   * Generate a random geometric shape
   */
  generateRandomShape() {
    const shapeKeys = Object.keys(this.shapes);
    const randomShapeKey = shapeKeys[Math.floor(Math.random() * shapeKeys.length)];
    const shape = this.shapes[randomShapeKey];
    
    return {
      id: this.generateUUID(),
      shape: shape,
      color: this.getRandomColor(),
      segments: this.generateSegments(shape.sides),
      connectionPoints: this.generateConnectionPoints(shape.sides)
    };
  }

  /**
   * Generate shape with specific color pattern
   */
  generateRandomShapeWithColor() {
    const shape = this.generateRandomShape();
    shape.colorPattern = this.generateColorPattern();
    return shape;
  }

  /**
   * Generate color pattern for color-based puzzles
   */
  generateColorPattern() {
    const colors = this.colorPalettes.primary;
    const pattern = [];
    
    for (let i = 0; i < 4; i++) {
      pattern.push(colors[Math.floor(Math.random() * colors.length)]);
    }
    
    return pattern;
  }

  /**
   * Generate correct answer based on puzzle type
   */
  generateCorrectAnswer(puzzleType) {
    switch (puzzleType) {
      case 'pattern_completion':
        // The missing shape should follow the pattern
        return this.generatePatternCompletionAnswer();
        
      case 'shape_recognition':
        // Return the target shape
        return 0; // First shape is target
        
      case 'spatial_reasoning':
        // Return the shape that fits the spatial pattern
        return this.generateSpatialAnswer();
        
      case 'color_pattern':
        // Return the missing color pattern
        return this.generateColorPatternAnswer();
        
      default:
        return 0;
    }
  }

  /**
   * Generate answer for pattern completion puzzles
   */
  generatePatternCompletionAnswer() {
    // Simple pattern: alternate between two shapes
    return Math.floor(Math.random() * 4); // 0-3 for answer options
  }

  /**
   * Generate answer for spatial reasoning puzzles
   */
  generateSpatialAnswer() {
    // Return which shape fits in the empty space
    return Math.floor(Math.random() * 4);
  }

  /**
   * Generate answer for color pattern puzzles
   */
  generateColorPatternAnswer() {
    // Return the missing color pattern
    return Math.floor(Math.random() * 4);
  }

  /**
   * Display the puzzle
   */
  displayPuzzle() {
    const container = this.canvas.parentElement;
    
    // Clear existing content
    container.innerHTML = '';
    
    // Add puzzle header
    const header = document.createElement('div');
    header.innerHTML = `
      <h3>${this.currentPuzzle.name}</h3>
      <p>${this.currentPuzzle.description}</p>
      <div class="timer" id="timer">Time: ${this.currentPuzzle.timeLimit}s</div>
    `;
    header.style.textAlign = 'center';
    header.style.marginBottom = '20px';
    container.appendChild(header);
    
    // Add puzzle grid
    const grid = document.createElement('div');
    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = 'repeat(2, 1fr)';
    grid.style.gap = '10px';
    grid.style.maxWidth = '400px';
    grid.style.margin = '0 auto';
    
    // Add shapes to grid
    this.currentPuzzle.shapes.forEach((shape, index) => {
      const shapeContainer = document.createElement('div');
      shapeContainer.style.textAlign = 'center';
      shapeContainer.style.cursor = 'pointer';
      shapeContainer.style.padding = '10px';
      shapeContainer.style.border = '2px solid #ddd';
      shapeContainer.style.borderRadius = '8px';
      shapeContainer.style.transition = 'all 0.2s ease';
      
      if (shape.type === 'missing' || shape.type === 'empty') {
        shapeContainer.innerHTML = `
          <div style="width: 80px; height: 80px; border: 2px dashed #999; display: flex; align-items: center; justify-content: center; margin: 0 auto;">
            <span style="color: #999; font-size: 24px;">?</span>
          </div>
          <div style="margin-top: 5px; font-size: 12px; color: #666;">Select Answer</div>
        `;
      } else {
        const shapeCanvas = this.renderShape(shape);
        shapeContainer.appendChild(shapeCanvas);
      }
      
      // Add click handler for answer selection
      shapeContainer.addEventListener('click', () => this.handleAnswerSelection(index));
      
      grid.appendChild(shapeContainer);
    });
    
    container.appendChild(grid);
    
    // Add submit button
    const submitBtn = document.createElement('button');
    submitBtn.textContent = 'Submit Answer';
    submitBtn.style.marginTop = '20px';
    submitBtn.style.padding = '10px 20px';
    submitBtn.style.backgroundColor = '#4CAF50';
    submitBtn.style.color = 'white';
    submitBtn.style.border = 'none';
    submitBtn.style.borderRadius = '5px';
    submitBtn.style.cursor = 'pointer';
    submitBtn.addEventListener('click', () => this.submitAnswer());
    container.appendChild(submitBtn);
  }

  /**
   * Render a single shape
   */
  renderShape(shape) {
    const canvas = document.createElement('canvas');
    canvas.width = 80;
    canvas.height = 80;
    const ctx = canvas.getContext('2d');
    
    // Clear canvas
    ctx.clearRect(0, 0, 80, 80);
    
    // Draw background
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, 80, 80);
    
    // Draw shape outline
    this.drawShapeOutline(ctx, shape, 40);
    
    // Draw segments
    this.drawSegments(ctx, shape, 40);
    
    // Draw connection points
    this.drawConnectionPoints(ctx, shape, 40);
    
    return canvas;
  }

  /**
   * Draw shape outline
   */
  drawShapeOutline(ctx, shape, center) {
    const { sides } = shape.shape;
    const radius = 30;
    
    ctx.beginPath();
    ctx.strokeStyle = shape.color;
    ctx.lineWidth = 2;
    
    for (let i = 0; i <= sides; i++) {
      const angle = (i * 2 * Math.PI / sides) - Math.PI / 2;
      const x = center + radius * Math.cos(angle);
      const y = center + radius * Math.sin(angle);
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    
    ctx.stroke();
  }

  /**
   * Draw segments
   */
  drawSegments(ctx, shape, center) {
    shape.segments.forEach(segment => {
      ctx.beginPath();
      ctx.arc(segment.x * 0.8 + center * 0.2, segment.y * 0.8 + center * 0.2, 2, 0, 2 * Math.PI);
      ctx.fillStyle = segment.isHighlighted ? '#ff6b6b' : shape.color;
      ctx.fill();
    });
  }

  /**
   * Draw connection points
   */
  drawConnectionPoints(ctx, shape, center) {
    shape.connectionPoints.forEach(point => {
      if (point.isConnected) {
        ctx.beginPath();
        ctx.arc(point.x * 0.8 + center * 0.2, point.y * 0.8 + center * 0.2, 1.5, 0, 2 * Math.PI);
        ctx.fillStyle = '#333';
        ctx.fill();
      }
    });
  }

  /**
   * Handle answer selection
   */
  handleAnswerSelection(index) {
    this.selectedAnswer = index;
    
    // Update visual feedback
    const containers = document.querySelectorAll('#puzzle-container > div > div');
    containers.forEach((container, i) => {
      if (i === index) {
        container.style.borderColor = '#4CAF50';
        container.style.backgroundColor = '#f0f8f0';
      } else {
        container.style.borderColor = '#ddd';
        container.style.backgroundColor = 'transparent';
      }
    });
  }

  /**
   * Submit answer
   */
  submitAnswer() {
    if (this.selectedAnswer === undefined) {
      alert('Please select an answer first');
      return;
    }
    
    const isCorrect = this.selectedAnswer === this.currentPuzzle.correctAnswer;
    
    if (isCorrect) {
      this.showSuccess('Puzzle solved! Access granted.');
      this.onVerificationSuccess();
    } else {
      this.showError('Incorrect answer. Please try again.');
      this.resetPuzzle();
    }
  }

  /**
   * Start timer
   */
  startTimer() {
    let timeLeft = this.currentPuzzle.timeLimit;
    const timerElement = document.getElementById('timer');
    
    this.timer = setInterval(() => {
      timeLeft--;
      if (timerElement) {
        timerElement.textContent = `Time: ${timeLeft}s`;
      }
      
      if (timeLeft <= 0) {
        this.timeExpired();
      }
    }, 1000);
  }

  /**
   * Handle time expiration
   */
  timeExpired() {
    clearInterval(this.timer);
    this.showError('Time expired. Please try again.');
    this.resetPuzzle();
  }

  /**
   * Reset puzzle
   */
  resetPuzzle() {
    clearInterval(this.timer);
    this.selectedAnswer = undefined;
    this.generatePuzzle('puzzle-container', this.difficulty);
  }

  /**
   * Show success message
   */
  showSuccess(message) {
    const container = document.getElementById('puzzle-container');
    const successDiv = document.createElement('div');
    successDiv.style.backgroundColor = '#d4edda';
    successDiv.style.color = '#155724';
    successDiv.style.padding = '10px';
    successDiv.style.borderRadius = '5px';
    successDiv.style.marginTop = '10px';
    successDiv.style.textAlign = 'center';
    successDiv.textContent = message;
    container.appendChild(successDiv);
  }

  /**
   * Show error message
   */
  showError(message) {
    const container = document.getElementById('puzzle-container');
    const errorDiv = document.createElement('div');
    errorDiv.style.backgroundColor = '#f8d7da';
    errorDiv.style.color = '#721c24';
    errorDiv.style.padding = '10px';
    errorDiv.style.borderRadius = '5px';
    errorDiv.style.marginTop = '10px';
    errorDiv.style.textAlign = 'center';
    errorDiv.textContent = message;
    container.appendChild(errorDiv);
  }

  /**
   * Handle verification success
   */
  onVerificationSuccess() {
    // Generate temporary access token
    const accessToken = this.generateAccessToken();
    
    // Store token for session
    sessionStorage.setItem('cognitiveAccessToken', accessToken);
    sessionStorage.setItem('cognitiveAccessExpiry', Date.now() + (30 * 60 * 1000)); // 30 minutes
    
    // Notify parent system
    if (window.parent && window.parent.postMessage) {
      window.parent.postMessage({
        type: 'cognitive-verification-success',
        token: accessToken,
        puzzleId: this.puzzleId
      }, '*');
    }
  }

  /**
   * Generate access token
   */
  generateAccessToken() {
    return 'cog_' + this.generateUUID().substring(0, 16);
  }

  /**
   * Create canvas
   */
  createCanvas(containerId) {
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Container with ID '${containerId}' not found`);
    }
    
    this.canvas = document.createElement('canvas');
    this.canvas.width = 400;
    this.canvas.height = 300;
    this.ctx = this.canvas.getContext('2d');
  }

  /**
   * Generate UUID
   */
  generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * Generate segments
   */
  generateSegments(sides) {
    const segments = [];
    const centerX = 40;
    const centerY = 40;
    const radius = 28;
    
    for (let i = 0; i < sides; i++) {
      const angle = (i * 2 * Math.PI / sides) - Math.PI / 2;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      
      segments.push({
        x: x,
        y: y,
        angle: angle,
        isHighlighted: Math.random() > 0.7
      });
    }
    
    return segments;
  }

  /**
   * Generate connection points
   */
  generateConnectionPoints(sides) {
    const points = [];
    const centerX = 40;
    const centerY = 40;
    const innerRadius = 20;
    
    for (let i = 0; i < sides; i++) {
      const angle = (i * 2 * Math.PI / sides) - Math.PI / 2;
      const x = centerX + innerRadius * Math.cos(angle);
      const y = centerY + innerRadius * Math.sin(angle);
      
      points.push({
        x: x,
        y: y,
        angle: angle,
        isConnected: Math.random() > 0.5
      });
    }
    
    return points;
  }

  /**
   * Get random color
   */
  getRandomColor() {
    const colors = this.colorPalettes.primary;
    return colors[Math.floor(Math.random() * colors.length)];
  }

  /**
   * Cleanup
   */
  destroy() {
    if (this.timer) {
      clearInterval(this.timer);
    }
    if (this.canvas && this.canvas.parentElement) {
      this.canvas.parentElement.removeChild(this.canvas);
    }
  }
}

// Export for use
if (typeof window !== 'undefined') {
  window.CognitiveVerificationSystem = CognitiveVerificationSystem;
}

// Usage example:
/*
const cognitiveSystem = new CognitiveVerificationSystem();

// Generate puzzle
cognitiveSystem.generatePuzzle('puzzle-container', 'medium')
  .then(result => {
    if (result.success) {
      console.log('Puzzle generated:', result);
    }
  });
*/


