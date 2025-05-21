/**
 * Advanced MCP query endpoint with more capabilities
 * POST /api/mcp/query/advanced
 * 
 * Requires premium tier access
 */
router.post(
  '/query/advanced',
  validateRequest(schemas.mcpQuery),
  requireTier('premium'),
  catchAsync(async (req: AuthenticatedRequest, res: Response) => {
    const { 
      query, 
      contextType = ContextType.VOCABULARY, 
      maxItems = 50, 
      includeExamples = true,
      categories,
      difficultyLevel,
      // Advanced options
      temperature = 0.7,
      maxTokens = 2000
    } = req.body;
    
    const options = new ContextOptions({
      contextType,
      maxItems,
      includeExamples,
      categories,
      difficultyLevel
    });
    
    // Advanced options for premium users
    const advancedOptions = {
      temperature,
      maxTokens
    };
    
    // This is a placeholder for a more advanced query method
    // In a real implementation, we would modify the mcp-module.js to support these parameters
    const response = await mcpInstance.queryWithContext(query, options);
    
    res.json({ 
      response,
      user: {
        tier: req.user?.tier,
        id: req.user?.id
      },
      advanced: advancedOptions
    });
  })
);

/**
 * MCP query routes for the Spanish Learning MCP Server
 */
import express, { Request, Response, NextFunction } from 'express';
import { createSpanishMcp, ContextType, ContextOptions } from '../lib/mcp-module.js';
import { validateRequest, schemas } from '../middleware/validation.js';
import { requireTier, AuthenticatedRequest } from '../middleware/auth.js';
import { catchAsync, AppError } from '../middleware/error.js';

const router = express.Router();

// Initialization happens at the application level so we receive the mcp instance
let mcpInstance: ReturnType<typeof createSpanishMcp>;

export const initMcpRoutes = (mcp: ReturnType<typeof createSpanishMcp>) => {
  mcpInstance = mcp;
  return router;
};

/**
 * MCP query endpoint
 * POST /api/mcp/query
 */
router.post(
  '/query',
  validateRequest(schemas.mcpQuery),
  catchAsync(async (req: AuthenticatedRequest, res: Response) => {
    const { query, contextType = ContextType.VOCABULARY, maxItems = 10, includeExamples = true, categories, difficultyLevel } = req.body;
    
    // Create options object with all parameters
    const options = new ContextOptions({
      contextType,
      maxItems,
      includeExamples,
      categories,
      difficultyLevel
    });
    
    // Premium tier users get priority access to larger contexts
    if (req.user?.tier === 'premium') {
      options.maxItems = Math.max(options.maxItems, 50);
    }
    
    const response = await mcpInstance.queryWithContext(query, options);
    
    // Track usage for billing/limits (placeholder for future implementation)
    // trackUsage(req.user.id, 'query', { contextType, tokensUsed: estimateTokens(response) });
    
    res.json({ 
      response,
      user: {
        tier: req.user?.tier,
        id: req.user?.id
      }
    });
  })
);

export default router;

