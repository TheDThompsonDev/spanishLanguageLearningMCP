/**
 * Example of integrating the Spanish Learning MCP with a frontend project
 * 
 * This example shows how to import and use the MCP module in a different project.
 * It demonstrates how to configure the MCP with custom data and use it in a frontend context.
 */

import { 
  createSpanishMcp, 
  ContextType, 
  ContextOptions, 
  sampleVocabulary, 
  sampleGrammar 
} from '../lib/mcp-module.js';

/**
 * Example of using the MCP in a React component
 * 
 * This is a simplified example - in a real application, you would:
 * 1. Store the API key securely (not hardcoded)
 * 2. Handle loading states and errors properly
 * 3. Implement proper state management
 */
function SpanishTutorComponent() {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState('');
  const [contextType, setContextType] = useState(ContextType.VOCABULARY);
  const [isLoading, setIsLoading] = useState(false);
  
  // Initialize MCP with your API key and custom data
  const mcp = useMemo(() => {
    // Get this from environment variables or a secure backend
    // NEVER commit your API Key or hardcode it in your files that are public
    const apiKey = 'your_anthropic_api_key';
    
    // You can provide custom vocabulary and grammar data or just use the default ones
    const customData = {
      vocabulary: sampleVocabulary,
      grammar: sampleGrammar
    };
    
    return createSpanishMcp(apiKey, { customData });
  }, []);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!query.trim()) return;
    
    setIsLoading(true);
    
    try {
      const options = new ContextOptions({
        contextType,
        maxItems: 10,
        includeExamples: true
      });

      const result = await mcp.queryWithContext(query, options);
      setResponse(result);
    } catch (error) {
      console.error('Error querying MCP:', error);
      setResponse('Error: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="spanish-tutor">
      <h1>Spanish Language Tutor</h1>
      <div className="context-selector">
        <label>
          <input
            type="radio"
            value={ContextType.VOCABULARY}
            checked={contextType === ContextType.VOCABULARY}
            onChange={() => setContextType(ContextType.VOCABULARY)}
          />
          Vocabulary
        </label>
        
        <label>
          <input
            type="radio"
            value={ContextType.GRAMMAR}
            checked={contextType === ContextType.GRAMMAR}
            onChange={() => setContextType(ContextType.GRAMMAR)}
          />
          Grammar
        </label>
        
        <label>
          <input
            type="radio"
            value={ContextType.MIXED}
            checked={contextType === ContextType.MIXED}
            onChange={() => setContextType(ContextType.MIXED)}
          />
          Mixed
        </label>
      </div>
      
      {/* Query form */}
      <form onSubmit={handleSubmit}>
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask a question about Spanish..."
          rows={4}
          disabled={isLoading}
        />
        
        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Loading...' : 'Ask'}
        </button>
      </form>
      {response && (
        <div className="response">
          <h2>Response:</h2>
          <div className="response-content">
            {response}
          </div>
        </div>
      )}
    </div>
  );
}


/**
 * Example of using the MCP in a Node.js backend (Express)
 */

import express from 'express';
import { createSpanishMcp, ContextType, ContextOptions } from '../lib/mcp-module.js';

const app = express();
app.use(express.json());

// Initialize MCP
const apiKey = process.env.ANTHROPIC_API_KEY;
const mcp = createSpanishMcp(apiKey, {
  useAppwrite: true // Use Appwrite for data instead of custom data
});

app.post('/api/spanish-tutor', async (req, res) => {
  try {
    const { query, contextType = ContextType.VOCABULARY } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }
    
    const options = new ContextOptions({
      contextType,
      maxItems: 10,
      includeExamples: true
    });
    
    const response = await mcp.queryWithContext(query, options);
    
    res.json({ response });
  } catch (error) {
    console.error('Error querying MCP:', error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
