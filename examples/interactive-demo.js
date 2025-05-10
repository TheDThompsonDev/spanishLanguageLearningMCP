/**
 * Spanish Learning MCP Demonstration
 * 
 * This example shows how to use the MCP with hardcoded data.
 * It demonstrates both vocabulary and grammar context functionality.
 */

import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import chalk from 'chalk';
import readline from 'readline';

// Setup path resolution for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();
if (!process.env.ANTHROPIC_API_KEY) {
  dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
}
const sampleVocabulary = [
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

// Sample grammar data
const sampleGrammar = [
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

/**
 * Function to highlight Spanish words and phrases in text
 * @param {string} text - The text to process
 * @returns {string} Text with Spanish words and phrases highlighted
 */
function highlightSpanishWords(text) {
  if (!text) return '';
  
  const spanishWords = [
    ...sampleVocabulary.map(item => item.word),
    'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas',
    'yo', 'tú', 'él', 'ella', 'nosotros', 'vosotros', 'ellos', 'ellas',
    'mi', 'tu', 'su', 'nuestro', 'vuestro',
    'y', 'o', 'pero', 'porque', 'si', 'cuando', 'como',
    'de', 'en', 'con', 'por', 'para', 'sin', 'sobre', 'entre',
    'es', 'son', 'está', 'están', 'ser', 'estar'
  ];
  
  const lines = text.split('\n');
  const processedLines = lines.map(line => {
    if (line.includes('```') || line.includes('http')) {
      return line;
    }
    if (line.includes('Remember') || line.includes('practice') || 
        line.includes('confidence') || line.includes('helpful')) {
      if (line.includes('¡Buen provecho!')) {
        return line.replace(/(¡Buen provecho!)/, chalk.cyan('$1'));
      }
      return line;
    }
    if (line.match(/^[-•]\s+([^-]+)\s+-\s+/)) {
      return line.replace(/^([-•]\s+)([^-]+)(\s+-\s+)(.+)$/, (match, bullet, spanish, separator, english) => {
        return bullet + chalk.cyan(spanish) + separator + english;
      });
    }
    if (line.match(/^([^-]+)\s+-\s+/)) {
      return line.replace(/^([^-]+)(\s+-\s+)(.+)$/, (match, spanish, separator, english) => {
        return chalk.cyan(spanish) + separator + english;
      });
    }
    const hasSpanishIndicators = 
      line.includes('Spanish:') ||
      line.includes('español') ||
      /[áéíóúüñ¿¡]/.test(line);
    
    if (hasSpanishIndicators) {
      if (line.includes('Spanish:')) {
        return line.replace(/(Spanish:)(.*)/, (match, label, content) => {
          return label + chalk.cyan(content);
        });
      }
      
      if (/"([^"]*[áéíóúüñ¿¡][^"]*)"/.test(line)) {
        line = line.replace(/"([^"]*[áéíóúüñ¿¡][^"]*)"/, (match, content) => {
          return '"' + chalk.cyan(content) + '"';
        });
      }
      const spanishPhraseRegex = /([¿¡]?[A-Za-zÁÉÍÓÚáéíóúüñÑ\s,]+[.!?¡])/g;
      line = line.replace(spanishPhraseRegex, match => {
        if ((match.split(/\s+/).length > 1 || /[áéíóúüñÁÉÍÓÚÜÑ¿¡]/.test(match)) && 
            !match.includes('Remember') && !match.includes('practice')) {
          return chalk.cyan(match);
        }
        return match;
      });
      
      // Only highlight individual Spanish words if they have Spanish characters
      // to avoid highlighting English words
      line = line.replace(/\b\w*[áéíóúüñÁÉÍÓÚÜÑ]\w*\b/g, match => chalk.cyan(match));
    }
    
    return line;
  });
  
  return processedLines.join('\n');
}

/**
 * Spanish MCP class that provides context-aware AI responses
 */
class SpanishMcp {
  /**
   * Create a new Spanish MCP instance
   * @param {string} apiKey - Anthropic API key
   */
  constructor(apiKey) {
    this.anthropic = new Anthropic({
      apiKey: apiKey
    });
  }
  
  /**
   * Format vocabulary data into a markdown context
   * @returns {string} Formatted vocabulary context
   */
  formatVocabularyContext() {
    let context = "# Spanish Vocabulary Reference\n\n";
    
    // Group vocabulary by category
    const categorized = {};
    sampleVocabulary.forEach(item => {
      if (!categorized[item.category]) {
        categorized[item.category] = [];
      }
      categorized[item.category].push(item);
    });
    
    // Format each category and its items
    Object.entries(categorized).forEach(([category, items]) => {
      context += `## ${this.capitalizeFirstLetter(category)}\n\n`;
      
      items.forEach(item => {
        context += `### ${item.word}\n`;
        context += `- **Translation:** ${item.translation}\n`;
        context += `- **Difficulty:** ${item.difficultyLevel}\n\n`;
        
        context += "**Examples:**\n";
        item.usageExamples.forEach(example => {
          context += `- Spanish: ${example.spanish}\n`;
          context += `  English: ${example.english}\n\n`;
        });
      });
    });
    
    return context;
  }
  
  /**
   * Format grammar data into a markdown context
   * @returns {string} Formatted grammar context
   */
  formatGrammarContext() {
    let context = "# Spanish Grammar Reference\n\n";
    sampleGrammar.forEach(rule => {
      context += `## ${rule.title}\n\n`;
      context += `**Category:** ${this.formatCategory(rule.category)}\n`;
      context += `**Difficulty:** ${rule.difficultyLevel}\n\n`;
      context += `${rule.explanation}\n\n`;
      
      context += "**Examples:**\n";
      rule.examples.forEach(example => {
        context += `- Spanish: ${example.spanish}\n`;
        context += `  English: ${example.english}\n\n`;
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
   * @param {string} contextType - Type of context to use: 'vocabulary', 'grammar', or 'mixed'
   * @returns {Promise<string>} Claude's response
   */
  async queryWithContext(userMessage, contextType = 'vocabulary') {
    let context = "";
    switch (contextType) {
      case 'vocabulary':
        context = this.formatVocabularyContext();
        break;
      case 'grammar':
        context = this.formatGrammarContext();
        break;
      case 'mixed':
        context = this.formatVocabularyContext() + "\n\n" + this.formatGrammarContext();
        break;
      default:
        context = this.formatVocabularyContext();
    }
    
    const systemPrompt = `You are a helpful Spanish language tutor. Use the following Spanish language reference materials to help answer the user's question:\n\n${context}

IMPORTANT: Always format your responses using the following structure:

1. Start with a brief introduction in English
2. For vocabulary words, use this format:
   - [Spanish word/phrase] - [English translation]
   Example:
   - el menú - the menu
   - la cuenta - the bill

3. For useful phrases, use this format:
   ### Useful Phrases
   - [Spanish phrase]
     [English translation]
   
   Example:
   - ¿Puedo ver el menú, por favor?
     Can I see the menu, please?

4. For grammar explanations, use this format:
   ### [Grammar Topic]
   [Explanation in English]
   
   Examples:
   - Spanish: [Spanish example]
     English: [English translation]

5. End with a brief conclusion or encouragement in English.

Always use the dash format for vocabulary (Spanish - English) and the line break format for phrases to ensure consistent highlighting.`;
    
    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-3-opus-20240229',
        max_tokens: 1000,
        temperature: 0.7,
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
 * Interactive terminal interface for the MCP
 */
async function runInteractiveDemo() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  
  if (!apiKey) {
    console.error(chalk.red('ANTHROPIC_API_KEY is required in your .env or .env.local file'));
    process.exit(1);
  }
  
  const mcp = new SpanishMcp(apiKey);
  let contextType = 'vocabulary';

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  // Display welcome message and instructions
  console.log(chalk.blue('='.repeat(60)));
  console.log(chalk.yellow('🌟 Spanish Learning MCP - Interactive Terminal Demo 🌟'));
  console.log(chalk.blue('='.repeat(60)));
  console.log(chalk.green('Type your questions about Spanish vocabulary or grammar.'));
  console.log(chalk.green('Special commands:'));
  console.log(chalk.cyan('  /vocab') + ' - Switch to vocabulary context');
  console.log(chalk.cyan('  /grammar') + ' - Switch to grammar context');
  console.log(chalk.cyan('  /mixed') + ' - Switch to mixed context (both vocabulary and grammar)');
  console.log(chalk.cyan('  /exit') + ' - Exit the program');
  console.log(chalk.blue('='.repeat(60)));
  console.log(chalk.yellow(`Current context type: ${contextType}`));
  
  // Main question loop
  const askQuestion = () => {
    rl.question(chalk.green('> '), async (input) => {
      if (input.trim() === '/exit') {
        console.log(chalk.yellow('Goodbye! 👋'));
        rl.close();
        return;
      } else if (input.trim() === '/vocab') {
        contextType = 'vocabulary';
        console.log(chalk.yellow(`Switched to vocabulary context`));
        askQuestion();
        return;
      } else if (input.trim() === '/grammar') {
        contextType = 'grammar';
        console.log(chalk.yellow(`Switched to grammar context`));
        askQuestion();
        return;
      } else if (input.trim() === '/mixed') {
        contextType = 'mixed';
        console.log(chalk.yellow(`Switched to mixed context`));
        askQuestion();
        return;
      }
      

      if (input.trim()) {
        console.log(chalk.blue('Querying Claude with ' + contextType + ' context...'));
        
        try {
          const loadingInterval = setInterval(() => {
            process.stdout.write(chalk.yellow('.'));
          }, 500);
          
          const response = await mcp.queryWithContext(input, contextType);
          clearInterval(loadingInterval);
          process.stdout.write('\n');
          const highlightedResponse = highlightSpanishWords(response);
          
          console.log(chalk.blue('='.repeat(60)));
          console.log(chalk.cyan('Claude\'s response:'));
          console.log(highlightedResponse);
          console.log(chalk.blue('='.repeat(60)));
        } catch (error) {
          console.error(chalk.red('Error:'), error.message);
        }
      }
      askQuestion();
    });
  };
  askQuestion();
}

runInteractiveDemo().catch(error => {
  console.error(chalk.red('Fatal error:'), error);
  process.exit(1);
});