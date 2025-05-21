import express, { Request, Response, NextFunction } from 'express';
import { createSpanishMcp, ContextType, ContextOptions } from '../lib/mcp-module.js';
import { validateRequest, schemas } from '../middleware/validation.js';
import { requireTier, AuthenticatedRequest } from '../middleware/auth.js';
import { catchAsync, AppError } from '../middleware/error.js';

const router = express.Router();

let mcpInstance: ReturnType<typeof createSpanishMcp>;

export const initContextRoutes = (mcp: ReturnType<typeof createSpanishMcp>) => {
  mcpInstance = mcp;
  return router;
};

router.get(
  '/categories',
  catchAsync(async (req: AuthenticatedRequest, res: Response) => {
    const categories = {
      vocabulary: [
        'noun', 'verb', 'adjective', 'adverb', 'preposition',
        'conjunction', 'pronoun', 'interjection', 'article'
      ],
      grammar: [
        'verb_tense', 'verb_conjugation', 'pronouns', 'articles',
        'prepositions', 'adjectives', 'adverbs', 'sentence_structure',
        'questions', 'negation'
      ]
    };
    
    res.json({ categories });
  })
);

router.get(
  '/advanced',
  requireTier('premium'),
  catchAsync(async (req: AuthenticatedRequest, res: Response) => {
    const options = new ContextOptions({
      contextType: (req.query.type as ContextType) || 'mixed',
      maxItems: Number(req.query.maxItems) || 50,
      includeExamples: true,
      categories: req.query.categories ?
        (Array.isArray(req.query.categories) ?
          req.query.categories as string[] :
          [req.query.categories as string]) :
        undefined,
      difficultyLevel: req.query.difficultyLevel as string || undefined,
      searchTerm: req.query.searchTerm as string || undefined
    });
    
    const context = await mcpInstance.getContext(options);
    
    res.json({
      context,
      metadata: {
        length: context.length,
        tier: req.user?.tier,
        isPremium: true
      }
    });
  })
);

const validateContextRequest = (req: Request, res: Response, next: NextFunction): void => {
  const { error } = schemas.contextRequest.validate(req.query, { abortEarly: false });
  
  if (!error) {
    return next();
  }
  
  const validationErrors = error.details.map((detail: any) => ({
    field: detail.path.join('.'),
    message: detail.message
  }));
  
  res.status(400).json({
    error: 'Validation Error',
    validationErrors
  });
};

router.get(
  '/',
  validateContextRequest,
  catchAsync(async (req: AuthenticatedRequest, res: Response) => {
    const contextType = req.query.type as string || 'vocabulary';
    
    let maxItems = Number(req.query.maxItems) || 10;
    if (req.user?.tier === 'free' && maxItems > 5) {
      maxItems = 5;
    } else if (req.user?.tier === 'basic' && maxItems > 20) {
      maxItems = 20;
    }
    
    const options = new ContextOptions({
      contextType: contextType as ContextType,
      maxItems,
      includeExamples: req.query.includeExamples !== 'false',
      categories: req.query.categories ? 
        (Array.isArray(req.query.categories) ? 
          req.query.categories as string[] : 
          [req.query.categories as string]) : 
        undefined,
      difficultyLevel: req.query.difficultyLevel as string || undefined,
      searchTerm: req.query.searchTerm as string || undefined
    });
    
    const context = await mcpInstance.getContext(options);
    
    res.json({ 
      context,
      metadata: {
        length: context.length,
        tier: req.user?.tier,
        maxAllowed: req.user?.tier === 'premium' ? 50 : (req.user?.tier === 'basic' ? 20 : 5)
      }
    });
  })
);

export default router;

