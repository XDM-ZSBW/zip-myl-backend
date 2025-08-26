// Privacy-safe version of sendTypingActivity
async function sendTypingActivity(target) {
  try {
    const text = target.value || target.textContent || '';
    
    // Only send anonymous, aggregated data
    await chrome.runtime.sendMessage({
      type: 'TYPING_ACTIVITY',
      data: {
        // Anonymous metrics only
        wordCount: text.trim().split(/\s+/).filter(word => word.length > 0).length,
        characterCount: text.length,
        lineCount: text.split('\n').length,
        
        // Anonymous domain only (no full URL)
        domain: new URL(window.location.href).hostname,
        
        // Content type detection (without actual content)
        contentType: this.detectContentType(text),
        
        // Typing patterns (without actual text)
        typingMetrics: {
          averageWordLength: this.calculateAverageWordLength(text),
          hasNumbers: /\d/.test(text),
          hasSpecialChars: /[!@#$%^&*(),.?":{}|<>]/.test(text),
          isAllCaps: text === text.toUpperCase() && text.length > 0,
          isAllLower: text === text.toLowerCase() && text.length > 0
        },
        
        timestamp: Date.now()
      }
    });
  } catch (error) {
    console.log('Could not send typing activity:', error);
  }
}

// Privacy-safe version of saveCurrentThought
async function saveCurrentThought() {
  if (!this.currentThought || !this.settings.enableThoughtTracking) return;

  try {
    const text = this.currentThought;
    
    // Only send anonymous, aggregated data
    await chrome.runtime.sendMessage({
      type: 'SAVE_THOUGHT',
      thought: {
        // Anonymous metrics only
        wordCount: text.trim().split(/\s+/).filter(word => word.length > 0).length,
        characterCount: text.length,
        lineCount: text.split('\n').length,
        
        // Anonymous domain only
        domain: new URL(window.location.href).hostname,
        
        // Content analysis (without actual content)
        contentAnalysis: {
          type: this.detectContentType(text),
          language: this.detectLanguage(text),
          sentiment: this.analyzeSentiment(text),
          topics: this.extractTopics(text) // Returns topic categories, not actual text
        },
        
        // Typing behavior patterns
        typingBehavior: {
          averageWordLength: this.calculateAverageWordLength(text),
          punctuationDensity: this.calculatePunctuationDensity(text),
          hasNumbers: /\d/.test(text),
          hasSpecialChars: /[!@#$%^&*(),.?":{}|<>]/.test(text)
        },
        
        timestamp: Date.now()
      }
    });
  } catch (error) {
    console.log('Could not save thought:', error);
  }
}

// Helper functions for anonymous analysis
function detectContentType(text) {
  if (text.includes('@') && text.includes('.')) return 'email';
  if (text.startsWith('http')) return 'url';
  if (text.match(/^\d{3}-\d{3}-\d{4}$/)) return 'phone';
  if (text.match(/^\d{5}$/)) return 'zipcode';
  if (text.length > 100) return 'long-form';
  if (text.length < 20) return 'short-form';
  return 'general';
}

function detectLanguage(text) {
  // Simple language detection based on character patterns
  const englishPattern = /^[a-zA-Z\s.,!?;:'"()-]+$/;
  const numberPattern = /^\d+$/;
  
  if (numberPattern.test(text)) return 'numeric';
  if (englishPattern.test(text)) return 'english';
  return 'mixed';
}

function analyzeSentiment(text) {
  // Simple sentiment analysis without storing actual text
  const positiveWords = ['good', 'great', 'excellent', 'happy', 'love', 'amazing'];
  const negativeWords = ['bad', 'terrible', 'hate', 'awful', 'sad', 'angry'];
  
  const words = text.toLowerCase().split(/\s+/);
  let positiveCount = 0;
  let negativeCount = 0;
  
  words.forEach(word => {
    if (positiveWords.includes(word)) positiveCount++;
    if (negativeWords.includes(word)) negativeCount++;
  });
  
  if (positiveCount > negativeCount) return 'positive';
  if (negativeCount > positiveCount) return 'negative';
  return 'neutral';
}

function extractTopics(text) {
  // Extract topic categories without storing actual text
  const topics = [];
  const lowerText = text.toLowerCase();
  
  if (lowerText.includes('work') || lowerText.includes('job') || lowerText.includes('career')) {
    topics.push('work');
  }
  if (lowerText.includes('family') || lowerText.includes('friend') || lowerText.includes('relationship')) {
    topics.push('personal');
  }
  if (lowerText.includes('money') || lowerText.includes('buy') || lowerText.includes('price')) {
    topics.push('finance');
  }
  if (lowerText.includes('health') || lowerText.includes('doctor') || lowerText.includes('medical')) {
    topics.push('health');
  }
  if (lowerText.includes('travel') || lowerText.includes('trip') || lowerText.includes('vacation')) {
    topics.push('travel');
  }
  
  return topics;
}

function calculateAverageWordLength(text) {
  const words = text.trim().split(/\s+/).filter(word => word.length > 0);
  if (words.length === 0) return 0;
  const totalLength = words.reduce((sum, word) => sum + word.length, 0);
  return Math.round(totalLength / words.length);
}

function calculatePunctuationDensity(text) {
  const punctuationCount = (text.match(/[.,!?;:'"()-]/g) || []).length;
  return text.length > 0 ? Math.round((punctuationCount / text.length) * 100) : 0;
}
