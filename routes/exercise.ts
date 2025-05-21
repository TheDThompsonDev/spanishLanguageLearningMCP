
/**
 * Exercise generation routes for the Spanish Learning MCP Server
 * 
 * These routes provide exercise generation functionality with tiered access control.
 * Premium users get all exercise types, basic users get intermediate exercises,
 * and free users get only basic exercise types.
 */
import express, { Request, Response, NextFunction } from 'express';
import { createSpanishMcp, ContextType, ContextOptions, AccessTier } from '../lib/mcp-module.js';
import { validateRequest, schemas } from '../middleware/validation.js';
import { requireTier, AuthenticatedRequest } from '../middleware/auth.js';
import { catchAsync, AppError } from '../middleware/error.js';
import Joi from 'joi';
import pino from 'pino';

const router = express.Router();

/**
 * Helper function to generate fake "correct" answers for the simulation
 * This function creates a plausible "correct" answer based on the user's answer type
 * for demonstration purposes when we don't have real correct answers stored.
 * 
 * @param userAnswer - The user's answer that needs a fake correction (can be any data type)
 * @returns A modified version of the user's answer to simulate a correct answer
 * @throws Error if unable to generate a fake answer for the provided data type
 */
function generateFakeCorrectAnswer(userAnswer: any): any {
  try {
    // For strings
    if (typeof userAnswer === 'string') {
      // Generate a variation of the string if it's short enough
      if (userAnswer.length < 10) {
        return userAnswer.length > 0 ? 
          userAnswer[0].toUpperCase() + userAnswer.slice(1) + 's' : 
          'correctAnswer';
      }
      // Return a modified version for longer strings
      return userAnswer + ' (corrected)';
    }
    
    // For arrays
    if (Array.isArray(userAnswer)) {
      if (userAnswer.length === 0) {
        return ['correctItem1', 'correctItem2'];
      }
      // Add an extra item to the array to make it "correct"
      return [...userAnswer, 'correctItem'];
    }
    
    // For numbers
    if (typeof userAnswer === 'number') {
      // Simple modification to make it "correct"
      return userAnswer + 1;
    }
    
    // For objects
    if (typeof userAnswer === 'object' && userAnswer !== null && !Array.isArray(userAnswer)) {
      return {
        ...userAnswer,
        correct: true
      };
    }
    
    // For booleans
    if (typeof userAnswer === 'boolean') {
      return true; // The correct answer is always true :)
    }
    
    // For null or undefined
    if (userAnswer === null || userAnswer === undefined) {
      return 'correctAnswer';
    }
    
    // Default fallback
    return userAnswer;
  } catch (error) {
    logger.error({ error, userAnswer }, 'Error generating fake correct answer');
    // Return a safe default if anything goes wrong
    return typeof userAnswer === 'string' ? 'correctAnswer' : 
           Array.isArray(userAnswer) ? ['correctItem'] : 
           typeof userAnswer === 'number' ? 42 : 
           'correctAnswer';
  }
}

// Set up logger
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  name: 'exercise-routes'
});

// Initialization happens at the application level so we receive the mcp instance
let mcpInstance: ReturnType<typeof createSpanishMcp>;

export const initExerciseRoutes = (mcp: ReturnType<typeof createSpanishMcp>) => {
  mcpInstance = mcp;
  return router;
};

// Extended schemas for exercise-specific validation
const exerciseSchemas = {
  generateExercise: Joi.object({
    type: Joi.string().valid(
      'vocabulary_matching', 
      'fill_in_blank', 
      'multiple_choice',
      'sentence_construction',
      'translation',
      'conversation_practice',
      'error_correction',
      'listening_comprehension'
    ).required(),
    difficultyLevel: Joi.string().valid('beginner', 'intermediate', 'advanced').default('intermediate'),
    focusArea: Joi.string().max(100),
    count: Joi.number().integer().min(1).max(10).default(5),
    specificVocabulary: Joi.array().items(Joi.string()).max(10),
    specificGrammar: Joi.array().items(Joi.string()).max(5),
    timeLimit: Joi.number().integer().min(0).max(3600) // in seconds, 0 means no limit
  }),
  
  checkExercise: Joi.object({
    exerciseId: Joi.string().required(),
    answers: Joi.array().items(
      Joi.object({
        id: Joi.string().required(),
        answer: Joi.alternatives().try(
          Joi.string(),
          Joi.number(),
          Joi.array().items(Joi.string())
        ).required()
      })
    ).required(),
    timeTaken: Joi.number().integer().min(0) // in seconds
  })
};

/**
 * List available exercise types
 * GET /api/exercise/types
 * 
 * Available to all authenticated users
 */
router.get(
  '/types',
  catchAsync(async (req: AuthenticatedRequest, res: Response) => {
    // Basic exercise types available to all users
    const baseExerciseTypes = [
      {
        id: 'vocabulary_matching',
        name: 'Vocabulary Matching',
        description: 'Match Spanish words with their English translations',
        availableTiers: ['free', 'basic', 'premium']
      },
      {
        id: 'multiple_choice',
        name: 'Multiple Choice',
        description: 'Select the correct answer from multiple options',
        availableTiers: ['free', 'basic', 'premium']
      }
    ];
    
    // Advanced exercise types for higher tiers
    const advancedExerciseTypes = [
      {
        id: 'fill_in_blank',
        name: 'Fill in the Blank',
        description: 'Complete sentences by filling in missing words',
        availableTiers: ['basic', 'premium']
      },
      {
        id: 'sentence_construction',
        name: 'Sentence Construction',
        description: 'Build correct Spanish sentences from given words',
        availableTiers: ['basic', 'premium']
      }
    ];
    
    // Premium-only exercise types
    const premiumExerciseTypes = [
      {
        id: 'translation',
        name: 'Translation Exercise',
        description: 'Translate full sentences between Spanish and English',
        availableTiers: ['premium']
      },
      {
        id: 'conversation_practice',
        name: 'Conversation Practice',
        description: 'Practice realistic conversations with feedback',
        availableTiers: ['premium']
      },
      {
        id: 'error_correction',
        name: 'Error Correction',
        description: 'Find and correct errors in Spanish text',
        availableTiers: ['premium']
      },
      {
        id: 'listening_comprehension',
        name: 'Listening Comprehension',
        description: 'Answer questions based on Spanish audio passages',
        availableTiers: ['premium']
      }
    ];
    
    // Return only the exercise types available to the user's tier
    let availableTypes = [...baseExerciseTypes];
    
    if (req.user?.tier === 'basic' || req.user?.tier === 'premium') {
      availableTypes = [...availableTypes, ...advancedExerciseTypes];
    }
    
    if (req.user?.tier === 'premium') {
      availableTypes = [...availableTypes, ...premiumExerciseTypes];
    }
    
    res.json({
      exerciseTypes: availableTypes,
      tier: req.user?.tier
    });
  })
);

/**
 * Generate an exercise
 * POST /api/exercise/generate
 * 
 * Premium users get access to all exercise types
 * Basic users get limited exercise types
 * Free users get only the most basic exercise types
 */
router.post(
  '/generate',
  validateRequest(exerciseSchemas.generateExercise),
  catchAsync(async (req: AuthenticatedRequest, res: Response) => {
    const { 
      type,
      difficultyLevel = 'intermediate',
      focusArea,
      count = 5,
      specificVocabulary,
      specificGrammar,
      timeLimit
    } = req.body;
    
    // Check if this exercise type is available for the user's tier
    const tierExerciseTypes = {
      'free': ['vocabulary_matching', 'multiple_choice'],
      'basic': ['vocabulary_matching', 'multiple_choice', 'fill_in_blank', 'sentence_construction'],
      'premium': [
        'vocabulary_matching', 'multiple_choice', 'fill_in_blank', 'sentence_construction',
        'translation', 'conversation_practice', 'error_correction', 'listening_comprehension'
      ]
    };
    
    const userTier = req.user?.tier || 'free';
    
    if (!tierExerciseTypes[userTier].includes(type)) {
      throw new AppError(`The exercise type "${type}" is not available for your ${userTier} subscription tier`, 403);
    }
    
    // Apply tier limits to exercise count
    const tierCountLimits = {
      'free': 3,
      'basic': 5,
      'premium': 10
    };
    
    const maxCount = Math.min(count, tierCountLimits[userTier]);
    
    // Create context options for exercises
    const options = new ContextOptions({
      contextType: ContextType.EXERCISE,
      maxItems: maxCount,
      includeExamples: true,
      accessTier: userTier === 'premium' 
        ? AccessTier.PREMIUM 
        : userTier === 'basic' 
          ? AccessTier.BASIC 
          : AccessTier.FREE,
      userId: req.user?.id,
      categories: focusArea ? [focusArea] : [],
      difficultyLevel: difficultyLevel,
      includeExercises: true
    });
    
    try {
      // Get relevant context for exercise generation
      const context = await mcpInstance.getContext(options);
      
      // Use the context to generate exercises
      // For a real implementation, we'd extend the MCP module with a dedicated method
      const prompt = `
Generate ${maxCount} Spanish language exercises of type "${type}" with difficulty "${difficultyLevel}"${
  focusArea ? ` focusing on "${focusArea}"` : ''
}. 

Each exercise should have:
1. A unique ID
2. A clear instruction
3. The exercise content
4. The correct answer(s)
5. Explanation for the answer

${specificVocabulary && specificVocabulary.length > 0 
  ? `Include these specific vocabulary words: ${specificVocabulary.join(', ')}` 
  : ''}
${specificGrammar && specificGrammar.length > 0 
  ? `Include these specific grammar concepts: ${specificGrammar.join(', ')}` 
  : ''}

Format the response as a valid JSON object with an array of exercises.
`;
      
      // In a real implementation, we would use a specialized method in the MCP
      // For now, we'll use the standard query method
      const exerciseResponse = await mcpInstance.queryWithContext(prompt, options);
      
      // Parse the result (assuming it returns valid JSON)
      try {
        // Find JSON in the response - this is a simplistic approach
        const jsonMatch = exerciseResponse.match(/```json\n([\s\S]*?)```/) || 
                          exerciseResponse.match(/\{[\s\S]*\}/);
        
        const jsonContent = jsonMatch ? jsonMatch[1] || jsonMatch[0] : exerciseResponse;
        const exercises = JSON.parse(jsonContent);
        
        // Add a server-generated exercise ID for the entire set
        const exerciseSetId = `ex_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // In a production environment, we would store the exercises and answers in a database
        // This would allow us to validate user answers later
        
        res.json({
          exerciseSetId,
          exercises: exercises.exercises || exercises,
          metadata: {
            type,
            difficultyLevel,
            count: maxCount,
            timeLimit,
            tier: userTier
          }
        });
      } catch (error) {
        logger.error({ error, exerciseResponse }, 'Failed to parse exercise response');
        throw new AppError('Failed to generate exercises. The server returned an invalid format.', 500);
      }
    } catch (error) {
      logger.error({ error }, 'Error generating exercises');
      throw new AppError('Failed to generate exercises. Please try again later.', 500);
    }
  })
);

/**
 * Check exercise answers
 * POST /api/exercise/check
 * 
 * Available to all authenticated users
 */
router.post(
  '/check',
  validateRequest(exerciseSchemas.checkExercise),
  catchAsync(async (req: AuthenticatedRequest, res: Response) => {
    const { exerciseId, answers, timeTaken } = req.body;
    
    // In a real implementation, we would:
    // 1. Retrieve the exercise set from a database using exerciseId
    // 2. Compare the provided answers with the correct answers
    // 3. Calculate scores and provide feedback
    
    // For this demonstration, we'll simulate checking answers
    // We'll pretend 80% of answers are correct with random feedback
    
    const results = answers.map(answer => {
      // Simulate checking - in reality, this would compare with stored correct answers
      const isCorrect = Math.random() > 0.2; // 80% chance of being correct
      
      return {
        id: answer.id,
        isCorrect,
        correctAnswer: isCorrect ? answer.answer : generateFakeCorrectAnswer(answer.answer),
        feedback: isCorrect 
          ? '¡Correcto! Well done.' 
          : `Incorrect. The correct answer is shown above.`
      };
    });
    
    // Calculate overall score
    const score = {
      correct: results.filter(r => r.isCorrect).length,
      total: results.length,
      percentage: Math.round((results.filter(r => r.isCorrect).length / results.length) * 100)
    };
    
    // Premium users get more detailed feedback
    const detailedFeedback = req.user?.tier === 'premium' ? {
      strengths: 'You seem to be strong with vocabulary related to daily activities.',
      weaknesses: 'You might want to review verb conjugations in the past tense.',
      recommendedFocus: 'Practice with irregular verbs would be beneficial.',
      nextExerciseRecommendation: {
        type: 'verb_conjugation',
        difficulty: 'intermediate',
        focus: 'past_tense'
      }
    } : undefined;
    
    // Track user progress (would be stored in a database in production)
    // In a real implementation, we would:
    // trackExerciseResults(req.user.id, exerciseId, score, timeTaken);
    
    res.json({
      exerciseId,
      results,
      score,
      timeTaken,
      completed: true,
      detailedFeedback,
      tier: req.user?.tier
    });
  })
);

/**
 * Get user's exercise history
 * GET /api/exercise/history
 * 
 * Basic and Premium tiers only
 */
router.get(
  '/history',
  requireTier('basic'),
  catchAsync(async (req: AuthenticatedRequest, res: Response) => {
    // In a real implementation, we would retrieve the user's exercise history from a database
    // For this demonstration, we'll return mock data
    
    // Premium users get more detailed history
    const history = req.user?.tier === 'premium' 
      ? [
          {
            id: 'ex_1620000000_abc123',
            date: '2025-05-10T10:00:00Z',
            type: 'multiple_choice',
            difficultyLevel: 'intermediate',
            score: { correct: 8, total: 10, percentage: 80 },
            focusArea: 'verb_conjugation',
            timeTaken: 120, // seconds
            performance: {
              accuracy: 'good',
              speed: 'average',
              improvement: '+5% from last attempt'
            }
          },
          {
            id: 'ex_1620100000_def456',
            date: '2025-05-09T14:30:00Z',
            type: 'fill_in_blank',
            difficultyLevel: 'intermediate',
            score: { correct: 7, total: 10, percentage: 70 },
            focusArea: 'prepositions',
            timeTaken: 180,
            performance: {
              accuracy: 'average',
              speed: 'slow',
              improvement: '+10% from last attempt'
            }
          }
        ]
      : [
          {
            id: 'ex_1620000000_abc123',
            date: '2025-05-10T10:00:00Z',
            type: 'multiple_choice',
            score: { correct: 8, total: 10, percentage: 80 }
          },
          {
            id: 'ex_1620100000_def456',
            date: '2025-05-09T14:30:00Z',
            type: 'fill_in_blank',
            score: { correct: 7, total: 10, percentage: 70 }
          }
        ];
    
    // Generate summary based on user tier
    const summary = req.user?.tier === 'premium' 
      ? {
          totalExercises: 27,
          averageScore: 76,
          lastWeekProgress: '+12%',
          strongestAreas: ['vocabulary', 'present tense'],
          weakestAreas: ['past tense', 'subjunctive'],
          completedExerciseTypes: {
            'multiple_choice': 12,
            'fill_in_blank': 8,
            'translation': 5,
            'error_correction': 2
          },
          streakDays: 5
        }
      : {
          totalExercises: 14,
          averageScore: 72,
          completedExerciseTypes: {
            'multiple_choice': 9,
            'fill_in_blank': 5
          }
        };
    
    res.json({
      history,
      summary,
      tier: req.user?.tier
    });
  })
);

export default router;

