import Anthropic from '@anthropic-ai/sdk';
import { getVocabularyItems, getGrammarRules } from './appwrite.js';

const NodeCache = require('node-cache');
const GenericPool = require('generic-pool');
const pino = require('pino');

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  name: 'spanish-mcp-server'
});

export enum ContextType {
  VOCABULARY = 'vocabulary',
  GRAMMAR = 'grammar',
  MIXED = 'mixed',
  CONVERSATION = 'conversation',
  EXERCISE = 'exercise'
}

export enum AccessTier {
  FREE = 'free',
  BASIC = 'basic',
  PREMIUM = 'premium'
}

export interface RateLimitOptions {
  maxQueriesPerMinute: number;
  maxItemsPerRequest: number;
}

export interface TierRateLimits {
  free: RateLimitOptions;
  basic: RateLimitOptions;
  premium: RateLimitOptions;
}

export interface CustomData {
  vocabulary?: VocabularyItem[];
  grammar?: GrammarRule[];
}

export interface UsageExample {
  spanish: string;
  english: string;
  explanation?: string;
}

export interface VocabularyItem {
  word: string;
  translation: string;
  category: string;
  difficultyLevel: string;
  notes?: string;
  usageExamples: UsageExample[];
}

export interface ExerciseTemplate {
  title: string;
  instructions: string;
  examples?: string[];
  difficulty: string;
}

export interface ConversationTemplate {
  title: string;
  context: string;
  participants: string[];
  turns: ConversationTurn[];
}

export interface ConversationTurn {
  speaker: string;
  text: string;
  translation?: string;
  notes?: string;
}

export interface GrammarRule {
  title: string;
  category: string;
  explanation: string;
  difficultyLevel: string;
  examples: UsageExample[];
  tags: string[];
  relatedVocabulary?: string[];
  exerciseTemplates?: ExerciseTemplate[];
}

export interface McpConfigOptions {
  apiKey: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  useAppwrite?: boolean;
  customData?: CustomData;
  enableCaching?: boolean;
  cacheTTL?: number;
  connectionPoolSize?: number;
  connectionPoolTimeout?: number;
  logLevel?: string;
  rateLimitOptions?: Partial<TierRateLimits>;
}

export class McpConfig {
  readonly apiKey: string;
  readonly model: string;
  readonly maxTokens: number;
  readonly temperature: number;
  readonly useAppwrite: boolean;
  readonly customData: CustomData | null;
  readonly enableCaching: boolean;
  readonly cacheTTL: number;
  readonly connectionPoolSize: number;
  readonly connectionPoolTimeout: number;
  readonly logLevel: string;
  readonly rateLimitOptions: TierRateLimits;

  constructor(options: McpConfigOptions) {
    this.apiKey = options.apiKey;
    this.model = options.model || 'claude-3-opus-20240229';
    this.maxTokens = options.maxTokens || 1000;
    this.temperature = options.temperature || 0.7;
    this.useAppwrite = options.useAppwrite || false;
    this.customData = options.customData || null;
    this.enableCaching = options.enableCaching !== undefined ? options.enableCaching : true;
    this.cacheTTL = options.cacheTTL || 60 * 15;
    this.connectionPoolSize = options.connectionPoolSize || 10;
    this.connectionPoolTimeout = options.connectionPoolTimeout || 30000;
    this.logLevel = options.logLevel || 'info';
    
    const defaultRateLimits: TierRateLimits = {
      free: { maxQueriesPerMinute: 2, maxItemsPerRequest: 5 },
      basic: { maxQueriesPerMinute: 5, maxItemsPerRequest: 20 },
      premium: { maxQueriesPerMinute: 20, maxItemsPerRequest: 50 }
    };
    
    this.rateLimitOptions = {
      free: { ...defaultRateLimits.free, ...(options.rateLimitOptions?.free || {}) },
      basic: { ...defaultRateLimits.basic, ...(options.rateLimitOptions?.basic || {}) },
      premium: { ...defaultRateLimits.premium, ...(options.rateLimitOptions?.premium || {}) }
    };
    
    if (typeof logger?.level === 'function') {
      logger.level = this.logLevel;
    }
    
    logger.debug('McpConfig initialized with options', {
      model: this.model,
      useAppwrite: this.useAppwrite,
      enableCaching: this.enableCaching,
      connectionPoolSize: this.connectionPoolSize
    });
  }
}

export interface ContextOptionsParams {
  contextType?: ContextType;
  categories?: string[];
  difficultyLevel?: string;
  searchTerm?: string;
  maxItems?: number;
  includeExamples?: boolean;
  accessTier?: AccessTier;
  userId?: string;
  disableCache?: boolean;
  includeExercises?: boolean;
}

export class ContextOptions {
  contextType: ContextType;
  categories: string[];
  difficultyLevel: string | null;
  searchTerm: string | null;
  maxItems: number;
  includeExamples: boolean;
  accessTier: AccessTier;
  userId: string | null;
  disableCache: boolean;
  includeExercises: boolean;

  constructor(options: ContextOptionsParams) {
    this.contextType = options.contextType || ContextType.VOCABULARY;
    this.categories = options.categories || [];
    this.difficultyLevel = options.difficultyLevel || null;
    this.searchTerm = options.searchTerm || null;
    this.maxItems = options.maxItems || 10;
    this.includeExamples = options.includeExamples !== undefined ? options.includeExamples : true;
    this.accessTier = options.accessTier || AccessTier.FREE;
    this.userId = options.userId || null;
    this.disableCache = options.disableCache || false;
    this.includeExercises = options.includeExercises || false;
    
    logger.debug('ContextOptions created', {
      contextType: this.contextType,
      categories: this.categories,
      maxItems: this.maxItems,
      accessTier: this.accessTier
    });
  }
  
  getCacheKey(): string {
    return `context:${this.contextType}:${this.categories.sort().join(',')}:${this.difficultyLevel || 'all'}:${this.searchTerm || 'all'}:${this.maxItems}:${this.includeExamples ? 1 : 0}:${this.includeExercises ? 1 : 0}`;
  }
  
  applyTierRestrictions(): ContextOptions {
    const tierLimits: Record<AccessTier, number> = {
      [AccessTier.FREE]: 5,
      [AccessTier.BASIC]: 20,
      [AccessTier.PREMIUM]: 50
    };
    
    if (tierLimits[this.accessTier] && this.maxItems > tierLimits[this.accessTier]) {
      this.maxItems = tierLimits[this.accessTier];
      logger.debug(`Applied tier restriction: maxItems limited to ${this.maxItems} for ${this.accessTier} tier`);
    }
    
    if (this.accessTier === AccessTier.FREE) {
      this.includeExercises = false;
      logger.debug('Applied tier restriction: exercises disabled for free tier');
    }
    
    return this;
  }
}

class AnthropicConnectionPool {
  private pool: any; // Using any for now due to TypeScript compatibility
  
  constructor(apiKey: string, poolSize: number = 10) {
    this.createPool(apiKey, poolSize);
  }
  
  private createPool(apiKey: string, size: number): void {
    const factory = {
      create: async (): Promise<Anthropic> => {
        return new Anthropic({ apiKey });
      },
      destroy: async (_client: Anthropic): Promise<void> => {
        return;
      }
    };
    
    const opts = {
      max: size,
      min: 2,
      testOnBorrow: true,
      acquireTimeoutMillis: 30000
    };
    
    this.pool = GenericPool.Pool(factory, opts);
    logger.info(`Created Anthropic connection pool with size ${size}`);
  }
  
  async acquire(): Promise<Anthropic> {
    try {
      return await this.pool.acquire();
    } catch (error) {
      logger.error({ error }, 'Error acquiring Anthropic client from pool');
      throw new Error('Failed to acquire Anthropic client: ' + (error instanceof Error ? error.message : String(error)));
    }
  }
  
  async release(client: Anthropic): Promise<void> {
    try {
      await this.pool.release(client);
    } catch (error) {
      logger.warn({ error }, 'Error releasing Anthropic client back to pool');
    }
  }
  
  async destroy(): Promise<void> {
    try {
      await this.pool.drain();
      await this.pool.clear();
      logger.info('Anthropic connection pool drained and destroyed');
    } catch (error) {
      logger.error({ error }, 'Error destroying Anthropic connection pool');
    }
  }
}

export interface McpQueryResponse {
  response: string;
  metadata: {
    contextType: ContextType;
    itemCount: number;
    processingTimeMs: number;
    cacheHit?: boolean;
    tier: AccessTier;
  };
}

export class SpanishMcp {
  private config: McpConfig;
  private anthropic: Anthropic;
  private connectionPool?: AnthropicConnectionPool;
  private customVocabulary: VocabularyItem[] | null;
  private customGrammar: GrammarRule[] | null;
  private requestCounts: Map<string, number>;
  private cache: any; // Using any for now due to TypeScript compatibility
  
  constructor(config: McpConfig) {
    this.config = config;
    
    this.anthropic = new Anthropic({
      apiKey: config.apiKey
    });
    
    if (config.connectionPoolSize > 1) {
      this.connectionPool = new AnthropicConnectionPool(
        config.apiKey,
        config.connectionPoolSize
      );
    }
    
    this.cache = new NodeCache({
      stdTTL: config.cacheTTL,
      checkperiod: 60,
      useClones: false
    });
    
    this.customVocabulary = config.customData?.vocabulary || null;
    this.customGrammar = config.customData?.grammar || null;
    
    this.requestCounts = new Map<string, number>();
    
    setInterval(() => {
      this.requestCounts.clear();
      logger.debug('Cleared request counts for rate limiting');
    }, 60 * 1000);
    
    logger.info('SpanishMcp initialized with server-side capabilities', {
      model: config.model,
      poolSize: config.connectionPoolSize,
      caching: config.enableCaching
    });
  }

  private checkRateLimit(userId: string | null, tier: AccessTier = AccessTier.FREE): boolean {
    if (!userId) return true;
    
    const key = `${userId}:query`;
    const count = this.requestCounts.get(key) || 0;
    const limit = this.config.rateLimitOptions[tier]?.maxQueriesPerMinute ||
                  this.config.rateLimitOptions.free.maxQueriesPerMinute;
    
    if (count >= limit) {
      logger.warn({ userId, tier, count, limit }, 'Rate limit exceeded');
      return false;
    }
    
    this.requestCounts.set(key, count + 1);
    return true;
  }
  
  async getContext(options: ContextOptions): Promise<string> {
    const startTime = Date.now();
    
    if (options.accessTier) {
      options.applyTierRestrictions();
    }
    
    if (options.userId && !this.checkRateLimit(options.userId, options.accessTier)) {
      throw new Error(`Rate limit exceeded for user ${options.userId} with tier ${options.accessTier}`);
    }
    
    if (this.config.enableCaching && !options.disableCache) {
      const cacheKey = options.getCacheKey();
      const cachedContext = this.cache.get(cacheKey);
      
      if (cachedContext) {
        logger.debug({ cacheKey }, 'Context cache hit');
        return cachedContext;
      }
      
      logger.debug({ cacheKey }, 'Context cache miss');
    }
    
    let contextParts: string[] = [];
    
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
            contextParts.push(await this.getVocabularyContext(options));
          } else {
            contextParts.push(await this.getExerciseContext(options));
          }
          break;
        default:
          contextParts.push(await this.getVocabularyContext(options));
      }
      
      const context = contextParts.join('\n\n');
      
      // Store in cache if caching is enabled
      if (this.config.enableCaching && !options.disableCache) {
        const cacheKey = options.getCacheKey();
        this.cache.set(cacheKey, context);
        logger.debug({ cacheKey, contextLength: context.length }, 'Stored context in cache');
      }
      
      const elapsed = Date.now() - startTime;
      logger.debug({ 
        contextType: options.contextType,
        elapsed,
        contextLength: context.length
      }, 'Generated context');
      
      return context;
    } catch (error) {
      const elapsed = Date.now() - startTime;
      logger.error({ 
        error, 
        contextType: options.contextType,
        elapsed
      }, 'Error generating context');
      
      throw new Error('Failed to generate context: ' + (error instanceof Error ? error.message : String(error)));
    }
  }
  
  private async getVocabularyContext(options: ContextOptions): Promise<string> {
    let items: VocabularyItem[] = [];
    
    if (this.config.useAppwrite) {
      const filters: Record<string, any> = {};
      
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
  
  private async getGrammarContext(options: ContextOptions): Promise<string> {
    let items: GrammarRule[] = [];
    
    if (this.config.useAppwrite) {
      const filters: Record<string, any> = {};
      
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
    
    return this.formatGrammarForContext(items, options.includeExamples, options.includeExercises);
  }
  
  private async getConversationContext(options: ContextOptions): Promise<string> {
    return "# Spanish Conversation Templates\n\nConversation templates are only available for Basic and Premium tier users.";
  }
  
  private async getExerciseContext(options: ContextOptions): Promise<string> {
    return "# Spanish Exercise Templates\n\nExercise templates are only available for Premium tier users.";
  }

  private formatVocabularyForContext(items: VocabularyItem[], includeExamples: boolean = true): string {
    if (items.length === 0) {
      return "No vocabulary items found.";
    }
    
    let context = "# Spanish Vocabulary Reference\n\n";
    const categorizedItems: Record<string, VocabularyItem[]> = {};
    
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

  private formatGrammarForContext(
    items: GrammarRule[],
    includeExamples: boolean = true,
    includeExercises: boolean = false
  ): string {
    if (items.length === 0) {
      return "No grammar rules found.";
    }
    
    let context = "# Spanish Grammar Reference\n\n";
    const categorizedItems: Record<string, GrammarRule[]> = {};
    
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
        
        if (includeExercises && item.exerciseTemplates && item.exerciseTemplates.length > 0) {
          context += "**Exercises:**\n";
          
          item.exerciseTemplates.forEach(exercise => {
            context += `- ${exercise.title}: ${exercise.instructions}\n`;
          });
          
          context += "\n";
        }
        
        if (item.tags && item.tags.length > 0) {
          context += `**Tags:** ${item.tags.join(', ')}\n\n`;
        }
      });
    });
    return context;
  }
  
  private formatCategory(category: string): string {
    return category
      .split('_')
      .map(word => this.capitalizeFirstLetter(word))
      .join(' ');
  }
  
  private capitalizeFirstLetter(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
  
  async queryWithContext(
    userMessage: string,
    contextOptions: ContextOptions,
    advancedOptions?: {
      temperature?: number;
      maxTokens?: number;
    }
  ): Promise<McpQueryResponse> {
    const startTime = Date.now();
    
    try {
      const context = await this.getContext(contextOptions);
      
      const systemPrompt = `You are a helpful Spanish language tutor. Use the following Spanish language reference materials to help answer the user's question:\n\n${context}`;
      
      let client: Anthropic;
      let fromPool = false;
      
      if (this.connectionPool) {
        client = await this.connectionPool.acquire();
        fromPool = true;
      } else {
        client = this.anthropic;
      }
      
      try {
        const queryParams = {
          model: this.config.model,
          max_tokens: advancedOptions?.maxTokens || this.config.maxTokens,
          temperature: advancedOptions?.temperature || this.config.temperature,
          system: systemPrompt,
          messages: [
            { role: 'user' as const, content: userMessage }
          ]
        };
        
        logger.debug({
          model: queryParams.model,
          maxTokens: queryParams.max_tokens,
          temperature: queryParams.temperature,
          messageLength: userMessage.length,
          contextLength: context.length
        }, 'Querying Claude');
        
        const response = await client.messages.create(queryParams);
        
        let responseText: string;
        
        if (response.content[0].type === 'text') {
          responseText = response.content[0].text;
        } else {
          responseText = "No text response received from Claude";
        }
        
        const elapsed = Date.now() - startTime;
        
        return {
          response: responseText,
          metadata: {
            contextType: contextOptions.contextType,
            itemCount: responseText.length,
            processingTimeMs: elapsed,
            cacheHit: false,
            tier: contextOptions.accessTier
          }
        };
      } finally {
        if (fromPool && this.connectionPool) {
          await this.connectionPool.release(client);
        }
      }
    } catch (error) {
      const elapsed = Date.now() - startTime;
      logger.error({ 
        error, 
        elapsed,
        userMessageLength: userMessage.length
      }, 'Error querying Claude');
      
      throw new Error('Failed to get response from Claude: ' + (error instanceof Error ? error.message : String(error)));
    }
  }
}

export function createSpanishMcp(apiKey: string, options: Partial<McpConfigOptions> = {}): SpanishMcp {
  const config = new McpConfig({
    apiKey,
    ...options
  });
  
  return new SpanishMcp(config);
}

export const sampleVocabulary: VocabularyItem[] = [
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

export const sampleGrammar: GrammarRule[] = [
  {
    title: "Present Tense Conjugation",
    category: "verb_tense",
    difficultyLevel: "beginner",
    explanation: "In Spanish, verbs in the present tense change their endings based on the subject. Regular -ar verbs follow a pattern: -o, -as, -a, -amos, -áis, -an.",
    examples: [
      { spanish: "Yo hablo español.", english: "I speak Spanish." },
      { spanish: "Tú hablas muy rápido.", english: "You speak very fast." },
      { spanish: "Ella habla tres idiomas.", english: "She speaks three languages." }
    ],
    tags: ["verbs", "present tense", "conjugation"]
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
    ],
    tags: ["adjectives", "gender", "agreement"]
  }
];

