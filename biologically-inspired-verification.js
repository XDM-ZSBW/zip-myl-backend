/**
 * Biologically-Inspired Verification System
 * Leverages human body parallels for enhanced cognitive security
 * Based on immune system, neural patterns, and biological authentication
 */

class BiologicallyInspiredVerification {
  constructor() {
    this.immuneMemory = new Map(); // Stores previous "antigen" patterns
    this.neuralPathways = new Set(); // Tracks user interaction patterns
    this.biometricBaseline = null; // User's baseline interaction patterns
    this.adaptiveComplexity = 'medium';
    this.sessionId = null;
    
    // Immune system-inspired puzzle types
    this.immunePuzzleTypes = {
      'antigen_recognition': {
        name: 'Pattern Recognition',
        description: 'Identify the foreign pattern among familiar ones',
        difficulty: 'medium',
        timeLimit: 25,
        biologicalParallel: 'Immune cell antigen recognition'
      },
      'memory_cell_activation': {
        name: 'Memory Activation',
        description: 'Recall and match previously seen patterns',
        difficulty: 'hard',
        timeLimit: 35,
        biologicalParallel: 'Memory B-cell activation'
      },
      'antibody_diversity': {
        name: 'Diversity Detection',
        description: 'Find the pattern that doesn\'t belong',
        difficulty: 'easy',
        timeLimit: 20,
        biologicalParallel: 'Antibody diversity recognition'
      },
      'inflammatory_response': {
        name: 'Response Pattern',
        description: 'Complete the response sequence',
        difficulty: 'medium',
        timeLimit: 30,
        biologicalParallel: 'Inflammatory cascade response'
      }
    };
    
    // Neural system-inspired patterns
    this.neuralPatterns = {
      'synaptic_sequence': {
        name: 'Synaptic Sequence',
        description: 'Follow the neural pathway',
        difficulty: 'hard',
        timeLimit: 40,
        biologicalParallel: 'Neural synaptic transmission'
      },
      'myelin_pattern': {
        name: 'Myelin Pattern',
        description: 'Identify the insulated pathway',
        difficulty: 'medium',
        timeLimit: 25,
        biologicalParallel: 'Myelin sheath insulation'
      },
      'neurotransmitter_match': {
        name: 'Neurotransmitter Match',
        description: 'Match the chemical signal',
        difficulty: 'easy',
        timeLimit: 20,
        biologicalParallel: 'Neurotransmitter binding'
      }
    };
    
    // DNA-inspired cryptographic patterns
    this.dnaPatterns = {
      'base_pair_matching': {
        name: 'Base Pair Matching',
        description: 'Match the complementary pairs',
        difficulty: 'medium',
        timeLimit: 30,
        biologicalParallel: 'DNA base pair complementarity'
      },
      'mutation_detection': {
        name: 'Mutation Detection',
        description: 'Find the genetic mutation',
        difficulty: 'hard',
        timeLimit: 35,
        biologicalParallel: 'DNA mutation detection'
      },
      'epigenetic_marking': {
        name: 'Epigenetic Marking',
        description: 'Identify the modified pattern',
        difficulty: 'medium',
        timeLimit: 25,
        biologicalParallel: 'Epigenetic modifications'
      }
    };
    
    // Circulatory system-inspired patterns
    this.circulatoryPatterns = {
      'blood_type_matching': {
        name: 'Blood Type Matching',
        description: 'Match compatible types',
        difficulty: 'easy',
        timeLimit: 20,
        biologicalParallel: 'Blood type compatibility'
      },
      'oxygen_transport': {
        name: 'Oxygen Transport',
        description: 'Follow the oxygen pathway',
        difficulty: 'medium',
        timeLimit: 30,
        biologicalParallel: 'Oxygen transport chain'
      },
      'clotting_mechanism': {
        name: 'Clotting Mechanism',
        description: 'Complete the clotting cascade',
        difficulty: 'hard',
        timeLimit: 35,
        biologicalParallel: 'Blood clotting cascade'
      }
    };
  }

  /**
   * Initialize biological baseline for user
   */
  async initializeBiometricBaseline() {
    try {
      // Collect baseline interaction patterns
      const baseline = {
        responseTime: [],
        clickPatterns: [],
        mouseMovements: [],
        keyboardPatterns: [],
        puzzleSuccessRate: [],
        preferredDifficulty: 'medium',
        sessionDuration: [],
        errorPatterns: []
      };
      
      this.biometricBaseline = baseline;
      this.sessionId = this.generateSessionId();
      
      return {
        success: true,
        sessionId: this.sessionId,
        message: 'Biometric baseline initialized'
      };
    } catch (error) {
      console.error('Failed to initialize biometric baseline:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Generate biologically-inspired puzzle
   */
  async generateBiologicalPuzzle(containerId, systemType = 'immune') {
    try {
      const puzzleType = this.selectBiologicalPuzzleType(systemType);
      const puzzle = await this.createBiologicalPuzzle(puzzleType);
      
      // Store in immune memory
      this.immuneMemory.set(puzzle.id, {
        type: puzzle.type,
        difficulty: puzzle.difficulty,
        timestamp: Date.now(),
        userResponse: null
      });
      
      // Display puzzle
      this.displayBiologicalPuzzle(containerId, puzzle);
      
      return {
        success: true,
        puzzleId: puzzle.id,
        type: puzzle.type,
        system: systemType,
        biologicalParallel: puzzle.biologicalParallel
      };
    } catch (error) {
      console.error('Biological puzzle generation failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Select puzzle type based on biological system
   */
  selectBiologicalPuzzleType(systemType) {
    let availableTypes = [];
    
    switch (systemType) {
      case 'immune':
        availableTypes = Object.keys(this.immunePuzzleTypes);
        break;
      case 'neural':
        availableTypes = Object.keys(this.neuralPatterns);
        break;
      case 'dna':
        availableTypes = Object.keys(this.dnaPatterns);
        break;
      case 'circulatory':
        availableTypes = Object.keys(this.circulatoryPatterns);
        break;
      default:
        availableTypes = [
          ...Object.keys(this.immunePuzzleTypes),
          ...Object.keys(this.neuralPatterns),
          ...Object.keys(this.dnaPatterns),
          ...Object.keys(this.circulatoryPatterns)
        ];
    }
    
    const selectedType = availableTypes[Math.floor(Math.random() * availableTypes.length)];
    return selectedType;
  }

  /**
   * Create biological puzzle
   */
  async createBiologicalPuzzle(puzzleType) {
    const puzzle = {
      id: this.generateUUID(),
      type: puzzleType,
      system: this.getSystemFromType(puzzleType),
      biologicalParallel: this.getBiologicalParallel(puzzleType),
      difficulty: this.getDifficulty(puzzleType),
      timeLimit: this.getTimeLimit(puzzleType),
      patterns: this.generateBiologicalPatterns(puzzleType),
      correctAnswer: this.generateBiologicalAnswer(puzzleType),
      createdAt: Date.now(),
      expiresAt: Date.now() + (this.getTimeLimit(puzzleType) + 10) * 1000
    };
    
    return puzzle;
  }

  /**
   * Generate biological patterns based on puzzle type
   */
  generateBiologicalPatterns(puzzleType) {
    const patterns = [];
    
    switch (puzzleType) {
      case 'antigen_recognition':
        // Generate familiar patterns + one foreign pattern
        patterns.push(...this.generateFamiliarPatterns(3));
        patterns.push(this.generateForeignPattern());
        break;
        
      case 'memory_cell_activation':
        // Generate patterns based on previous immune memory
        patterns.push(...this.generateMemoryBasedPatterns());
        break;
        
      case 'antibody_diversity':
        // Generate diverse antibody-like patterns
        patterns.push(...this.generateAntibodyPatterns());
        break;
        
      case 'synaptic_sequence':
        // Generate neural pathway sequences
        patterns.push(...this.generateNeuralSequences());
        break;
        
      case 'base_pair_matching':
        // Generate DNA-like base pair patterns
        patterns.push(...this.generateDNAPatterns());
        break;
        
      case 'blood_type_matching':
        // Generate blood type compatibility patterns
        patterns.push(...this.generateBloodTypePatterns());
        break;
        
      default:
        patterns.push(...this.generateGenericBiologicalPatterns());
    }
    
    return patterns;
  }

  /**
   * Generate familiar patterns (like self-antigens)
   */
  generateFamiliarPatterns(count) {
    const patterns = [];
    const familiarShapes = ['circle', 'square', 'triangle'];
    const familiarColors = ['#1f77b4', '#2ca02c', '#ff7f0e'];
    
    for (let i = 0; i < count; i++) {
      patterns.push({
        id: this.generateUUID(),
        type: 'familiar',
        shape: familiarShapes[Math.floor(Math.random() * familiarShapes.length)],
        color: familiarColors[Math.floor(Math.random() * familiarColors.length)],
        pattern: this.generateFamiliarPattern(),
        isForeign: false
      });
    }
    
    return patterns;
  }

  /**
   * Generate foreign pattern (like non-self antigen)
   */
  generateForeignPattern() {
    const foreignShapes = ['star', 'diamond', 'hexagon'];
    const foreignColors = ['#d62728', '#9467bd', '#8c564b'];
    
    return {
      id: this.generateUUID(),
      type: 'foreign',
      shape: foreignShapes[Math.floor(Math.random() * foreignShapes.length)],
      color: foreignColors[Math.floor(Math.random() * foreignColors.length)],
      pattern: this.generateForeignPattern(),
      isForeign: true
    };
  }

  /**
   * Generate memory-based patterns
   */
  generateMemoryBasedPatterns() {
    const patterns = [];
    
    // Use previous immune memory to generate familiar patterns
    if (this.immuneMemory.size > 0) {
      const memoryEntries = Array.from(this.immuneMemory.entries());
      const recentMemory = memoryEntries[memoryEntries.length - 1];
      
      patterns.push({
        id: this.generateUUID(),
        type: 'memory',
        shape: 'circle',
        color: '#1f77b4',
        pattern: recentMemory[1].type,
        isMemory: true,
        memoryId: recentMemory[0]
      });
    }
    
    // Add new patterns to match against memory
    patterns.push(...this.generateFamiliarPatterns(3));
    
    return patterns;
  }

  /**
   * Generate antibody-like patterns
   */
  generateAntibodyPatterns() {
    const patterns = [];
    const antibodyTypes = ['IgG', 'IgM', 'IgA', 'IgE'];
    
    for (let i = 0; i < 4; i++) {
      patterns.push({
        id: this.generateUUID(),
        type: 'antibody',
        antibodyType: antibodyTypes[i],
        shape: this.generateAntibodyShape(antibodyTypes[i]),
        color: this.generateAntibodyColor(antibodyTypes[i]),
        pattern: this.generateAntibodyPattern(antibodyTypes[i]),
        diversity: this.generateDiversityScore()
      });
    }
    
    return patterns;
  }

  /**
   * Generate neural sequence patterns
   */
  generateNeuralSequences() {
    const patterns = [];
    const neurotransmitters = ['dopamine', 'serotonin', 'norepinephrine', 'acetylcholine'];
    
    for (let i = 0; i < 4; i++) {
      patterns.push({
        id: this.generateUUID(),
        type: 'neural',
        neurotransmitter: neurotransmitters[i],
        shape: this.generateNeuralShape(neurotransmitters[i]),
        color: this.generateNeuralColor(neurotransmitters[i]),
        pattern: this.generateNeuralPattern(neurotransmitters[i]),
        synapticStrength: this.generateSynapticStrength()
      });
    }
    
    return patterns;
  }

  /**
   * Generate DNA-like patterns
   */
  generateDNAPatterns() {
    const patterns = [];
    const basePairs = ['A-T', 'G-C', 'T-A', 'C-G'];
    
    for (let i = 0; i < 4; i++) {
      patterns.push({
        id: this.generateUUID(),
        type: 'dna',
        basePair: basePairs[i],
        shape: this.generateDNAShape(basePairs[i]),
        color: this.generateDNAColor(basePairs[i]),
        pattern: this.generateDNAPattern(basePairs[i]),
        mutation: Math.random() > 0.8 // 20% chance of mutation
      });
    }
    
    return patterns;
  }

  /**
   * Generate blood type patterns
   */
  generateBloodTypePatterns() {
    const patterns = [];
    const bloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
    
    for (let i = 0; i < 4; i++) {
      const bloodType = bloodTypes[Math.floor(Math.random() * bloodTypes.length)];
      patterns.push({
        id: this.generateUUID(),
        type: 'blood',
        bloodType: bloodType,
        shape: this.generateBloodShape(bloodType),
        color: this.generateBloodColor(bloodType),
        pattern: this.generateBloodPattern(bloodType),
        compatibility: this.generateCompatibilityMatrix(bloodType)
      });
    }
    
    return patterns;
  }

  /**
   * Display biological puzzle
   */
  displayBiologicalPuzzle(containerId, puzzle) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    // Clear container
    container.innerHTML = '';
    
    // Create puzzle header
    const header = document.createElement('div');
    header.innerHTML = `
      <h3>🧬 ${puzzle.biologicalParallel}</h3>
      <p>${this.getDescription(puzzle.type)}</p>
      <div class="biological-info">
        <span class="system-badge">${puzzle.system}</span>
        <span class="difficulty-badge">${puzzle.difficulty}</span>
        <span class="timer" id="bio-timer">Time: ${puzzle.timeLimit}s</span>
      </div>
    `;
    header.className = 'biological-header';
    container.appendChild(header);
    
    // Create pattern grid
    const grid = document.createElement('div');
    grid.className = 'biological-grid';
    
    // Add patterns to grid
    puzzle.patterns.forEach((pattern, index) => {
      const patternElement = this.createPatternElement(pattern, index);
      grid.appendChild(patternElement);
    });
    
    container.appendChild(grid);
    
    // Add submit button
    const submitBtn = document.createElement('button');
    submitBtn.textContent = 'Submit Biological Response';
    submitBtn.className = 'biological-submit-btn';
    submitBtn.addEventListener('click', () => this.submitBiologicalAnswer(puzzle));
    container.appendChild(submitBtn);
    
    // Start biological timer
    this.startBiologicalTimer(puzzle.timeLimit);
  }

  /**
   * Create pattern element
   */
  createPatternElement(pattern, index) {
    const element = document.createElement('div');
    element.className = 'biological-pattern';
    element.dataset.index = index;
    element.dataset.patternId = pattern.id;
    
    // Add biological metadata
    const metadata = document.createElement('div');
    metadata.className = 'biological-metadata';
    metadata.innerHTML = `
      <span class="pattern-type">${pattern.type}</span>
      ${pattern.antibodyType ? `<span class="antibody-type">${pattern.antibodyType}</span>` : ''}
      ${pattern.neurotransmitter ? `<span class="neurotransmitter">${pattern.neurotransmitter}</span>` : ''}
      ${pattern.basePair ? `<span class="base-pair">${pattern.basePair}</span>` : ''}
      ${pattern.bloodType ? `<span class="blood-type">${pattern.bloodType}</span>` : ''}
    `;
    element.appendChild(metadata);
    
    // Add visual pattern
    const visual = this.createVisualPattern(pattern);
    element.appendChild(visual);
    
    // Add click handler
    element.addEventListener('click', () => this.handleBiologicalSelection(index, element));
    
    return element;
  }

  /**
   * Create visual pattern representation
   */
  createVisualPattern(pattern) {
    const canvas = document.createElement('canvas');
    canvas.width = 100;
    canvas.height = 100;
    const ctx = canvas.getContext('2d');
    
    // Clear canvas
    ctx.clearRect(0, 0, 100, 100);
    
    // Draw background
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, 100, 100);
    
    // Draw pattern based on type
    switch (pattern.type) {
      case 'familiar':
      case 'foreign':
        this.drawShapePattern(ctx, pattern);
        break;
      case 'antibody':
        this.drawAntibodyPattern(ctx, pattern);
        break;
      case 'neural':
        this.drawNeuralPattern(ctx, pattern);
        break;
      case 'dna':
        this.drawDNAPattern(ctx, pattern);
        break;
      case 'blood':
        this.drawBloodPattern(ctx, pattern);
        break;
      default:
        this.drawGenericPattern(ctx, pattern);
    }
    
    return canvas;
  }

  /**
   * Draw shape pattern
   */
  drawShapePattern(ctx, pattern) {
    ctx.strokeStyle = pattern.color;
    ctx.lineWidth = 3;
    ctx.fillStyle = pattern.color + '40'; // Add transparency
    
    const centerX = 50;
    const centerY = 50;
    const radius = 30;
    
    switch (pattern.shape) {
      case 'circle':
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
        break;
      case 'square':
        ctx.fillRect(centerX - radius, centerY - radius, radius * 2, radius * 2);
        ctx.strokeRect(centerX - radius, centerY - radius, radius * 2, radius * 2);
        break;
      case 'triangle':
        ctx.beginPath();
        ctx.moveTo(centerX, centerY - radius);
        ctx.lineTo(centerX - radius, centerY + radius);
        ctx.lineTo(centerX + radius, centerY + radius);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        break;
      case 'star':
        this.drawStar(ctx, centerX, centerY, radius);
        break;
      case 'diamond':
        ctx.beginPath();
        ctx.moveTo(centerX, centerY - radius);
        ctx.lineTo(centerX + radius, centerY);
        ctx.lineTo(centerX, centerY + radius);
        ctx.lineTo(centerX - radius, centerY);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        break;
      case 'hexagon':
        this.drawHexagon(ctx, centerX, centerY, radius);
        break;
    }
  }

  /**
   * Draw antibody pattern
   */
  drawAntibodyPattern(ctx, pattern) {
    ctx.strokeStyle = pattern.color;
    ctx.lineWidth = 2;
    
    const centerX = 50;
    const centerY = 50;
    
    // Draw Y-shaped antibody
    ctx.beginPath();
    ctx.moveTo(centerX, centerY - 25);
    ctx.lineTo(centerX, centerY);
    ctx.lineTo(centerX - 15, centerY + 20);
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(centerX + 15, centerY + 20);
    ctx.stroke();
    
    // Add binding sites
    ctx.fillStyle = pattern.color;
    ctx.beginPath();
    ctx.arc(centerX - 15, centerY + 20, 3, 0, 2 * Math.PI);
    ctx.arc(centerX + 15, centerY + 20, 3, 0, 2 * Math.PI);
    ctx.fill();
  }

  /**
   * Draw neural pattern
   */
  drawNeuralPattern(ctx, pattern) {
    ctx.strokeStyle = pattern.color;
    ctx.lineWidth = 2;
    
    const centerX = 50;
    const centerY = 50;
    
    // Draw neuron with dendrites
    ctx.beginPath();
    ctx.moveTo(centerX, centerY - 20);
    ctx.lineTo(centerX, centerY + 20);
    ctx.stroke();
    
    // Draw dendrites
    for (let i = 0; i < 3; i++) {
      const y = centerY - 10 + i * 10;
      ctx.beginPath();
      ctx.moveTo(centerX, y);
      ctx.lineTo(centerX - 15, y - 5);
      ctx.moveTo(centerX, y);
      ctx.lineTo(centerX + 15, y + 5);
      ctx.stroke();
    }
    
    // Add synaptic vesicles
    ctx.fillStyle = pattern.color;
    ctx.beginPath();
    ctx.arc(centerX, centerY + 20, 4, 0, 2 * Math.PI);
    ctx.fill();
  }

  /**
   * Draw DNA pattern
   */
  drawDNAPattern(ctx, pattern) {
    ctx.strokeStyle = pattern.color;
    ctx.lineWidth = 2;
    
    const centerX = 50;
    const centerY = 50;
    
    // Draw double helix
    for (let i = 0; i < 20; i++) {
      const y = centerY - 20 + i * 2;
      const x1 = centerX - 15 + Math.sin(i * 0.5) * 5;
      const x2 = centerX + 15 + Math.sin(i * 0.5 + Math.PI) * 5;
      
      ctx.beginPath();
      ctx.moveTo(x1, y);
      ctx.lineTo(x2, y);
      ctx.stroke();
    }
    
    // Add base pairs
    ctx.fillStyle = pattern.color;
    for (let i = 0; i < 5; i++) {
      const y = centerY - 15 + i * 6;
      const x1 = centerX - 15 + Math.sin(i * 1.5) * 5;
      const x2 = centerX + 15 + Math.sin(i * 1.5 + Math.PI) * 5;
      
      ctx.beginPath();
      ctx.arc(x1, y, 2, 0, 2 * Math.PI);
      ctx.arc(x2, y, 2, 0, 2 * Math.PI);
      ctx.fill();
    }
  }

  /**
   * Draw blood pattern
   */
  drawBloodPattern(ctx, pattern) {
    ctx.strokeStyle = pattern.color;
    ctx.lineWidth = 2;
    ctx.fillStyle = pattern.color + '60';
    
    const centerX = 50;
    const centerY = 50;
    const radius = 25;
    
    // Draw blood cell
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();
    
    // Add blood type markers
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(pattern.bloodType, centerX, centerY + 4);
  }

  /**
   * Handle biological pattern selection
   */
  handleBiologicalSelection(index, element) {
    this.selectedBiologicalAnswer = index;
    
    // Update visual feedback
    const patterns = document.querySelectorAll('.biological-pattern');
    patterns.forEach((pattern, i) => {
      if (i === index) {
        pattern.classList.add('selected');
        pattern.style.borderColor = '#4CAF50';
        pattern.style.backgroundColor = '#f0f8f0';
      } else {
        pattern.classList.remove('selected');
        pattern.style.borderColor = '#ddd';
        pattern.style.backgroundColor = 'transparent';
      }
    });
  }

  /**
   * Submit biological answer
   */
  submitBiologicalAnswer(puzzle) {
    if (this.selectedBiologicalAnswer === undefined) {
      alert('Please select a biological response first');
      return;
    }
    
    const isCorrect = this.selectedBiologicalAnswer === puzzle.correctAnswer;
    
    // Update immune memory
    const memoryEntry = this.immuneMemory.get(puzzle.id);
    if (memoryEntry) {
      memoryEntry.userResponse = this.selectedBiologicalAnswer;
      memoryEntry.correct = isCorrect;
      memoryEntry.responseTime = Date.now() - puzzle.createdAt;
    }
    
    if (isCorrect) {
      this.showBiologicalSuccess('Biological verification successful! Access granted.');
      this.onBiologicalVerificationSuccess(puzzle);
    } else {
      this.showBiologicalError('Incorrect biological response. Please try again.');
      this.resetBiologicalPuzzle();
    }
  }

  /**
   * Handle biological verification success
   */
  onBiologicalVerificationSuccess(puzzle) {
    // Generate biologically-inspired access token
    const accessToken = this.generateBiologicalAccessToken(puzzle);
    
    // Store token with biological metadata
    sessionStorage.setItem('biologicalAccessToken', accessToken);
    sessionStorage.setItem('biologicalAccessExpiry', Date.now() + (30 * 60 * 1000));
    sessionStorage.setItem('biologicalSystem', puzzle.system);
    sessionStorage.setItem('biologicalParallel', puzzle.biologicalParallel);
    
    // Notify parent system
    if (window.parent && window.parent.postMessage) {
      window.parent.postMessage({
        type: 'biological-verification-success',
        token: accessToken,
        puzzleId: puzzle.id,
        system: puzzle.system,
        biologicalParallel: puzzle.biologicalParallel
      }, '*');
    }
  }

  /**
   * Generate biologically-inspired access token
   */
  generateBiologicalAccessToken(puzzle) {
    const systemPrefix = puzzle.system.substring(0, 3).toUpperCase();
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `${systemPrefix}_${timestamp}_${random}`;
  }

  // Helper methods
  generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  generateSessionId() {
    return 'bio_' + Date.now().toString(36) + Math.random().toString(36).substring(2);
  }

  getSystemFromType(type) {
    if (this.immunePuzzleTypes[type]) return 'immune';
    if (this.neuralPatterns[type]) return 'neural';
    if (this.dnaPatterns[type]) return 'dna';
    if (this.circulatoryPatterns[type]) return 'circulatory';
    return 'mixed';
  }

  getBiologicalParallel(type) {
    if (this.immunePuzzleTypes[type]) return this.immunePuzzleTypes[type].biologicalParallel;
    if (this.neuralPatterns[type]) return this.neuralPatterns[type].biologicalParallel;
    if (this.dnaPatterns[type]) return this.dnaPatterns[type].biologicalParallel;
    if (this.circulatoryPatterns[type]) return this.circulatoryPatterns[type].biologicalParallel;
    return 'Biological pattern recognition';
  }

  getDifficulty(type) {
    if (this.immunePuzzleTypes[type]) return this.immunePuzzleTypes[type].difficulty;
    if (this.neuralPatterns[type]) return this.neuralPatterns[type].difficulty;
    if (this.dnaPatterns[type]) return this.dnaPatterns[type].difficulty;
    if (this.circulatoryPatterns[type]) return this.circulatoryPatterns[type].difficulty;
    return 'medium';
  }

  getTimeLimit(type) {
    if (this.immunePuzzleTypes[type]) return this.immunePuzzleTypes[type].timeLimit;
    if (this.neuralPatterns[type]) return this.neuralPatterns[type].timeLimit;
    if (this.dnaPatterns[type]) return this.dnaPatterns[type].timeLimit;
    if (this.circulatoryPatterns[type]) return this.circulatoryPatterns[type].timeLimit;
    return 30;
  }

  getDescription(type) {
    if (this.immunePuzzleTypes[type]) return this.immunePuzzleTypes[type].description;
    if (this.neuralPatterns[type]) return this.neuralPatterns[type].description;
    if (this.dnaPatterns[type]) return this.dnaPatterns[type].description;
    if (this.circulatoryPatterns[type]) return this.circulatoryPatterns[type].description;
    return 'Complete the biological pattern';
  }

  // Additional helper methods for pattern generation
  generateFamiliarPattern() { return 'familiar_' + Math.random().toString(36).substring(2, 8); }
  generateForeignPattern() { return 'foreign_' + Math.random().toString(36).substring(2, 8); }
  generateAntibodyShape(type) { return type === 'IgG' ? 'Y' : 'T'; }
  generateAntibodyColor(type) { return type === 'IgG' ? '#1f77b4' : '#ff7f0e'; }
  generateAntibodyPattern(type) { return type + '_' + Math.random().toString(36).substring(2, 6); }
  generateDiversityScore() { return Math.floor(Math.random() * 100) + 1; }
  generateNeuralShape(nt) { return nt === 'dopamine' ? 'circle' : 'square'; }
  generateNeuralColor(nt) { return nt === 'dopamine' ? '#2ca02c' : '#d62728'; }
  generateNeuralPattern(nt) { return nt + '_' + Math.random().toString(36).substring(2, 6); }
  generateSynapticStrength() { return Math.floor(Math.random() * 10) + 1; }
  generateDNAShape(bp) { return bp === 'A-T' ? 'helix' : 'ladder'; }
  generateDNAColor(bp) { return bp === 'A-T' ? '#1f77b4' : '#ff7f0e'; }
  generateDNAPattern(bp) { return bp + '_' + Math.random().toString(36).substring(2, 6); }
  generateBloodShape(bt) { return bt.includes('+') ? 'circle' : 'diamond'; }
  generateBloodColor(bt) { return bt.includes('A') ? '#d62728' : '#2ca02c'; }
  generateBloodPattern(bt) { return bt + '_' + Math.random().toString(36).substring(2, 6); }
  generateCompatibilityMatrix(bt) { return { compatible: ['O+', 'O-'], incompatible: ['AB+'] }; }

  // Drawing helper methods
  drawStar(ctx, x, y, radius) {
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const angle = (i * 2 * Math.PI / 5) - Math.PI / 2;
      const x1 = x + radius * Math.cos(angle);
      const y1 = y + radius * Math.sin(angle);
      if (i === 0) ctx.moveTo(x1, y1);
      else ctx.lineTo(x1, y1);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  drawHexagon(ctx, x, y, radius) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (i * 2 * Math.PI / 6) - Math.PI / 2;
      const x1 = x + radius * Math.cos(angle);
      const y1 = y + radius * Math.sin(angle);
      if (i === 0) ctx.moveTo(x1, y1);
      else ctx.lineTo(x1, y1);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // Timer and UI methods
  startBiologicalTimer(timeLimit) {
    let timeLeft = timeLimit;
    const timerElement = document.getElementById('bio-timer');
    
    this.biologicalTimer = setInterval(() => {
      timeLeft--;
      if (timerElement) {
        timerElement.textContent = `Time: ${timeLeft}s`;
      }
      
      if (timeLeft <= 0) {
        this.biologicalTimeExpired();
      }
    }, 1000);
  }

  biologicalTimeExpired() {
    clearInterval(this.biologicalTimer);
    this.showBiologicalError('Biological response time expired. Please try again.');
    this.resetBiologicalPuzzle();
  }

  resetBiologicalPuzzle() {
    clearInterval(this.biologicalTimer);
    this.selectedBiologicalAnswer = undefined;
    // Regenerate puzzle
  }

  showBiologicalSuccess(message) {
    const container = document.querySelector('#puzzle-container');
    const successDiv = document.createElement('div');
    successDiv.className = 'biological-success';
    successDiv.textContent = message;
    container.appendChild(successDiv);
  }

  showBiologicalError(message) {
    const container = document.querySelector('#puzzle-container');
    const errorDiv = document.createElement('div');
    errorDiv.className = 'biological-error';
    errorDiv.textContent = message;
    container.appendChild(errorDiv);
  }

  generateBiologicalAnswer(puzzleType) {
    return Math.floor(Math.random() * 4); // 0-3 for answer options
  }

  generateGenericBiologicalPatterns() {
    return this.generateFamiliarPatterns(4);
  }
}

// Export for use
if (typeof window !== 'undefined') {
  window.BiologicallyInspiredVerification = BiologicallyInspiredVerification;
}


