
# <div align="center">🌟 Spanish Learning MCP (Model Context Protocol)</div>


<div align="center">
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=next.js&logoColor=white" alt="Next.js">
  <img src="https://img.shields.io/badge/Claude_AI-5A67D8?style=for-the-badge&logo=anthropic&logoColor=white" alt="Claude AI">
  <img src="https://img.shields.io/badge/Appwrite-F02E65?style=for-the-badge&logo=appwrite&logoColor=white" alt="Appwrite">
</div>

<div align="center">
  <p><em>A comprehensive implementation of Model Context Protocol for Spanish language learning</em></p>
  <p>Created by Danny Thompson (DThompsonDev) at <a href="https://thisdot.co">This Dot Labs</a></p>
</div>
<img width="1069" alt="image" src="https://github.com/user-attachments/assets/f1411864-ec5a-4ff5-8ec8-53bf71be6c38" />

---

## 🧠 What Is MCP, Really?

Imagine this:
You're trying to learn Spanish using an AI assistant. One day, you ask it how to say "hello," and it answers just fine. The next day, you ask a grammar question—and it gives you a complex explanation way above your level. It’s like starting a conversation with someone who has no memory of who you are or what you know.

Now flip the script. Imagine that every time you ask a question, the AI remembers:

- You're a beginner.
- You’ve been learning greetings and verbs.
- You like examples with food and travel.

Suddenly, it feels like you’ve got a personal tutor who knows you—and tailors every answer to your level and preferences.

That’s what **Model Context Protocol (MCP)** is all about.

Let’s break down what MCP _actually does_:

### The Four Pillars of MCP

1. **Context Retrieval** – Pulls the _right_ data (like beginner-level verbs or grammar rules) based on the user's question.
2. **Context Formatting** – Structures the data into a markdown format that AI models (like Claude) can easily parse and use.
3. **Context Injection** – Adds that formatted data directly into the system prompt sent to the model.
4. **Response Handling** – Processes what the AI gives back and returns a clean, accurate answer.

---

## 📚 Table of Contents

- [What is Model Context Protocol?](#-what-is-model-context-protocol)
- [Why MCP Matters](#-why-mcp-matters)
- [Project Overview](#-project-overview)
- [Getting Started](#-getting-started)
- [Architecture](#-architecture)
- [How It Works](#-how-it-works)
- [Usage Examples](#-usage-examples)
- [Integrating with Other Projects](#-integrating-with-other-projects)
- [Advanced Topics](#-advanced-topics)
- [Troubleshooting](#-troubleshooting)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🧠 What is Model Context Protocol?

Model Context Protocol (MCP) standardizes interactions between LLMs and external tools/data sources for integrating Large Language Models (LLMs) with domain-specific data to enhance their capabilities. It provides a structured way to:

1. **Retrieve relevant context** from your application's data sources
2. **Format this context** in a way that's optimal for LLM consumption
3. **Inject the context** into prompts sent to the LLM
4. **Process and return responses** in a consistent format

MCP acts as a bridge between your application's data and the LLM, ensuring that the model has access to the most relevant information when generating responses.

### Key Concepts

- **Context Retrieval**: Fetching relevant data based on user queries
- **Context Formatting**: Structuring data in a way that maximizes LLM understanding
- **Context Injection**: Adding the formatted context to prompts
- **Response Processing**: Handling and potentially post-processing LLM responses

---

## 🌈 Why MCP Matters

Traditional LLM integration faces several challenges:

- **Knowledge Cutoffs**: LLMs only know what they were trained on
- **Hallucinations**: Models can generate plausible but incorrect information
- **Lack of Domain Specificity**: Generic responses that don't leverage your data
- **Inconsistent Responses**: Variations in output format and quality

MCP addresses these challenges by:

- **Providing Up-to-Date Information**: Using your application's current data
- **Reducing Hallucinations**: Grounding responses in factual context
- **Enhancing Domain Specificity**: Tailoring responses to your specific use case
- **Ensuring Consistency**: Standardizing how context is provided and responses are formatted

---

## 🔍 Project Overview

This project implements MCP for Spanish language learning, allowing Claude AI to provide accurate, contextual responses about Spanish vocabulary and grammar. It demonstrates:

- How to structure and organize an MCP implementation
- Techniques for context retrieval and formatting
- Methods for integrating with external data sources (Appwrite)
- Approaches for different types of context (vocabulary, grammar, mixed)

### Features

- ✅ Integration with Claude AI via the Anthropic API
- ✅ Context generation from vocabulary and grammar data
- ✅ Appwrite database integration for data storage and retrieval
- ✅ Multiple context types (vocabulary, grammar, mixed)
- ✅ Interactive terminal interface with colored Spanish text highlighting
- ✅ Consistent response formatting for better readability
- ✅ Modular design for easy integration with other projects
- ✅ TypeScript support for type safety and better developer experience
- ✅ Interactive terminal interface for real-time queries
- ✅ Modular design for easy integration with other projects

---

## 🚀 Getting Started

### Prerequisites

- Node.js 16.0.0 or later
- npm or yarn
- An Anthropic API key (for Claude AI)
- Optional: Appwrite account (for database integration)

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/yourusername/spanish-learning-mcp.git
   cd spanish-learning-mcp
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   Create a `.env.local` file in the root directory with the following variables:

   ```
   # Anthropic API key for Claude
   ANTHROPIC_API_KEY=your_anthropic_api_key

   # Appwrite configuration (optional if using the demo with hardcoded data)
   NEXT_PUBLIC_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
   NEXT_PUBLIC_APPWRITE_PROJECT_ID=your_appwrite_project_id
   NEXT_PUBLIC_APPWRITE_DATABASE_ID=your_appwrite_database_id
   NEXT_PUBLIC_APPWRITE_VOCABULARY_COLLECTION_ID=your_vocabulary_collection_id
   NEXT_PUBLIC_APPWRITE_GRAMMAR_COLLECTION_ID=your_grammar_collection_id
   ```

4. **Run the demo**

   ```bash
   npm run demo
   ```

   This will run the comprehensive demo that shows vocabulary, grammar, and mixed context examples.

5. **Try the interactive terminal interface**

   ```bash
   npm run interactive
   ```

   This launches an interactive terminal interface where you can:

   - Type questions about Spanish vocabulary and grammar
   - Switch between context types with commands (`/vocab`, `/grammar`, `/mixed`)
   - See responses in real-time with Spanish text highlighted in cyan
   - Exit the program with `/exit`

   The interactive interface features:

   - Color-coded Spanish text for easy identification
   - Consistent formatting of vocabulary and phrases
   - Real-time responses from Claude AI
   - Command-based context switching

6. **Start the Next.js development server** (optional, for web interface)

   ```bash
   npm run dev
   ```

   Then open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🏗️ Architecture

The project follows a modular architecture designed to separate concerns and make the MCP implementation flexible and extensible.

### Core Components

```
spanish-learning-mcp/
├── contexts/
│   └── claude/
│       └── claude-mcp.ts      # Core MCP implementation
├── examples/
│   ├── spanish-mcp-demo.js    # Comprehensive example with all context types
│   ├── interactive-demo.js    # Interactive terminal interface
│   └── frontend-integration.js # Example of integrating with other frontends
├── lib/
│   ├── appwrite.ts            # Appwrite client and database helpers
│   └── mcp-module.js          # Modular MCP implementation for other projects
├── models/
│   ├── common.ts              # Shared type definitions
│   ├── Grammar.ts             # Grammar model definitions
│   └── Vocabulary.ts          # Vocabulary model definitions
```

### Key Files Explained

- **`contexts/claude/claude-mcp.ts`**: The heart of the MCP implementation. Defines the `ClaudeMcp` class that handles context retrieval, formatting, and interaction with the Claude AI API.

- **`lib/appwrite.ts`**: Provides functions for interacting with the Appwrite database, including retrieving vocabulary and grammar data.

- **`lib/mcp-module.js`**: A modular implementation of the MCP that can be easily imported and used in other projects.

- **`models/*.ts`**: Define the data structures and types used throughout the application, ensuring type safety and consistency.

- **`examples/spanish-mcp-demo.js`**: A comprehensive example that demonstrates how to use the MCP with different types of context.

- **`examples/interactive-demo.js`**: An interactive terminal interface for querying the MCP in real-time.

---

## ⚙️ How It Works

### 1. Context Retrieval

The MCP retrieves context based on the user's query and specified parameters. Here's the actual code from our implementation:

```typescript
// From claude-mcp.ts
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
```

The `getVocabularyContext` method retrieves vocabulary items from the database (or hardcoded data in the demo) based on filters:

```typescript
// From claude-mcp.ts
private async getVocabularyContext(options: ContextOptions): Promise<string> {
  const filters = {};

  if (options.categories?.length) {
    // Filter by category
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
```

### 2. Context Formatting

The retrieved data is formatted into a structured markdown format that Claude AI can easily understand:

```typescript
// From claude-mcp.ts
private formatVocabularyForContext(items: VocabularyModel[], includeExamples: boolean = true): string {
  if (items.length === 0) {
    return "No vocabulary items found.";
  }

  let context = "# Spanish Vocabulary Reference\n\n";

  // Group by category
  const categorizedItems: Record<string, VocabularyModel[]> = {};

  items.forEach(item => {
    if (!categorizedItems[item.category]) {
      categorizedItems[item.category] = [];
    }
    categorizedItems[item.category].push(item);
  });

  // Format each category and its items
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
```

This produces a markdown document that looks like:

```markdown
# Spanish Vocabulary Reference

## Greeting

### hola

- **Translation:** hello
- **Difficulty:** beginner

**Examples:**

- Spanish: ¡Hola! ¿Cómo estás?
  English: Hello! How are you?

- Spanish: Hola a todos.
  English: Hello everyone.

### gracias

- **Translation:** thank you
- **Difficulty:** beginner

**Examples:**

- Spanish: Muchas gracias por tu ayuda.
  English: Thank you very much for your help.

- Spanish: Gracias por venir.
  English: Thank you for coming.
```

### 3. Context Injection

The formatted context is injected into the system prompt sent to Claude AI:

```typescript
// From claude-mcp.ts
async queryWithContext(
  userMessage: string,
  contextOptions: ContextOptions
): Promise<string> {
  const context = await this.getContext(contextOptions);

  const systemPrompt = `You are a helpful Spanish language tutor. Use the following Spanish language reference materials to help answer the user's question:\n\n${context}

IMPORTANT: Always format your responses using the following structure:

1. Start with a brief introduction in English
2. For vocabulary words, use this format:
   - [Spanish word/phrase] - [English translation]
3. For useful phrases, use this format:
   - [Spanish phrase]
     [English translation]
4. For grammar explanations, use this format:
   ### [Grammar Topic]
   [Explanation in English]

   Examples:
   - Spanish: [Spanish example]
     English: [English translation]
5. End with a brief conclusion or encouragement in English.`;

  // Send to Claude AI...
}
```

This structured prompt ensures that Claude's responses follow a consistent format, making them easier to read and parse. The format also works well with the Spanish text highlighting in the interactive terminal interface.

In the demo implementation, this looks like:

```javascript
// From spanish-mcp-demo.js
async queryWithContext(userMessage, contextType = 'vocabulary') {
  let context = "";

  // Get the appropriate context based on the type
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

  const systemPrompt = `You are a helpful Spanish language tutor. Use the following Spanish language reference materials to help answer the user's question:\n\n${context}`;

  // Send to Claude AI...
}
```

### 4. Response Processing

The response from Claude AI is processed and returned to the caller:

```typescript
// From claude-mcp.ts
try {
  const response = await this.anthropic.messages.create({
    model: this.config.model,
    max_tokens: this.config.maxTokens,
    temperature: this.config.temperature,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
  });

  if (response.content[0].type === "text") {
    return response.content[0].text;
  } else {
    return "No text response received from Claude";
  }
} catch (error) {
  console.error("Error querying Claude:", error);
  throw new Error("Failed to get response from Claude");
}
```

---

## 📝 Usage Examples

### Basic Usage

```javascript
import { createClaudeMcp, ContextType } from "./contexts/claude/claude-mcp.js";

// Create an instance of the MCP
const claudeMcp = createClaudeMcp("your_anthropic_api_key");

// Query Claude with vocabulary context
const response = await claudeMcp.queryWithContext(
  'How do I say "hello" in Spanish?',
  {
    contextType: ContextType.VOCABULARY,
    maxItems: 5,
    includeExamples: true,
  }
);

console.log(response);
```

### Using Different Context Types

Here's how to use different context types from our demo implementation:

```javascript
// From spanish-mcp-demo.js
// Vocabulary example
const vocabQuestion = 'How do I say "hello" and "thank you" in Spanish?';
const vocabResponse = await mcp.queryWithContext(vocabQuestion, "vocabulary");

// Grammar example
const grammarQuestion =
  'How do I conjugate the verb "hablar" in the present tense?';
const grammarResponse = await mcp.queryWithContext(grammarQuestion, "grammar");

// Mixed context example
const mixedQuestion =
  'How do I use "gracias" in a sentence with the correct verb conjugation?';
const mixedResponse = await mcp.queryWithContext(mixedQuestion, "mixed");
```

### Interactive Terminal Interface

The interactive terminal interface allows you to query the MCP in real-time:

```javascript
// From interactive-demo.js
const askQuestion = () => {
  rl.question(chalk.green("> "), async (input) => {
    // Check for special commands
    if (input.trim() === "/exit") {
      console.log(chalk.yellow("Goodbye! 👋"));
      rl.close();
      return;
    } else if (input.trim() === "/vocab") {
      contextType = "vocabulary";
      console.log(chalk.yellow(`Switched to vocabulary context`));
      askQuestion();
      return;
    } else if (input.trim() === "/grammar") {
      contextType = "grammar";
      console.log(chalk.yellow(`Switched to grammar context`));
      askQuestion();
      return;
    } else if (input.trim() === "/mixed") {
      contextType = "mixed";
      console.log(chalk.yellow(`Switched to mixed context`));
      askQuestion();
      return;
    }

    // Process the user's question
    if (input.trim()) {
      console.log(
        chalk.blue("Querying Claude with " + contextType + " context...")
      );

      try {
        const response = await mcp.queryWithContext(input, contextType);

        // Highlight Spanish words in the response
        const highlightedResponse = highlightSpanishWords(response);

        console.log(chalk.cyan("Claude's response:"));
        console.log(highlightedResponse);
      } catch (error) {
        console.error(chalk.red("Error:"), error.message);
      }
    }

    // Ask for the next question
    askQuestion();
  });
};
```

### Spanish Text Highlighting

The interactive terminal interface includes a feature to highlight Spanish words and phrases in cyan, making them easier to identify:

````javascript
// From interactive-demo.js
function highlightSpanishWords(text) {
  if (!text) return "";

  // Split the text into lines to process each line separately
  const lines = text.split("\n");
  const processedLines = lines.map((line) => {
    // Skip processing if the line is a code block or URL
    if (line.includes("```") || line.includes("http")) {
      return line;
    }

    // Skip processing if the line is likely an English conclusion
    if (line.includes("Remember") || line.includes("practice")) {
      // Only highlight the Spanish phrase at the end if it exists
      if (line.includes("¡Buen provecho!")) {
        return line.replace(/(¡Buen provecho!)/, chalk.cyan("$1"));
      }
      return line;
    }

    // Process Spanish phrases with dash/hyphen format (common in vocabulary lists)
    if (line.match(/^[-•]\s+([^-]+)\s+-\s+/)) {
      return line.replace(
        /^([-•]\s+)([^-]+)(\s+-\s+)(.+)$/,
        (match, bullet, spanish, separator, english) => {
          return bullet + chalk.cyan(spanish) + separator + english;
        }
      );
    }

    // Process lines with Spanish word/phrase followed by dash and English translation
    if (line.match(/^([^-]+)\s+-\s+/)) {
      return line.replace(
        /^([^-]+)(\s+-\s+)(.+)$/,
        (match, spanish, separator, english) => {
          return chalk.cyan(spanish) + separator + english;
        }
      );
    }

    // Highlight Spanish phrases with special characters
    if (line.includes("Spanish:") || /[áéíóúüñ¿¡]/.test(line)) {
      // If it's a line with "Spanish:" label, highlight everything after the colon
      if (line.includes("Spanish:")) {
        return line.replace(/(Spanish:)(.*)/, (match, label, content) => {
          return label + chalk.cyan(content);
        });
      }

      // Highlight words with Spanish characters
      line = line.replace(/\b\w*[áéíóúüñÁÉÍÓÚÜÑ]\w*\b/g, (match) =>
        chalk.cyan(match)
      );
    }

    return line;
  });

  return processedLines.join("\n");
}
````

This highlighting feature makes it easier to:

- Identify Spanish vocabulary words and phrases
- Distinguish between Spanish and English text
- See the structure of responses clearly
- Focus on the Spanish language elements

---

## 🔌 Integrating with Other Projects

The MCP is designed to be easily integrated with other projects. We provide a modular implementation in `lib/mcp-module.js` that can be imported and used in any JavaScript or TypeScript project.

### Using the MCP Module

```javascript
import {
  createSpanishMcp,
  ContextType,
  ContextOptions,
} from "./lib/mcp-module.js";

// Create an MCP instance with your API key
const mcp = createSpanishMcp("your_anthropic_api_key");

// Query the MCP
const options = new ContextOptions({
  contextType: ContextType.VOCABULARY,
  maxItems: 10,
  includeExamples: true,
});

const response = await mcp.queryWithContext(
  'How do I say "hello" in Spanish?',
  options
);
console.log(response);
```

### Using with Custom Data

You can provide your own vocabulary and grammar data:

```javascript
const customData = {
  vocabulary: [
    {
      word: "hola",
      translation: "hello",
      category: "greeting",
      difficultyLevel: "beginner",
      usageExamples: [
        { spanish: "¡Hola! ¿Cómo estás?", english: "Hello! How are you?" },
        { spanish: "Hola a todos.", english: "Hello everyone." },
      ],
    },
    // More vocabulary items...
  ],
  grammar: [
    {
      title: "Present Tense Conjugation",
      category: "verb_tense",
      difficultyLevel: "beginner",
      explanation:
        "In Spanish, verbs in the present tense change their endings...",
      examples: [
        { spanish: "Yo hablo español.", english: "I speak Spanish." },
        // More examples...
      ],
    },
    // More grammar rules...
  ],
};

const mcp = createSpanishMcp("your_anthropic_api_key", { customData });
```

### Configuring Response Format

The MCP module allows you to customize the format of responses:

```javascript
// Create an MCP instance with custom configuration
const mcp = createSpanishMcp("your_anthropic_api_key", {
  customData,
  model: "claude-3-haiku-20240307", // Use a different Claude model
  maxTokens: 2000, // Increase max tokens
  temperature: 0.5, // Lower temperature for more consistent responses
});
```

### Integration with Different Frameworks

The MCP module is framework-agnostic and can be integrated with various frontend and backend frameworks:

#### React Integration

```jsx
import { useState, useEffect } from "react";
import { createSpanishMcp, ContextType } from "./lib/mcp-module.js";

function SpanishTutor() {
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const mcp = createSpanishMcp(process.env.REACT_APP_ANTHROPIC_API_KEY);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await mcp.queryWithContext(query, {
        contextType: ContextType.MIXED,
      });
      setResponse(result);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <input value={query} onChange={(e) => setQuery(e.target.value)} />
        <button type="submit" disabled={loading}>
          Ask
        </button>
      </form>
      {response && <div>{response}</div>}
    </div>
  );
}
```

#### Express Backend Integration

```javascript
import express from "express";
import { createSpanishMcp, ContextType } from "./lib/mcp-module.js";

const app = express();
app.use(express.json());

// Initialize MCP
const mcp = createSpanishMcp(process.env.ANTHROPIC_API_KEY);

app.post("/api/spanish-tutor", async (req, res) => {
  try {
    const { query, contextType = ContextType.VOCABULARY } = req.body;

    if (!query) {
      return res.status(400).json({ error: "Query is required" });
    }

    const response = await mcp.queryWithContext(query, { contextType });
    res.json({ response });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
```

### Integration with React

Here's an example of using the MCP in a React component:

```jsx
import { useState, useMemo } from "react";
import {
  createSpanishMcp,
  ContextType,
  ContextOptions,
} from "../lib/mcp-module.js";

function SpanishTutor() {
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState("");
  const [contextType, setContextType] = useState(ContextType.VOCABULARY);
  const [isLoading, setIsLoading] = useState(false);

  // Initialize MCP
  const mcp = useMemo(() => {
    return createSpanishMcp("your_anthropic_api_key");
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!query.trim()) return;

    setIsLoading(true);

    try {
      const options = new ContextOptions({
        contextType,
        maxItems: 10,
        includeExamples: true,
      });

      const result = await mcp.queryWithContext(query, options);
      setResponse(result);
    } catch (error) {
      console.error("Error:", error);
      setResponse("Error: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <h1>Spanish Tutor</h1>

      {/* Context type selector */}
      <div>
        <label>
          <input
            type="radio"
            value={ContextType.VOCABULARY}
            checked={contextType === ContextType.VOCABULARY}
            onChange={() => setContextType(ContextType.VOCABULARY)}
          />
          Vocabulary
        </label>

        {/* Other radio buttons... */}
      </div>

      {/* Query form */}
      <form onSubmit={handleSubmit}>
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask a question about Spanish..."
        />

        <button type="submit" disabled={isLoading}>
          {isLoading ? "Loading..." : "Ask"}
        </button>
      </form>

      {/* Response display */}
      {response && (
        <div>
          <h2>Response:</h2>
          <div>{response}</div>
        </div>
      )}
    </div>
  );
}
```

### Integration with Express Backend

```javascript
import express from "express";
import {
  createSpanishMcp,
  ContextType,
  ContextOptions,
} from "../lib/mcp-module.js";

const app = express();
app.use(express.json());

// Initialize MCP
const apiKey = process.env.ANTHROPIC_API_KEY;
const mcp = createSpanishMcp(apiKey, {
  useAppwrite: true, // Use Appwrite for data instead of custom data
});

// API endpoint for querying the MCP
app.post("/api/spanish-tutor", async (req, res) => {
  try {
    const { query, contextType = ContextType.VOCABULARY } = req.body;

    if (!query) {
      return res.status(400).json({ error: "Query is required" });
    }

    const options = new ContextOptions({
      contextType,
      maxItems: 10,
      includeExamples: true,
    });

    const response = await mcp.queryWithContext(query, options);

    res.json({ response });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
```

---

## 🔬 Advanced Topics

### Customizing Context Retrieval

You can customize how context is retrieved by modifying the `getVocabularyContext` and `getGrammarContext` methods in `claude-mcp.ts`. For example, you might want to:

```typescript
// Example: Adding semantic search to getVocabularyContext
private async getVocabularyContext(options: ContextOptions): Promise<string> {
  // ... existing code ...

  // Add semantic search
  if (options.semanticQuery) {
    const embeddings = await this.getEmbeddings(options.semanticQuery);
    const semanticResults = await this.searchByEmbeddings(embeddings);

    // Combine with other results or use directly
    result.items = [...result.items, ...semanticResults];
  }

  return this.formatVocabularyForContext(result.items, options.includeExamples);
}
```

### Optimizing Context Format

The format of the context can significantly impact the quality of responses. Consider:

```typescript
// Example: Enhanced formatting with additional metadata
private formatVocabularyForContext(items: VocabularyModel[], includeExamples: boolean = true): string {
  // ... existing code ...

  // Add metadata section to help the model understand the structure
  context = "# Spanish Vocabulary Reference\n\n" +
    "## Metadata\n" +
    `- Total items: ${items.length}\n` +
    `- Categories: ${Array.from(new Set(items.map(item => item.category))).join(', ')}\n` +
    `- Difficulty levels: ${Array.from(new Set(items.map(item => item.difficultyLevel))).join(', ')}\n\n` +
    context;

  return context;
}
```

### Extending the MCP

The MCP can be extended to support additional features:

```typescript
// Example: Adding conversation history support
export interface ConversationContext {
  history: { role: 'user' | 'assistant', content: string }[];
}

async queryWithContextAndHistory(
  userMessage: string,
  contextOptions: ContextOptions,
  conversationContext: ConversationContext
): Promise<string> {
  const context = await this.getContext(contextOptions);

  const systemPrompt = `You are a helpful Spanish language tutor. Use the following Spanish language reference materials to help answer the user's question:\n\n${context}`;

  // Include conversation history in the messages
  const messages = [
    ...conversationContext.history,
    { role: 'user', content: userMessage }
  ];

  // Send to Claude AI...
}
```

---

## ❓ Troubleshooting

### Common Issues

**Issue**: API key errors when running the demo
**Solution**: Ensure your Anthropic API key is correctly set in `.env.local`

**Issue**: Module resolution errors
**Solution**: The project uses a mixed module system with NodeNext resolution. Ensure your imports use the correct file extensions (.js for ES modules, .mjs for explicit ES modules).

**Issue**: TypeScript errors
**Solution**: Run `npm run build` to check for TypeScript errors. Make sure you're using Node.js 16+ and TypeScript 5+.

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

<div align="center">
  <p>Made with ❤️ by Danny Thompson (DThompsonDev) at This Dot Labs</p>
  <p>
    <a href="https://twitter.com/dthompsondev">Twitter</a> •
    <a href="https://github.com/dthompsondev">GitHub</a> •
    <a href="https://thisdot.co">This Dot Labs</a>
  </p>
</div>
