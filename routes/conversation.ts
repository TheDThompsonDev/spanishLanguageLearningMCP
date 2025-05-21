/**
 * Conversation practice routes for the Spanish Learning MCP Server
 * 
 * These routes provide conversation-based language practice with tiered access control.
 * Premium users get all features, while basic users get limited functionality.
 * Free users have very basic access to conversation practice.
 */
import express, { Request, Response, NextFunction } from 'express';
import { createSpanishMcp, ContextType, ContextOptions, AccessTier } from '../lib/mcp-module.js';
import { validateRequest, schemas } from '../middleware/validation.js';
import { requireTier, AuthenticatedRequest } from '../middleware/auth.js';
import { catchAsync, AppError } from '../middleware/error.js';
import Joi from 'joi';
import pino from 'pino';

const router = express.Router();

// Set up logger
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  name: 'conversation-routes'
});

// Initialization happens at the application level so we receive the mcp instance
let mcpInstance: ReturnType<typeof createSpanishMcp>;

export const initConversationRoutes = (mcp: ReturnType<typeof createSpanishMcp>) => {
  mcpInstance = mcp;
  return router;
};

// Extended schemas for conversation-specific validation
const conversationSchemas = {
  // Schema for starting a new conversation
  startConversation: Joi.object({
    topic: Joi.string().required().min(2).max(100),
    difficultyLevel: Joi.string().valid('beginner', 'intermediate', 'advanced').default('intermediate'),
    participantCount: Joi.number().integer().min(1).max(3).default(2),
    includeSlang: Joi.boolean().default(false),
    focusAreas: Joi.array().items(Joi.string()).max(3),
    contextSize: Joi.number().integer().min(1).max(50).default(10)
  }),
  
  // Schema for continuing an existing conversation
  continueConversation: Joi.object({
    conversationId: Joi.string().required(),
    userMessage: Joi.string().required().min(1).max(500),
    includeCorrections: Joi.boolean().default(true),
    includeAlternatives: Joi.boolean().default(true)
  }),
  
  // Schema for retrieving conversation history
  getConversationHistory: Joi.object({
    limit: Joi.number().integer().min(1).max(50).default(10),
    offset: Joi.number().integer().min(0).default(0),
    includeContent: Joi.boolean().default(true),
    filterByTopic: Joi.string()
  })
};

// In-memory storage for conversations
// In a real implementation, this would be a database
const conversationStore = new Map();

// Export store for testing
export const getConversationStore = (): Map<string, any> => conversationStore;

// Mock date for testing time-based cleanup
let mockNow: number | null = null;
export const setMockDate = (date: Date | number | null): void => {
  mockNow = date ? (typeof date === 'number' ? date : date.getTime()) : null;
};

/**
 * Get available conversation topics
 * GET /api/conversation/topics
 * 
 * @description Retrieves a list of available conversation topics organized by difficulty level.
 * The topics returned are filtered based on the user's subscription tier.
 * 
 * @returns {Object} Response object
 * @returns {Object} response.topics - Topics organized by difficulty level
 * @returns {Array} response.topics.beginner - Beginner-level topics (available to all tiers)
 * @returns {Array} response.topics.intermediate - Intermediate topics (basic and premium only)
 * @returns {Array} response.topics.advanced - Advanced topics (premium only)
 * @returns {string} response.tier - The user's current subscription tier
 * 
 * @tier
 * - Free: Only beginner topics
 * - Basic: Beginner and intermediate topics
 * - Premium: All topics (beginner, intermediate, advanced)
 */
router.get(
  '/topics',
  catchAsync(async (req: AuthenticatedRequest, res: Response) => {
    // These would typically come from a database in production
    const topics = {
      beginner: [
        { id: 'meeting_new_people', name: 'Meeting New People', example: '¡Hola! ¿Cómo te llamas?' },
        { id: 'ordering_food', name: 'Ordering Food', example: 'Quisiera un café, por favor.' },
        { id: 'basic_directions', name: 'Getting Directions', example: '¿Dónde está la biblioteca?' },
        { id: 'shopping_basics', name: 'Shopping Basics', example: '¿Cuánto cuesta esto?' },
        { id: 'talking_about_family', name: 'Talking About Family', example: 'Tengo dos hermanos.' }
      ],
      intermediate: [
        { id: 'making_plans', name: 'Making Plans', example: '¿Quieres ir al cine este fin de semana?' },
        { id: 'discussing_hobbies', name: 'Discussing Hobbies', example: 'Me gusta jugar al fútbol.' },
        { id: 'at_the_doctor', name: 'At the Doctor', example: 'No me siento bien hoy.' },
        { id: 'renting_an_apartment', name: 'Renting an Apartment', example: '¿Cuánto es el alquiler mensual?' },
        { id: 'describing_your_day', name: 'Describing Your Day', example: 'Hoy tuve un día muy ocupado.' }
      ],
      advanced: [
        { id: 'discussing_current_events', name: 'Current Events', example: '¿Qué opinas sobre las recientes elecciones?' },
        { id: 'environmental_issues', name: 'Environmental Issues', example: 'El cambio climático es un problema grave.' },
        { id: 'cultural_differences', name: 'Cultural Differences', example: 'En mi país las costumbres son diferentes.' },
        { id: 'technology_and_innovation', name: 'Technology & Innovation', example: 'La inteligencia artificial está cambiando nuestra sociedad.' },
        { id: 'career_development', name: 'Career Development', example: 'Quiero mejorar mis habilidades profesionales.' }
      ]
    };
    
    // Basic and free users have limited topic access
    if (req.user?.tier === 'free') {
      // Free users only get beginner topics
      res.json({ 
        topics: { beginner: topics.beginner },
        tier: req.user.tier
      });
    } else if (req.user?.tier === 'basic') {
      // Basic users get beginner and intermediate topics
      res.json({ 
        topics: { 
          beginner: topics.beginner,
          intermediate: topics.intermediate
        },
        tier: req.user.tier
      });
    } else {
      // Premium users get all topics
      res.json({ 
        topics,
        tier: req.user?.tier
      });
    }
  })
);

/**
 * Start a new conversation
 * POST /api/conversation/start
 * 
 * @description Initiates a new Spanish conversation based on the specified topic and parameters.
 * The conversation difficulty, content, and features are limited based on the user's subscription tier.
 * 
 * @param {Object} req.body - The request body
 * @param {string} req.body.topic - The conversation topic
 * @param {string} [req.body.difficultyLevel='intermediate'] - Difficulty level ('beginner', 'intermediate', 'advanced')
 * @param {number} [req.body.participantCount=2] - Number of conversation participants (1-3)
 * @param {boolean} [req.body.includeSlang=false] - Whether to include Spanish slang (premium only)
 * @param {string[]} [req.body.focusAreas=[]] - Specific language aspects to focus on
 * @param {number} [req.body.contextSize=10] - Amount of context to include
 * 
 * @returns {Object} Response object
 * @returns {string} response.conversationId - Unique ID for the conversation
 * @returns {Object} response.conversation - Initial conversation data
 * @returns {Object} response.metadata - Metadata including tier-specific limitations
 * 
 * @throws {403} If user tier doesn't permit the requested difficulty level
 * @throws {500} If conversation generation fails
 * 
 * @tier
 * - Free: Limited to beginner difficulty, 1 participant, 5 context items
 * - Basic: Limited to beginner/intermediate, 2 participants, 20 context items
 * - Premium: All difficulties, up to 3 participants, 50 context items, slang support
 */
router.post(
  '/start',
  validateRequest(conversationSchemas.startConversation),
  catchAsync(async (req: AuthenticatedRequest, res: Response) => {
    const { 
      topic,
      difficultyLevel = 'intermediate',
      participantCount = 2,
      includeSlang = false,
      focusAreas = [],
      contextSize = 10
    } = req.body;
    
    // Check tier limitations
    const userTier = req.user?.tier || 'free';
    
    // Free users can only start beginner conversations
    if (userTier === 'free' && difficultyLevel !== 'beginner') {
      throw new AppError('Free tier users can only access beginner-level conversations', 403);
    }
    
    // Basic users can only start beginner and intermediate conversations
    if (userTier === 'basic' && difficultyLevel === 'advanced') {
      throw new AppError('Basic tier users can only access beginner and intermediate-level conversations', 403);
    }
    
    // Limit participants based on tier
    const maxParticipants = {
      'free': 1, 
      'basic': 2, 
      'premium': 3
    };
    
    const actualParticipants = Math.min(participantCount, maxParticipants[userTier]);
    
    // Apply tier limits to context size
    const maxContextSize = {
      'free': 5,
      'basic': 20,
      'premium': 50
    };
    
    const actualContextSize = Math.min(contextSize, maxContextSize[userTier]);
    
    // Create context options for conversation
    const options = new ContextOptions({
      contextType: ContextType.CONVERSATION,
      maxItems: actualContextSize,
      includeExamples: true,
      accessTier: userTier === 'premium' 
        ? AccessTier.PREMIUM 
        : userTier === 'basic' 
          ? AccessTier.BASIC 
          : AccessTier.FREE,
      userId: req.user?.id,
      categories: focusAreas,
      difficultyLevel: difficultyLevel
    });
    
    try {
      // Generate the conversation context
      const context = await mcpInstance.getContext(options);
      
      // Generate the initial conversation prompt
      const prompt = `
You are having a Spanish conversation ${actualParticipants > 1 ? 'with multiple people' : ''} about "${topic}" at a ${difficultyLevel} level.
${includeSlang && userTier === 'premium' ? 'Include some common Spanish slang and colloquial expressions.' : ''}
${focusAreas.length > 0 ? `Try to incorporate these language aspects: ${focusAreas.join(', ')}.` : ''}

Start the conversation with a greeting and a question or statement about the topic.
If there are multiple participants, include their contributions too.

Return only the conversation itself, making it natural and educational.
`;
      
      // Get the initial conversation from the MCP
      const initialConversation = await mcpInstance.queryWithContext(prompt, options);
      
      // Generate a conversation ID
      const conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Store the conversation (in a real app, this would go to a database)
      conversationStore.set(conversationId, {
        id: conversationId,
        topic,
        difficultyLevel,
        participantCount: actualParticipants,
        includeSlang,
        focusAreas,
        userId: req.user?.id,
        createdAt: new Date(),
        messages: [
          {
            role: 'system',
            content: initialConversation,
            timestamp: new Date()
          }
        ],
        context
      });
      
      // Return the conversation to the client
      res.json({
        conversationId,
        conversation: {
          topic,
          difficultyLevel,
          initialMessage: initialConversation,
          participantCount: actualParticipants
        },
        metadata: {
          tier: userTier,
          focusAreas,
          includeSlang,
          maxContextSize: actualContextSize
        }
      });
    } catch (error) {
      logger.error({ error }, 'Error starting conversation');
      throw new AppError('Failed to start conversation. Please try again later.', 500);
    }
  })
);

/**
 * Continue an existing conversation
 * POST /api/conversation/continue
 * 
 * @description Continues an existing conversation by adding the user's message and
 * generating an appropriate response. Response quality and features vary by subscription tier.
 * 
 * @param {Object} req.body - The request body
 * @param {string} req.body.conversationId - The ID of the conversation to continue
 * @param {string} req.body.userMessage - The user's message to add to the conversation
 * @param {boolean} [req.body.includeCorrections=true] - Whether to include grammar corrections
 * @param {boolean} [req.body.includeAlternatives=true] - Whether to suggest alternative phrasings (premium only)
 * 
 * @returns {Object} Response object
 * @returns {string} response.conversationId - ID of the conversation
 * @returns {string} response.message - The system's response message
 * @returns {number} response.messageCount - Total number of messages in the conversation
 * @returns {Object} response.metadata - Metadata including tier-specific features
 * 
 * @throws {404} If the conversation is not found
 * @throws {403} If the user doesn't own the conversation
 * @throws {500} If conversation continuation fails
 * 
 * @tier
 * - Free: Basic responses, minimal context (2 messages)
 * - Basic: Includes grammar corrections, more context (5 messages)
 * - Premium: Full corrections, alternative phrasings, maximum context (10 messages)
 */
router.post(
  '/continue',
  validateRequest(conversationSchemas.continueConversation),
  catchAsync(async (req: AuthenticatedRequest, res: Response) => {
    const { 
      conversationId, 
      userMessage,
      includeCorrections = true,
      includeAlternatives = true
    } = req.body;
    
    // Check if conversation exists
    if (!conversationStore.has(conversationId)) {
      throw new AppError('Conversation not found', 404);
    }
    
    // Get the conversation from store
    const conversation = conversationStore.get(conversationId);
    
    // Check ownership
    if (conversation.userId !== req.user?.id) {
      throw new AppError('You do not have access to this conversation', 403);
    }
    
    // Add user message to conversation history
    conversation.messages.push({
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    });
    
    // Prepare prompt for continuation based on tier
    const userTier = req.user?.tier || 'free';
    
    let promptExtras = '';
    
    // Premium users get extra features
    if (userTier === 'premium') {
      if (includeCorrections) {
        promptExtras += 'If there are any grammar or vocabulary errors in my message, gently correct them. ';
      }
      
      if (includeAlternatives) {
        promptExtras += 'Suggest alternative ways I could have expressed the same idea. ';
      }
    } else if (userTier === 'basic' && includeCorrections) {
      // Basic users only get corrections
      promptExtras += 'If there are any major grammar errors in my message, briefly correct them. ';
    }
    
    // Create the context
    const options = new ContextOptions({
      contextType: ContextType.CONVERSATION,
      maxItems: userTier === 'premium' ? 20 : userTier === 'basic' ? 10 : 5,
      includeExamples: true,
      accessTier: userTier === 'premium' 
        ? AccessTier.PREMIUM 
        : userTier === 'basic' 
          ? AccessTier.BASIC 
          : AccessTier.FREE,
      userId: req.user?.id,
      categories: conversation.focusAreas,
      difficultyLevel: conversation.difficultyLevel
    });
    
    // Get the last few messages for context (limit based on tier)
    const maxHistoryMessages = {
      'free': 2,
      'basic': 5,
      'premium': 10
    };
    
    const messageHistory = conversation.messages
      .slice(-maxHistoryMessages[userTier])
      .map(msg => `${msg.role === 'user' ? 'User' : 'System'}: ${msg.content}`)
      .join('\n\n');
    
    try {
      // Generate the prompt for continuation
      const prompt = `
Continue this Spanish conversation about "${conversation.topic}" at a ${conversation.difficultyLevel} level.

Previous Messages:
${messageHistory}

Respond to the user's last message in a natural way. ${promptExtras}
${conversation.includeSlang ? 'Include some common Spanish slang or colloquial expressions if appropriate. ' : ''}
${conversation.focusAreas.length > 0 ? `Try to incorporate these language aspects: ${conversation.focusAreas.join(', ')}. ` : ''}

Return only the conversation continuation.
`;
      
      // Get response from MCP
      const responseMessage = await mcpInstance.queryWithContext(prompt, options);
      
      // Add system response to conversation history
      conversation.messages.push({
        role: 'system',
        content: responseMessage,
        timestamp: new Date()
      });
      
      // Update conversation in store
      conversationStore.set(conversationId, conversation);
      
      // Return the response
      res.json({
        conversationId,
        message: responseMessage,
        messageCount: conversation.messages.length,
        metadata: {
          tier: userTier,
          includeCorrections,
          includeAlternatives: userTier === 'premium' && includeAlternatives
        }
      });
    } catch (error) {
      logger.error({ error }, 'Error continuing conversation');
      throw new AppError('Failed to continue conversation. Please try again later.', 500);
    }
  })
);

/**
 * Get conversation history for a specific conversation
 * GET /api/conversation/:id
 * 
 * @description Retrieves the complete history and details of a specific conversation.
 * Users can only access conversations they own.
 * 
 * @param {string} req.params.id - The ID of the conversation to retrieve
 * 
 * @returns {Object} Response object
 * @returns {Object} response.conversation - Complete conversation data
 * @returns {string} response.conversation.id - Conversation ID
 * @returns {string} response.conversation.topic - Conversation topic
 * @returns {string} response.conversation.difficultyLevel - Difficulty level
 * @returns {number} response.conversation.participantCount - Number of participants
 * @returns {boolean} response.conversation.includeSlang - Whether slang is included
 * @returns {string[]} response.conversation.focusAreas - Language focus areas
 * @returns {Date} response.conversation.createdAt - Creation timestamp
 * @returns {Array} response.conversation.messages - Complete message history
 * @returns {number} response.conversation.messageCount - Total message count
 * @returns {Object} response.metadata - Metadata including user tier
 * 
 * @throws {404} If the conversation is not found
 * @throws {403} If the user doesn't own the conversation
 * 
 * @tier
 * - Available to all tiers, but users can only access their own conversations
 */
router.get(
  '/:id',
  catchAsync(async (req: AuthenticatedRequest, res: Response) => {
    const conversationId = req.params.id;
    
    // Check if conversation exists
    if (!conversationStore.has(conversationId)) {
      throw new AppError('Conversation not found', 404);
    }
    
    // Get the conversation from store
    const conversation = conversationStore.get(conversationId);
    
    // Check ownership
    if (conversation.userId !== req.user?.id) {
      throw new AppError('You do not have access to this conversation', 403);
    }
    
    // Return the conversation history
    res.json({
      conversation: {
        id: conversation.id,
        topic: conversation.topic,
        difficultyLevel: conversation.difficultyLevel,
        participantCount: conversation.participantCount,
        includeSlang: conversation.includeSlang,
        focusAreas: conversation.focusAreas,
        createdAt: conversation.createdAt,
        messages: conversation.messages,
        messageCount: conversation.messages.length
      },
      metadata: {
        tier: req.user?.tier
      }
    });
  })
);

/**
 * Get all conversations for the current user
 * GET /api/conversation/history
 * 
 * @description Retrieves a list of all conversations owned by the current user,
 * with basic metadata and a preview of each conversation.
 * 
 * @returns {Object} Response object
 * @returns {Array} response.conversations - List of conversation summaries
 * @returns {string} response.conversations[].id - Conversation ID
 * @returns {string} response.conversations[].topic - Conversation topic
 * @returns {string} response.conversations[].difficultyLevel - Difficulty level
 * @returns {Date} response.conversations[].createdAt - Creation timestamp
 * @returns {number} response.conversations[].messageCount - Number of messages
 * @returns {string} response.conversations[].preview - Short preview of first message
 * @returns {number} response.count - Total number of conversations
 * @returns {Object} response.metadata - Metadata including user tier
 * 
 * @throws {500} If retrieving conversations fails
 * 
 * @tier
 * - Available to all tiers, but only shows conversations accessible to the user's tier
 * - Premium users may have access to more historical conversations if storage limits differ
 */
router.get(
  '/history',
  catchAsync(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.id;
    
    // Filter conversations by user ID
    const userConversations = Array.from(conversationStore.values())
      .filter(conv => conv.userId === userId)
      // Sort by creation date (newest first)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    // Return limited information for the list view
    const conversationList = userConversations.map(conv => ({
      id: conv.id,
      topic: conv.topic,
      difficultyLevel: conv.difficultyLevel,
      createdAt: conv.createdAt,
      messageCount: conv.messages.length,
      // Include just the first system message as a preview
      preview: conv.messages[0]?.content?.substring(0, 100) + '...'
    }));
    
    res.json({
      conversations: conversationList,
      count: conversationList.length,
      metadata: {
        tier: req.user?.tier
      }
    });
  })
);

/**
 * Delete a conversation
 * DELETE /api/conversation/:id
 * 
 * @description Deletes a specific conversation from the system.
 * Users can only delete conversations they own.
 * 
 * @param {string} req.params.id - The ID of the conversation to delete
 * 
 * @returns {Object} Response object
 * @returns {boolean} response.success - Whether the deletion was successful
 * @returns {string} response.message - Success message
 * 
 * @throws {404} If the conversation is not found
 * @throws {403} If the user doesn't own the conversation
 * 
 * @tier
 * - Available to all tiers, but users can only delete their own conversations
 */
router.delete(
  '/:id',
  catchAsync(async (req: AuthenticatedRequest, res: Response) => {
    const conversationId = req.params.id;
    
    // Check if conversation exists
    if (!conversationStore.has(conversationId)) {
      throw new AppError('Conversation not found', 404);
    }
    
    // Get the conversation from store
    const conversation = conversationStore.get(conversationId);
    
    // Check ownership
    if (conversation.userId !== req.user?.id) {
      throw new AppError('You do not have access to this conversation', 403);
    }
    
    // Delete the conversation
    conversationStore.delete(conversationId);
    
    res.json({
      success: true,
      message: 'Conversation deleted successfully'
    });
  })
);

/**
 * Cleanup old conversations to prevent memory leaks
 * This is called periodically in a real implementation
 * For this demo, we'll keep it simple
 * 
 * @description Removes conversations that are older than the maximum allowed age
 * to prevent memory leaks in the in-memory store. In a production environment,
 * this would be a database maintenance task.
 * 
 * @public - Exposed for testing purposes
 */
export const CONVERSATION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Periodic cleanup function to remove old conversations
 * This helps prevent memory leaks in the in-memory conversation store
 * In a production environment, this would be a database cleanup task
 * 
 * @returns The number of conversations that were cleaned up
 */
export function cleanupOldConversations(): number {
  try {
    const now = mockNow || new Date().getTime();
    let cleanupCount = 0;
    
    // Find and remove conversations older than the max age
    for (const [id, conversation] of conversationStore.entries()) {
      try {
        const createdAt = new Date(conversation.createdAt).getTime();
        const age = now - createdAt;
        
        if (age > CONVERSATION_MAX_AGE_MS) {
          conversationStore.delete(id);
          cleanupCount++;
        }
      } catch (error) {
        // Handle errors for individual conversations
        logger.error({ error, conversationId: id }, 'Error processing conversation during cleanup');
      }
    }
    
    if (cleanupCount > 0) {
      logger.info(`Cleaned up ${cleanupCount} old conversations`);
    }
    
    return cleanupCount;
  } catch (error) {
    logger.error({ error }, 'Error during conversation cleanup');
    return 0;
  }
}

// Run cleanup every hour
// We store the interval ID in a variable so we can clear it on shutdown
// This is handled in the cleanupConversationResources function

/**
 * Server shutdown cleanup handler
 * This function is exported and called when the server is shutting down
 * to ensure proper cleanup of resources
 * 
 * @description Performs cleanup operations when the server is shutting down.
 * Cancels the cleanup interval and clears the conversation store to prevent
 * memory leaks. In a production environment, it might persist conversations
 * to disk or a database before clearing them.
 * 
 * @export
 * @returns {void}
 */
export function cleanupConversationResources(): void {
  try {
    logger.info('Cleaning up conversation resources...');
    
    // Cancel the cleanup interval
    if (cleanupInterval) {
      clearInterval(cleanupInterval);
      logger.info('Cancelled cleanup interval');
    }
    
    // Log the number of conversations in memory
    const conversationCount = conversationStore.size;
    
    // In a real implementation, we might want to persist conversations to disk
    // or database before clearing them from memory
    if (conversationCount > 0) {
      logger.info(`Cleared ${conversationCount} conversations from memory`);
      conversationStore.clear();
    }
    
    logger.info('Conversation resources cleaned up successfully');
  } catch (error) {
    logger.error({ error }, 'Error cleaning up conversation resources');
  }
}

// Store the interval ID so we can clear it on shutdown
let cleanupInterval = setInterval(cleanupOldConversations, 60 * 60 * 1000);

// Export functions for testing the cleanup interval
export const getCleanupInterval = () => cleanupInterval;
export const setCleanupInterval = (interval: NodeJS.Timeout) => {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
  }
  cleanupInterval = interval;
};

export default router;

