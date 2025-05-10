/**
 * Spanish Learning MCP Module
 * 
 * This module exports the MCP functionality in a way that can be easily
 * integrated with other frontends or applications.
 */

import Anthropic from '@anthropic-ai/sdk';
import { getVocabularyItems, getGrammarRules } from './appwrite.js';

export const ContextType = {
  VOCABULARY: 'vocabulary',
  GRAMMAR: 'grammar',
  MIXED: 'mixed'
};

export class McpConfig {
  constructor({
    apiKey,
    model = 'claude-3-opus-20240229',
    maxTokens = 1000,
    temperature = 0.7,
    useAppwrite = false,
    customData = null
  }) {
    this.apiKey = apiKey;
    this.model = model;
    this.maxTokens = maxTokens;
    this.temperature = temperature;
    this.useAppwrite = useAppwrite;
    this.customData = customData;
  }
}

export class ContextOptions {
  constructor({
    contextType = ContextType.VOCABULARY,
    categories = [],
    difficultyLevel = null,
    searchTerm = null,
    maxItems = 10,
    includeExamples = true
  }) {
    this.contextType = contextType;
    this.categories = categories;
    this.difficultyLevel = difficultyLevel;
    this.searchTerm = searchTerm;
    this.maxItems = maxItems;
    this.includeExamples = includeExamples;
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
    this.anthropic = new Anthropic({
      apiKey: config.apiKey
    });
    
    this.customVocabulary = config.customData?.vocabulary || null;
    this.customGrammar = config.customData?.grammar || null;
  }
  
  async getContext(options) {
    let contextParts = [];
    
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
      default:
        contextParts.push(await this.getVocabularyContext(options));
    }
    
    return contextParts.join('\n\n');
  }
  
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