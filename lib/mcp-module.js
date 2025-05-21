/**
 * Spanish Learning MCP Server Module
 * 
 * This module exports the MCP functionality as a server-side service
 * with enhanced features for multi-user access, caching, and tiered capabilities.
 * It maintains backward compatibility with client-side usage while adding
 * server-specific optimizations.
 */

import Anthropic from '@anthropic-ai/sdk';
import { getVocabularyItems, getGrammarRules } from './appwrite.js';
import NodeCache from 'node-cache';
import { Pool } from 'generic-pool';
import pino from 'pino';

// Server-side logger
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  name: 'mcp-module'
});

// Cache for storing contexts and query results to improve performance
const cache = new NodeCache({
  stdTTL: 60 * 15, // Default TTL: 15 minutes
  checkperiod: 60, // Check for expired items every 60 seconds
  useClones: false // Don't clone objects (for performance)
});

export const ContextType = {
  VOCABULARY: 'vocabulary',
  GRAMMAR: 'grammar',
  MIXED: 'mixed',
  // New context types for server-side enhanced functionality
  CONVERSATION: 'conversation',
  EXERCISE: 'exercise'
};

// Access tiers for different user levels
export const AccessTier = {
  FREE: 'free',
  BASIC: 'basic',
  PREMIUM: 'premium'
};

export class McpConfig {
  constructor({
    apiKey,
    model = 'claude-3-opus-20240229',
    maxTokens = 1000,
    temperature = 0.7,
    useAppwrite = false,
    customData = null,
    // Server-side specific options
    enableCaching = true,
    cacheTTL = 60 * 15, // 15 minutes
    connectionPoolSize = 10,
    connectionPoolTimeout = 30000, // 30 seconds
    logLevel = 'info',
    rateLimitOptions = {
      free: { maxQueriesPerMinute: 2, maxItemsPerRequest: 5 },
      basic: { maxQueriesPerMinute: 5, maxItemsPerRequest: 20 },
      premium: { maxQueriesPerMinute: 20, maxItemsPerRequest: 50 }
    }
  }) {
    // Original options
    this.apiKey = apiKey;
    this.model = model;
    this.maxTokens = maxTokens;
    this.temperature = temperature;
    this.useAppwrite = useAppwrite;
    this.customData = customData;
    
    // Server-side specific options
    this.enableCaching = enableCaching;
    this.cacheTTL = cacheTTL;
    this.connectionPoolSize = connectionPoolSize;
    this.connectionPoolTimeout = connectionPoolTimeout;
    this.logLevel = logLevel;
    this.rateLimitOptions = rateLimitOptions;
    
    // Set up logger with the configured level
    if (typeof logger?.level === 'function') {
      logger.level = this.logLevel;
    }
  }
}

export class ContextOptions {
  constructor({
    contextType = ContextType.VOCABULARY,
    categories = [],
    difficultyLevel = null,
    searchTerm = null,
    maxItems = 10,
    includeExamples = true,
    // Enhanced options for server-side use
    accessTier = AccessTier.FREE,
    userId = null,
    disableCache = false,
    includeExercises = false
  }) {
    this.contextType = contextType;
    this.categories = categories;
    this.difficultyLevel = difficultyLevel;
    this.searchTerm = searchTerm;
    this.maxItems = maxItems;
    this.includeExamples = includeExamples;
    
    // Server-side specific options
    this.accessTier = accessTier;
    this.userId = userId;
    this.disableCache = disableCache;
    this.includeExercises = includeExercises;
  }
  
  /**
   * Generate a cache key for this context options configuration
   */
  getCacheKey() {
    return `context:${this.contextType}:${this.categories.sort().join(',')}:${this.difficultyLevel || 'all'}:${this.searchTerm || 'all'}:${this.maxItems}:${this.includeExamples ? 1 : 0}:${this.includeExercises ? 1 : 0}`;
  }
  
  /**
   * Apply access tier restrictions to the options
   */
  applyTierRestrictions() {
    const tierLimits = {
      [AccessTier.FREE]: 5,
      [AccessTier.BASIC]: 20,
      [AccessTier.PREMIUM]: 50
    };
    
    // Apply maxItems limit based on tier
    if (tierLimits[this.accessTier] && this.maxItems > tierLimits[this.accessTier]) {
      this.maxItems = tierLimits[this.accessTier];
    }
    
    // Certain features are only available for higher tiers
    if (this.accessTier === AccessTier.FREE) {
      this.includeExercises = false;
    }
    
    return this;
  }
}

/**
 * Connection pool for Anthropic API clients
 * This improves performance for server environments with many concurrent requests
 */
class AnthropicConnectionPool {
  constructor(apiKey, poolSize = 10) {
    this.createPool(apiKey, poolSize);
  }
  
  createPool(apiKey, size) {
    const factory = {
      create: async () => {
        return new Anthropic({ apiKey });
      },
      destroy: async (client) => {
        // No specific cleanup needed for Anthropic client
        return;
      }
    };
    
    const opts = {
      max: size,
      min: 2,
      testOnBorrow: true,
      acquireTimeoutMillis: 30000 // 30 seconds
    };
    
    this.pool = Pool(factory, opts);
    logger.info(`Created Anthropic connection pool with size ${size}`);
  }
  
  async acquire() {
    try {
      return await this.pool.acquire();
    } catch (error) {
      logger.error({ error }, 'Error acquiring Anthropic client from pool');
      throw error;
    }
  }
  
  async release(client) {
    try {
      await this.pool.release(client);
    } catch (error) {
      logger.warn({ error }, 'Error releasing Anthropic client back to pool');
    }
  }
  
  async destroy() {
    try {
      await this.pool.drain();
      await this.pool.clear();
      logger.info('Anthropic connection pool drained and destroyed');
    } catch (error) {
      logger.error({ error }, 'Error destroying Anthropic connection pool');
    }
  }
}

/**
 * Spanish MCP class that provides context-aware AI responses
 */
export class SpanishMcp {
  /**
   * Create a new Spanish MCP instance
   * @param {McpConfig} config - Configuration options
   */
  constructor(config) {
    this.config = config;
    
    // Create a single client for backward compatibility with simple applications
    this.anthropic = new Anthropic({
      apiKey: config.apiKey
    });
    
    // For server-side use, create a connection pool
    if (config.connectionPoolSize > 1) {
      this.connectionPool = new AnthropicConnectionPool(
        config.apiKey, 
        config.connectionPoolSize
      );
    }
    
    this.customVocabulary = config.customData?.vocabulary || null;
    this.customGrammar = config.customData?.grammar || null;
    
    // Set up request tracking for rate limiting
    this.requestCounts = new Map();
    
    // Set up periodic cleanup of request counts
    setInterval(() => {
      this.requestCounts.clear();
    }, 60 * 1000); // Clear every minute
    
    logger.info('SpanishMcp initialized with server-side capabilities');
  }
  
  /**
   * Check if the user's request rate is within limits for their tier
   * @param {string} userId - User ID
   * @param {string} tier - Access tier
   * @returns {boolean} - True if within limits, false if exceeded
   */
  checkRateLimit(userId, tier = AccessTier.FREE) {
    if (!userId) return true; // Skip checks if no user ID provided
    
    const key = `${userId}:query`;
    const count = this.requestCounts.get(key) || 0;
    const limit = this.config.rateLimitOptions[tier]?.maxQueriesPerMinute || 
                  this.config.rateLimitOptions.free.maxQueriesPerMinute;
    
    if (count >= limit) {
      logger.warn({ userId, tier, count, limit }, 'Rate limit exceeded');
      return false;
    }
    
    // Increment the count
    this.requestCounts.set(key, count + 1);
    return true;
  }
  
  /**
   * Get context based on options, with caching and tier restrictions
   * @param {ContextOptions} options - Context options
   * @returns {Promise<string>} - Generated context
   */
  async getContext(options) {
    // Apply tier restrictions if tier is provided
    if (options.accessTier) {
      options.applyTierRestrictions();
    }
    
    // Check cache if enabled
    if (this.config.enableCaching && !options.disableCache) {
      const cacheKey = options.getCacheKey();
      const cachedContext = cache.get(cacheKey);
      
      if (cachedContext) {
        logger.debug({ cacheKey }, 'Context cache hit');
        return cachedContext;
      }
      
      logger.debug({ cacheKey }, 'Context cache miss');
    }
    
    // Generate the context
    let contextParts = [];
    
    try {
      switch (options.contextType) {
        case ContextType.VOCABULARY:
          contextParts.push(await this.getVocabularyContext(options));
          break;
        case ContextType.GRAMMAR:
          contextParts.push(await this.getGrammarContext(options));
          break;
        case ContextType.MIXED:
          contextParts.push(await this.getVocabularyContext(options));
          contextParts.push(await this.getGrammarContext(options));
          break;
        case ContextType.CONVERSATION:
          // Only available for basic and premium tiers
          if (options.accessTier === AccessTier.FREE) {
            logger.warn('Free tier attempted to access conversation context');
            contextParts.push(await this.getVocabularyContext(options));
          } else {
            contextParts.push(await this.getConversationContext(options));
          }
          break;
        case ContextType.EXERCISE:
          // Only available for premium tier
          if (options.accessTier !== AccessTier.PREMIUM) {
            logger.warn(`${options.accessTier} tier attempted to access exercise context`);
            contextP
  
  async getVocabularyContext(options) {
    let items = [];
    
    if (this.config.useAppwrite) {
      const filters = {};
      
      if (options.categories?.length) {
        filters.category = options.categories[0];
      }
      
      if (options.difficultyLevel) {
        filters.difficultyLevel = options.difficultyLevel;
      }
      
      if (options.searchTerm) {
        filters.searchTerm = options.searchTerm;
      }
      
      const result = await getVocabularyItems(
        filters,
        { limit: options.maxItems || 10 }
      );
      
      items = result.items;
    } else if (this.customVocabulary) {
      items = this.customVocabulary;
      if (options.categories?.length) {
        items = items.filter(item => options.categories.includes(item.category));
      }
      
      if (options.difficultyLevel) {
        items = items.filter(item => item.difficultyLevel === options.difficultyLevel);
      }
      
      if (options.searchTerm) {
        const searchTerm = options.searchTerm.toLowerCase();
        items = items.filter(item => 
          item.word.toLowerCase().includes(searchTerm) || 
          item.translation.toLowerCase().includes(searchTerm)
        );
      }
      items = items.slice(0, options.maxItems || 10);
    } else {
      return "No vocabulary data available.";
    }
    
    return this.formatVocabularyForContext(items, options.includeExamples);
  }
  
  async getGrammarContext(options) {
    let items = [];
    
    if (this.config.useAppwrite) {
      const filters = {};
      
      if (options.categories?.length) {
        filters.category = options.categories[0];
      }
      
      if (options.difficultyLevel) {
        filters.difficultyLevel = options.difficultyLevel;
      }
      
      if (options.searchTerm) {
        filters.searchTerm = options.searchTerm;
      }
      
      const result = await getGrammarRules(
        filters,
        { limit: options.maxItems || 5 }
      );
      
      items = result.items;
    } else if (this.customGrammar) {
      items = this.customGrammar;
      if (options.categories?.length) {
        items = items.filter(item => options.categories.includes(item.category));
      }
      
      if (options.difficultyLevel) {
        items = items.filter(item => item.difficultyLevel === options.difficultyLevel);
      }
      
      if (options.searchTerm) {
        const searchTerm = options.searchTerm.toLowerCase();
        items = items.filter(item => 
          item.title.toLowerCase().includes(searchTerm) || 
          item.explanation.toLowerCase().includes(searchTerm)
        );
      }
      items = items.slice(0, options.maxItems || 5);
    } else {
      return "No grammar data available.";
    }
    
    return this.formatGrammarForContext(items, options.includeExamples);
  }

  formatVocabularyForContext(items, includeExamples = true) {
    if (items.length === 0) {
      return "No vocabulary items found.";
    }
    
    let context = "# Spanish Vocabulary Reference\n\n";
    const categorizedItems = {};
    
    items.forEach(item => {
      if (!categorizedItems[item.category]) {
        categorizedItems[item.category] = [];
      }
      categorizedItems[item.category].push(item);
    });
    
    Object.entries(categorizedItems).forEach(([category, categoryItems]) => {
      context += `## ${this.capitalizeFirstLetter(category)}\n\n`;
      
      categoryItems.forEach(item => {
        context += `### ${item.word}\n`;
        context += `- **Translation:** ${item.translation}\n`;
        context += `- **Difficulty:** ${item.difficultyLevel}\n`;
        
        if (item.notes) {
          context += `- **Notes:** ${item.notes}\n`;
        }
        
        if (includeExamples && item.usageExamples && item.usageExamples.length > 0) {
          context += "\n**Examples:**\n";
          
          item.usageExamples.forEach(example => {
            context += `- Spanish: ${example.spanish}\n`;
            context += `  English: ${example.english}\n`;
            
            if (example.explanation) {
              context += `  Explanation: ${example.explanation}\n`;
            }
            
            context += "\n";
          });
        }
        
        context += "\n";
      });
    });
    
    return context;
  }

  formatGrammarForContext(items, includeExamples = true) {
    if (items.length === 0) {
      return "No grammar rules found.";
    }
    
    let context = "# Spanish Grammar Reference\n\n";
    const categorizedItems = {};
    
    items.forEach(item => {
      if (!categorizedItems[item.category]) {
        categorizedItems[item.category] = [];
      }
      categorizedItems[item.category].push(item);
    });

    Object.entries(categorizedItems).forEach(([category, categoryItems]) => {
      context += `## ${this.formatCategory(category)}\n\n`;
      
      categoryItems.forEach(item => {
        context += `### ${item.title}\n`;
        context += `- **Difficulty:** ${item.difficultyLevel}\n\n`;
        context += `${item.explanation}\n\n`;
        
        if (includeExamples && item.examples && item.examples.length > 0) {
          context += "**Examples:**\n";
          item.examples.forEach(example => {
            context += `- Spanish: ${example.spanish}\n`;
            context += `  English: ${example.english}\n`;
            
            if (example.explanation) {
              context += `  Explanation: ${example.explanation}\n`;
            }
            context += "\n";
          });
        }
        if (item.tags && item.tags.length > 0) {
          context += `**Tags:** ${item.tags.join(', ')}\n\n`;
        }
      });
    });
    return context;
  }
  formatCategory(category) {
    return category
      .split('_')
      .map(word => this.capitalizeFirstLetter(word))
      .join(' ');
  }
  capitalizeFirstLetter(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
  
  /**
   * Query Claude with context
   * @param {string} userMessage - User's question
   * @param {ContextOptions} contextOptions - Context options
   * @returns {Promise<string>} Claude's response
   */
  async queryWithContext(userMessage, contextOptions) {
    const context = await this.getContext(contextOptions);
    
    const systemPrompt = `You are a helpful Spanish language tutor. Use the following Spanish language reference materials to help answer the user's question:\n\n${context}`;
    
    try {
      const response = await this.anthropic.messages.create({
        model: this.config.model,
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
        system: systemPrompt,
        messages: [
          { role: 'user', content: userMessage }
        ]
      });
      
      if (response.content[0].type === 'text') {
        return response.content[0].text;
      } else {
        return "No text response received from Claude";
      }
    } catch (error) {
      console.error('Error querying Claude:', error);
      throw new Error('Failed to get response from Claude');
    }
  }
}

/**
 * Create a Spanish MCP instance with default configuration
 * @param {string} apiKey - Anthropic API key
 * @param {object} options - Additional configuration options
 * @returns {SpanishMcp} Spanish MCP instance
 */
export function createSpanishMcp(apiKey, options = {}) {
  const config = new McpConfig({
    apiKey,
    ...options
  });
  
  return new SpanishMcp(config);
}

/**
 * Sample vocabulary data for testing
 */
export const sampleVocabulary = [
  {
    word: "hola",
    translation: "hello",
    category: "greeting",
    difficultyLevel: "beginner",
    usageExamples: [
      { spanish: "¡Hola! ¿Cómo estás?", english: "Hello! How are you?" },
      { spanish: "Hola a todos.", english: "Hello everyone." }
    ]
  },
  {
    word: "adiós",
    translation: "goodbye",
    category: "greeting",
    difficultyLevel: "beginner",
    usageExamples: [
      { spanish: "Adiós, hasta mañana.", english: "Goodbye, see you tomorrow." },
      { spanish: "Le dije adiós a mi amigo.", english: "I said goodbye to my friend." }
    ]
  },
  {
    word: "gracias",
    translation: "thank you",
    category: "greeting",
    difficultyLevel: "beginner",
    usageExamples: [
      { spanish: "Muchas gracias por tu ayuda.", english: "Thank you very much for your help." },
      { spanish: "Gracias por venir.", english: "Thank you for coming." }
    ]
  },
  {
    word: "hablar",
    translation: "to speak",
    category: "verb",
    difficultyLevel: "beginner",
    usageExamples: [
      { spanish: "Me gusta hablar español.", english: "I like to speak Spanish." },
      { spanish: "¿Puedes hablar más despacio?", english: "Can you speak more slowly?" }
    ]
  }
];

/**
 * Sample grammar data for testing
 */
export const sampleGrammar = [
  {
    title: "Present Tense Conjugation",
    category: "verb_tense",
    difficultyLevel: "beginner",
    explanation: "In Spanish, verbs in the present tense change their endings based on the subject. Regular -ar verbs follow a pattern: -o, -as, -a, -amos, -áis, -an.",
    examples: [
      { spanish: "Yo hablo español.", english: "I speak Spanish." },
      { spanish: "Tú hablas muy rápido.", english: "You speak very fast." },
      { spanish: "Ella habla tres idiomas.", english: "She speaks three languages." }
    ]
  },
  {
    title: "Gender Agreement",
    category: "adjectives",
    difficultyLevel: "beginner",
    explanation: "In Spanish, adjectives must agree in gender and number with the nouns they modify. Masculine adjectives typically end in -o, while feminine adjectives end in -a.",
    examples: [
      { spanish: "El libro rojo", english: "The red book" },
      { spanish: "La casa roja", english: "The red house" },
      { spanish: "Los libros rojos", english: "The red books" }
    ]
  }
];