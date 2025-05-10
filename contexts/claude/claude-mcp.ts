import {
  getVocabularyItems,
  getGrammarRules,
  VocabularyModel,
  GrammarModel,
  WordCategory,
  DifficultyLevel,
  GrammarCategory
} from '../../lib/appwrite.js';

export { WordCategory, DifficultyLevel, GrammarCategory };

import Anthropic from '@anthropic-ai/sdk';

interface ClaudeMcpConfig {
  apiKey: string;
  model: string;
  maxTokens: number;
  temperature: number;
}

export enum ContextType {
  VOCABULARY = 'vocabulary',
  GRAMMAR = 'grammar',
  CONVERSATION = 'conversation',
  EXERCISE = 'exercise',
  MIXED = 'mixed'
}

export interface ContextOptions {
  contextType: ContextType;
  categories?: (WordCategory | GrammarCategory)[];
  difficultyLevel?: DifficultyLevel;
  searchTerm?: string;
  maxItems?: number;
  includeExamples?: boolean;
  includeExercises?: boolean;
}

export class ClaudeMcp {
  private anthropic: Anthropic;
  private config: ClaudeMcpConfig;
  
  constructor(config: ClaudeMcpConfig) {
    this.config = config;
    this.anthropic = new Anthropic({
      apiKey: config.apiKey
    });
  }
  
  async getContext(options: ContextOptions): Promise<string> {
    let contextParts: string[] = [];
    
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
  
  private async getVocabularyContext(options: ContextOptions): Promise<string> {
    const filters: {
      category?: WordCategory;
      difficultyLevel?: DifficultyLevel;
      searchTerm?: string;
    } = {};
    
    if (options.categories?.length) {
      const wordCategories = options.categories.filter(
        cat => Object.values(WordCategory).includes(cat as WordCategory)
      ) as WordCategory[];
      
      if (wordCategories.length > 0) {
        filters.category = wordCategories[0];
      }
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
    
    return this.formatVocabularyForContext(result.items, options.includeExamples);
  }
  
  private async getGrammarContext(options: ContextOptions): Promise<string> {
    const filters: {
      category?: GrammarCategory;
      difficultyLevel?: DifficultyLevel;
      searchTerm?: string;
    } = {};
    
    if (options.categories?.length) {
      const grammarCategories = options.categories.filter(
        cat => Object.values(GrammarCategory).includes(cat as GrammarCategory)
      ) as GrammarCategory[];
      
      if (grammarCategories.length > 0) {
        filters.category = grammarCategories[0];
      }
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
    
    return this.formatGrammarForContext(result.items, options.includeExamples, options.includeExercises);
  }
  
  private formatVocabularyForContext(items: VocabularyModel[], includeExamples: boolean = true): string {
    if (items.length === 0) {
      return "No vocabulary items found.";
    }
    
    let context = "# Spanish Vocabulary Reference\n\n";
    
    const categorizedItems: Record<string, VocabularyModel[]> = {};
    
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
          
          item.usageExamples.forEach((example: any) => {
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
    items: GrammarModel[], 
    includeExamples: boolean = true,
    includeExercises: boolean = false
  ): string {
    if (items.length === 0) {
      return "No grammar rules found.";
    }
    
    let context = "# Spanish Grammar Reference\n\n";
    
    const categorizedItems: Record<string, GrammarModel[]> = {};
    
    items.forEach(item => {
      if (!categorizedItems[item.category]) {
        categorizedItems[item.category] = [];
      }
      categorizedItems[item.category].push(item);
    });
    
    Object.entries(categorizedItems).forEach(([category, categoryItems]) => {
      context += `## ${this.formatGrammarCategory(category)}\n\n`;
      
      categoryItems.forEach(item => {
        context += `### ${item.title}\n`;
        context += `- **Difficulty:** ${item.difficultyLevel}\n\n`;
        context += `${item.explanation}\n\n`;
        
        if (includeExamples && item.examples && item.examples.length > 0) {
          context += "**Examples:**\n";
          
          item.examples.forEach((example: any) => {
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
          
          item.exerciseTemplates.forEach((exercise: any) => {
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
  
  private formatGrammarCategory(category: string): string {
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
    contextOptions: ContextOptions
  ): Promise<string> {
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

export function createClaudeMcp(apiKey: string): ClaudeMcp {
  const config: ClaudeMcpConfig = {
    apiKey,
    model: 'claude-3-opus-20240229',
    maxTokens: 1000,
    temperature: 0.7
  };
  
  return new ClaudeMcp(config);
}